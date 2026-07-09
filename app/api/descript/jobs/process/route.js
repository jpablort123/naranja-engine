import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { processNext, pollRunningJob } from '@/lib/descript-queue';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// ═══ POST /api/descript/jobs/process ═══
// Body: { project_id?: string, episode_id?: string }
//
// Empuja la cola de un proyecto. Se puede llamar:
//   - desde el webhook (cuando Descript termina un job)
//   - desde la UI para poll manual
//   - desde un cron externo si quisiera un heartbeat
//
// Además, para jobs que llevan mucho tiempo "running" sin recibir webhook,
// hace un poll de respaldo (SPEC §6).
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    let { project_id, episode_id } = body || {};

    if (!project_id && episode_id) {
      const { data: ep } = await db
        .from('episodes')
        .select('descript_project_id')
        .eq('id', episode_id)
        .single();
      project_id = ep?.descript_project_id;
    }

    if (!project_id) {
      // Modo "todos": procesa todos los proyectos con algo queued o running vencido.
      const { data: rows } = await db
        .from('descript_jobs')
        .select('descript_project_id')
        .in('status', ['queued', 'running']);
      const projects = [...new Set((rows || []).map(r => r.descript_project_id).filter(Boolean))];
      const results = [];
      for (const p of projects) {
        results.push(await stepProject(p));
      }
      return NextResponse.json({ processed: projects.length, results });
    }

    return NextResponse.json(await stepProject(project_id));
  } catch (e) {
    console.error('process error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET también, para poder hacer poll cómodo desde la UI o cron externo.
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const project_id = searchParams.get('project_id');
    if (!project_id) return NextResponse.json({ error: 'project_id requerido' }, { status: 400 });
    return NextResponse.json(await stepProject(project_id));
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

const STALE_MS = 3 * 60 * 1000; // 3 min sin novedad → poll de respaldo

async function stepProject(project_id) {
  // 1) Si hay uno running "viejo" sin webhook, poll de respaldo.
  const { data: running } = await db
    .from('descript_jobs')
    .select('*')
    .eq('descript_project_id', project_id)
    .eq('status', 'running')
    .order('updated_at', { ascending: true });
  const stale = (running || []).filter(r => {
    const t = new Date(r.updated_at || r.started_at || r.created_at).getTime();
    return Date.now() - t > STALE_MS;
  });
  const pollResults = [];
  for (const r of stale) {
    const state = await pollRunningJob(r);
    pollResults.push({ id: r.id, polled: state });
  }

  // 2) Empujar siguiente queued (si Descript está libre).
  const step = await processNext(project_id);
  return { project_id, running_count: (running || []).length, polled: pollResults, step };
}
