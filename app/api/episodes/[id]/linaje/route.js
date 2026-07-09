import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const dynamic = 'force-dynamic';

// ═══ GET /api/episodes/[id]/linaje ═══
// Árbol madre → piezas → resultado (spec §5.5).
export async function GET(_req, { params }) {
  try {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

    const [{ data: ep }, { data: piezas = [] }, { data: metrics = [] }, { data: subs = [] }] = await Promise.all([
      db.from('episodes').select('id, name').eq('id', id).single(),
      db.from('published_items').select('*').eq('origin_type', 'episode').eq('origin_id', id),
      db.from('latest_metrics').select('*'),
      db.from('subscribers').select('id, email, attributed_item_id'),
    ]);
    if (!ep) return NextResponse.json({ error: 'episodio no encontrado' }, { status: 404 });

    const metByItem = {};
    for (const m of metrics) {
      metByItem[m.published_item_id] = metByItem[m.published_item_id] || {};
      metByItem[m.published_item_id][m.metric] = Number(m.value);
    }
    const subsByItem = {};
    for (const s of subs) {
      if (s.attributed_item_id) subsByItem[s.attributed_item_id] = (subsByItem[s.attributed_item_id] || 0) + 1;
    }
    const reachOf = (it) => {
      const met = metByItem[it.id] || {};
      return Number(met.reach ?? met.views ?? met.impressions ?? 0) || 0;
    };
    const engOf = (it) => {
      const met = metByItem[it.id] || {};
      const v = met.engagement_rate;
      return typeof v === 'number' ? v : null;
    };

    // Strength: fuerte si trajo ≥3 subs; medio si tuvo alcance alto pero <3;
    // débil si poco de todo. Cuando no hay atribución, cae por reach.
    const HIGH_REACH = 8000; // umbral suave por defecto — funciona con mock
    const shaped = (piezas || []).map(it => {
      const subs = subsByItem[it.id] || 0;
      const reach = reachOf(it);
      let strength = 'debil';
      if (subs >= 3) strength = 'fuerte';
      else if (reach >= HIGH_REACH) strength = 'medio';
      return {
        id: it.id,
        title: it.title,
        content_type: it.content_type,
        platform: it.platform,
        published_url: it.published_url,
        angle_type: it.angle_type,
        reach,
        engagement_rate: engOf(it),
        subs_atribuidos: subs,
        strength,
        published_at: it.published_at,
      };
    }).sort((a, b) => (b.reach - a.reach));

    // Madre: si hay una published_item de content_type='episodio' en las
    // piezas, sus métricas propias (por plataforma) van al header.
    const propias = (piezas || []).filter(p => p.content_type === 'episodio');
    const madreMetrics = {};
    for (const p of propias) {
      const met = metByItem[p.id] || {};
      madreMetrics[p.platform] = {
        reach: Number(met.reach ?? met.views ?? met.impressions ?? 0) || 0,
        engagement_rate: typeof met.engagement_rate === 'number' ? met.engagement_rate : null,
      };
    }

    // Resultado total
    const alcance_total = shaped.reduce((a, b) => a + b.reach, 0);
    const subs_total = shaped.reduce((a, b) => a + b.subs_atribuidos, 0);

    return NextResponse.json({
      madre: {
        id: ep.id,
        label: ep.name,
        type: 'episode',
        metrics: madreMetrics,
      },
      piezas: shaped,
      resultado: { alcance_total, subs_total },
    });
  } catch (e) {
    console.error('linaje error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
