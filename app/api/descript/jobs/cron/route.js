import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { processNext, pollRunningJob } from '@/lib/descript-queue';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// ═══ GET /api/descript/jobs/cron ═══
// Endpoint pensado para el cron de Vercel (vercel.json). Empuja TODAS las colas
// con trabajo pendiente: para cada project_id con jobs queued o running:
//   1) poll de respaldo de los running vencidos (por si el webhook se perdió),
//   2) processNext(project_id) para despachar el siguiente queued.
//
// Protección: si CRON_SECRET está seteado, exige `Authorization: Bearer <CRON_SECRET>`
// (Vercel lo manda automáticamente para el cron; útil también para llamadas manuales).
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') || '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  try {
    // Descubrir proyectos con trabajo pendiente.
    const { data: rows } = await db
      .from('descript_jobs')
      .select('descript_project_id')
      .in('status', ['queued', 'running']);
    const projects = [...new Set((rows || []).map(r => r.descript_project_id).filter(Boolean))];

    const STALE_MS = 20 * 1000;
    const results = [];
    for (const project_id of projects) {
      // 1) poll de respaldo para running viejos
      const { data: running } = await db
        .from('descript_jobs')
        .select('*')
        .eq('descript_project_id', project_id)
        .eq('status', 'running');
      const stale = (running || []).filter(r => {
        const t = new Date(r.updated_at || r.started_at || r.created_at).getTime();
        return Date.now() - t > STALE_MS;
      });
      const polled = [];
      for (const r of stale) {
        const state = await pollRunningJob(r);
        polled.push({ id: r.id, polled: state });
      }
      // 2) empujar el siguiente queued (si Descript está libre)
      const step = await processNext(project_id);
      results.push({ project_id, polled, step });
    }

    return NextResponse.json({ ok: true, projects: projects.length, results });
  } catch (e) {
    console.error('cron error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST también, para poder disparar manualmente por Bash sin cambiar de verbo.
export const POST = GET;
