import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// GET /api/descript/jobs?episode_id=<uuid>
// Devuelve todos los jobs de un episodio para pintar la UI de la cola.
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const episode_id = searchParams.get('episode_id');
    if (!episode_id) return NextResponse.json({ error: 'episode_id requerido' }, { status: 400 });

    const { data, error } = await db
      .from('descript_jobs')
      .select('*')
      .eq('episode_id', episode_id)
      .order('created_at', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Resumen para la UI
    const summary = { queued: 0, running: 0, done: 0, error: 0 };
    (data || []).forEach(r => { summary[r.status] = (summary[r.status] || 0) + 1; });

    return NextResponse.json({ jobs: data || [], summary });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
