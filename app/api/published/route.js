import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { buildUtm } from '@/lib/utm';
import { withProduct, withProductPayload } from '@/lib/product';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// biblia §15 error #15: GET no cacheable — datos cambian por fuera del request.
export const dynamic = 'force-dynamic';

// ═══ GET /api/published ═══
// Filtros opcionales: origin_id, origin_type, platform, content_type, from, to.
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    let q = withProduct(db.from('published_items').select('*').order('published_at', { ascending: false, nullsFirst: false }));
    const oid = searchParams.get('origin_id');
    const otype = searchParams.get('origin_type');
    const plat = searchParams.get('platform');
    const ctype = searchParams.get('content_type');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const status = searchParams.get('status');
    if (oid) q = q.eq('origin_id', oid);
    if (otype) q = q.eq('origin_type', otype);
    if (plat) q = q.eq('platform', plat);
    if (ctype) q = q.eq('content_type', ctype);
    if (status) q = q.eq('status', status);
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
// Crea una pieza en cualquier estado ('publicada' default | 'propuesta' | 'descartada').
// Genera utm_campaign si tiene los datos y respeta status/discard_reason.
// Si status='descartada', además crea un learning draft con la razón (spec §4).
export async function POST(req) {
  try {
    const body = await req.json();
    const row = { ...body };
    if (!row.status) row.status = 'publicada';
    if (!row.utm_campaign && row.origin_label && row.content_type && row.platform) {
      row.utm_campaign = buildUtm({
        originLabel: row.origin_label,
        contentType: row.content_type,
        platform: row.platform,
      });
    }
    if (!row.published_at && row.status === 'publicada') row.published_at = new Date().toISOString();
    const { data, error } = await db
      .from('published_items')
      .insert(withProductPayload(row))
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Descarte → learning (aprende del "no publicar")
    if (data.status === 'descartada' && data.discard_reason) {
      await createLearningForDiscard(data).catch(err => console.error('learning descarte:', err));
    }

    return NextResponse.json({ item: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function createLearningForDiscard(item) {
  const learn = {
    episode_id: item.origin_type === 'episode' ? item.origin_id : null,
    newsletter_id: item.origin_type === 'newsletter' ? item.origin_id : null,
    section: 'descarte',
    original_content: item.title,
    feedback: item.discard_reason,
    proposed_change: null,
    target_protocol_name: 'general',
    status: 'draft',
  };
  await db.from('learnings').insert(learn);
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
    // Si el PATCH la deja como descartada con razón, generamos learning.
    if (data.status === 'descartada' && data.discard_reason) {
      await createLearningForDiscard(data).catch(err => console.error('learning descarte:', err));
    }
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
