import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// ═══ POST /api/descript/jobs/cancel ═══
// Body: { episode_id } o { project_id }
//
// Marca como 'cancelled' todos los descript_jobs en estado 'queued' para ese
// episodio/proyecto. NO toca los 'running' (ya están en Descript y cortar allá
// es otra rutina), ni los 'done', ni los 'error'.
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { episode_id, project_id } = body || {};
    if (!episode_id && !project_id) {
      return NextResponse.json({ error: 'episode_id o project_id requerido' }, { status: 400 });
    }

    let q = db.from('descript_jobs')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('status', 'queued');
    if (episode_id) q = q.eq('episode_id', episode_id);
    if (project_id) q = q.eq('descript_project_id', project_id);

    const { data, error } = await q.select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ cancelled: data?.length || 0, jobs: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
