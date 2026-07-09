import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const dynamic = 'force-dynamic';

// GET /api/subscribers?status=
// Devuelve la lista + resumen (foco: conteo y crecimiento — NO habla de target).
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    let q = db.from('subscribers').select('*').order('subscribed_at', { ascending: false, nullsFirst: false });
    const status = searchParams.get('status');
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const d14 = new Date(now.getTime() - 14 * 24 * 3600 * 1000);
    const todayStr = now.toISOString().slice(0, 10);
    const total = (data || []).length;
    const nuevos_7d = (data || []).filter(s => s.subscribed_at && new Date(s.subscribed_at) >= d7).length;
    const prev_7d = (data || []).filter(s => s.subscribed_at && new Date(s.subscribed_at) >= d14 && new Date(s.subscribed_at) < d7).length;
    const nuevos_hoy = (data || []).filter(s => (s.subscribed_at || '').slice(0, 10) === todayStr).length;
    const crecimiento_pct = prev_7d > 0 ? Math.round(((nuevos_7d - prev_7d) / prev_7d) * 100) : (nuevos_7d > 0 ? 100 : 0);

    return NextResponse.json({
      subscribers: data || [],
      summary: { total, nuevos_7d, nuevos_hoy, prev_7d, crecimiento_pct },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/subscribers?id=<uuid>
// Actualiza cargo/empresa/is_target/status/notes (todos manuales, latentes en UI).
export async function PATCH(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    const patch = await req.json();
    const allowed = ['cargo', 'empresa', 'is_target', 'status', 'notes', 'source_platform', 'attributed_item_id'];
    const clean = {};
    allowed.forEach(k => { if (k in patch) clean[k] = patch[k]; });
    clean.updated_at = new Date().toISOString();
    const { data, error } = await db.from('subscribers').update(clean).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ subscriber: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
