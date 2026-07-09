import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { buildUtm } from '@/lib/utm';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// biblia §15 error #15: GET no cacheable — datos cambian por fuera del request.
export const dynamic = 'force-dynamic';

// ═══ GET /api/published ═══
// Filtros opcionales: origin_id, origin_type, platform, content_type, from, to.
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    let q = db.from('published_items').select('*').order('published_at', { ascending: false, nullsFirst: false });
    const oid = searchParams.get('origin_id');
    const otype = searchParams.get('origin_type');
    const plat = searchParams.get('platform');
    const ctype = searchParams.get('content_type');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (oid) q = q.eq('origin_id', oid);
    if (otype) q = q.eq('origin_type', otype);
    if (plat) q = q.eq('platform', plat);
    if (ctype) q = q.eq('content_type', ctype);
    if (from) q = q.gte('published_at', from);
    if (to) q = q.lte('published_at', to);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ═══ POST /api/published ═══
// Crea una pieza publicada. Genera utm_campaign si tiene los datos.
export async function POST(req) {
  try {
    const body = await req.json();
    const row = { ...body };
    if (!row.utm_campaign && row.origin_label && row.content_type && row.platform) {
      row.utm_campaign = buildUtm({
        originLabel: row.origin_label,
        contentType: row.content_type,
        platform: row.platform,
      });
    }
    if (!row.published_at) row.published_at = new Date().toISOString();
    const { data, error } = await db.from('published_items').insert(row).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ═══ PATCH /api/published?id=<uuid> ═══
export async function PATCH(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    const patch = await req.json();
    patch.updated_at = new Date().toISOString();
    // Si cambian los campos que arman la UTM y no viene una explícita, la regeneramos.
    if (!patch.utm_campaign && (patch.origin_label || patch.content_type || patch.platform)) {
      const { data: cur } = await db.from('published_items').select('*').eq('id', id).single();
      const merged = { ...cur, ...patch };
      if (merged.origin_label && merged.content_type && merged.platform) {
        patch.utm_campaign = buildUtm({
          originLabel: merged.origin_label,
          contentType: merged.content_type,
          platform: merged.platform,
        });
      }
    }
    const { data, error } = await db.from('published_items').update(patch).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ═══ DELETE /api/published?id=<uuid> ═══
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    const { error } = await db.from('published_items').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
