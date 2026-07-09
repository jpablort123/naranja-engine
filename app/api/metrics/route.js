import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const dynamic = 'force-dynamic';

// GET /api/metrics?published_item_id=<uuid>
// Devuelve el snapshot más reciente por tipo de métrica (usa vista latest_metrics).
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('published_item_id');
    if (!id) return NextResponse.json({ error: 'published_item_id requerido' }, { status: 400 });
    const { data, error } = await db
      .from('latest_metrics')
      .select('*')
      .eq('published_item_id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const byMetric = {};
    (data || []).forEach(m => { byMetric[m.metric] = m.value; });
    return NextResponse.json({ metrics: data || [], byMetric });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
