import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { withProduct } from '@/lib/product';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const dynamic = 'force-dynamic';

// ═══ GET /api/angulos/[angle_type] ═══
// Vista de ángulo cross-episodio: todas las piezas del producto con ese
// angle_type, con sus métricas y agregados (spec universo §5).
export async function GET(_req, { params }) {
  try {
    const angleType = decodeURIComponent(params?.angle_type || '');
    if (!angleType) return NextResponse.json({ error: 'angle_type requerido' }, { status: 400 });

    const [{ data: piezas = [] }, { data: metrics = [] }, { data: subs = [] }] = await Promise.all([
      withProduct(
        db.from('published_items').select('*')
          .eq('angle_type', angleType)
          .order('published_at', { ascending: false, nullsFirst: false })
      ),
      db.from('latest_metrics').select('*'),
      withProduct(db.from('subscribers').select('id, attributed_item_id')),
    ]);

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
      return typeof met.engagement_rate === 'number' ? met.engagement_rate : null;
    };

    const shaped = piezas.map(it => ({
      id: it.id,
      title: it.title,
      content_type: it.content_type,
      platform: it.platform,
      status: it.status || 'publicada',
      published_url: it.published_url,
      origin_label: it.origin_label,
      origin_id: it.origin_id,
      origin_type: it.origin_type,
      reach: reachOf(it),
      engagement_rate: engOf(it),
      subs_atribuidos: subsByItem[it.id] || 0,
      published_at: it.published_at,
    }));

    // Agregados solo sobre las publicadas — evita mostrar promedios contra
    // propuestas sin métricas.
    const publicadas = shaped.filter(p => p.status === 'publicada');
    const alcance_total = publicadas.reduce((a, b) => a + b.reach, 0);
    const engagements = publicadas.map(p => p.engagement_rate).filter(v => typeof v === 'number');
    const engagement_promedio = engagements.length
      ? Math.round((engagements.reduce((a, b) => a + b, 0) / engagements.length) * 10) / 10
      : 0;
    const subs_total = publicadas.reduce((a, b) => a + b.subs_atribuidos, 0);

    return NextResponse.json({
      angle_type: angleType,
      piezas: shaped,
      resumen: {
        piezas: publicadas.length,
        propuestas: shaped.filter(p => p.status === 'propuesta').length,
        descartadas: shaped.filter(p => p.status === 'descartada').length,
        alcance_total,
        engagement_promedio,
        subs_total,
      },
    });
  } catch (e) {
    console.error('angulos/[type] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
