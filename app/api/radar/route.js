import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { withProduct } from '@/lib/product';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const dynamic = 'force-dynamic';

// ═══ GET /api/radar ═══
// Payload que consume RadarView (spec §5.4). Une:
//  - published_items (todos, con published_at)
//  - latest_metrics (última métrica por pieza por tipo)
//  - subscribers (para subs 7d)
//  - episodes (para el "último episodio")
// Todo el cálculo se hace en memoria — el dataset del sprint es chico
// (decenas → cientos de piezas). Si crece mucho, mover a SQL agregados.
export async function GET() {
  try {
    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const d14 = new Date(now.getTime() - 14 * 24 * 3600 * 1000);

    const [{ data: items = [] }, { data: metrics = [] }, { data: subs = [] }, { data: episodes = [] }] = await Promise.all([
      // published_items filtrado por producto Y por status='publicada' — el Radar
      // habla de RESULTADOS, no de propuestas ni descartes (spec universo §4).
      withProduct(db.from('published_items').select('*')).eq('status', 'publicada'),
      db.from('latest_metrics').select('*'),
      withProduct(db.from('subscribers').select('*')),
      withProduct(db.from('episodes').select('id, name, created_at').order('created_at', { ascending: false }).limit(1)),
    ]);

    // Index métricas por published_item_id → { metric: value }
    const metByItem = {};
    for (const m of metrics) {
      metByItem[m.published_item_id] = metByItem[m.published_item_id] || {};
      metByItem[m.published_item_id][m.metric] = Number(m.value);
    }

    // Alcance de una pieza: la primera métrica de tipo alcance que exista.
    const reachOf = (item) => {
      const met = metByItem[item.id] || {};
      return Number(met.reach ?? met.views ?? met.impressions ?? 0) || 0;
    };
    const engOf = (item) => {
      const met = metByItem[item.id] || {};
      const v = met.engagement_rate;
      return typeof v === 'number' ? v : null;
    };

    // ── PULSO (7 días) ──────────────────────────────────────────────────────
    const items7 = items.filter(i => i.published_at && new Date(i.published_at) >= d7);
    const alcance_total_7d = items7.reduce((acc, it) => acc + reachOf(it), 0);
    const piezas_publicadas_7d = items7.length;
    const madres_activas = new Set(items7.filter(i => i.origin_id).map(i => i.origin_id)).size;
    const engagements7 = items7.map(engOf).filter(v => typeof v === 'number');
    const engagement_promedio_7d = engagements7.length > 0
      ? Math.round((engagements7.reduce((a, b) => a + b, 0) / engagements7.length) * 10) / 10
      : 0;

    // Suscriptores
    const subs_nuevos_7d = subs.filter(s => s.subscribed_at && new Date(s.subscribed_at) >= d7).length;
    const subs_prev_7d = subs.filter(s => s.subscribed_at && new Date(s.subscribed_at) >= d14 && new Date(s.subscribed_at) < d7).length;
    const subsByItem = subs.reduce((acc, s) => {
      if (s.attributed_item_id) acc[s.attributed_item_id] = (acc[s.attributed_item_id] || 0) + 1;
      return acc;
    }, {});

    // Top piezas (últimos 7d), ordenadas por reach
    const top_piezas = items7
      .map(it => ({
        id: it.id,
        title: it.title,
        content_type: it.content_type,
        platform: it.platform,
        reach: reachOf(it),
        engagement_rate: engOf(it),
        subs: subsByItem[it.id] || 0,
      }))
      .sort((a, b) => (b.reach - a.reach) || (b.subs - a.subs))
      .slice(0, 5);

    // Último episodio: buscar published_items con origin_type='episode'
    // y agregar por origin_id, tomando el más reciente.
    let ultimo_episodio = null;
    const epItems = items.filter(i => i.origin_type === 'episode' && i.origin_id);
    if (epItems.length > 0) {
      // agrupar por origin_id
      const byEp = {};
      for (const it of epItems) {
        const k = it.origin_id;
        byEp[k] = byEp[k] || { origin_id: k, label: it.origin_label || null, piezas: 0, alcance: 0, subs: 0, ts: 0 };
        byEp[k].piezas += 1;
        byEp[k].alcance += reachOf(it);
        byEp[k].subs += subsByItem[it.id] || 0;
        const t = it.published_at ? new Date(it.published_at).getTime() : 0;
        if (t > byEp[k].ts) byEp[k].ts = t;
      }
      const rank = Object.values(byEp).sort((a, b) => b.ts - a.ts);
      const chosen = rank[0];
      if (chosen) {
        ultimo_episodio = {
          origin_id: chosen.origin_id,
          label: chosen.label || episodes[0]?.name || null,
          piezas: chosen.piezas,
          alcance: chosen.alcance,
          subs: chosen.subs,
        };
      }
    }
    if (!ultimo_episodio && episodes.length > 0) {
      // Fallback: hay episodio en la tabla pero sin piezas publicadas todavía.
      ultimo_episodio = { origin_id: episodes[0].id, label: episodes[0].name, piezas: 0, alcance: 0, subs: 0 };
    }

    // ── PATRONES (todo el histórico) ───────────────────────────────────────
    // engagement por formato
    const grpFormato = groupAvg(items, engOf, i => i.content_type);
    // engagement por ángulo (solo cuando hay angle_type)
    const grpAngulo = groupAvg(items.filter(i => i.angle_type), engOf, i => i.angle_type);

    return NextResponse.json({
      pulso: {
        subs_nuevos_7d,
        subs_prev_7d,
        engagement_promedio_7d,
        alcance_total_7d,
        piezas_publicadas_7d,
        madres_activas,
        top_piezas,
        ultimo_episodio,
      },
      patrones: {
        engagement_por_formato: grpFormato,
        engagement_por_angulo: grpAngulo,
      },
    });
  } catch (e) {
    console.error('radar error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Agrupa por keyFn y saca promedio del valFn (ignora nulls). Devuelve array
// ordenado descendente por promedio, formato listo para render de barras.
function groupAvg(items, valFn, keyFn) {
  const buckets = {};
  for (const it of items) {
    const k = keyFn(it); if (!k) continue;
    const v = valFn(it); if (typeof v !== 'number') continue;
    buckets[k] = buckets[k] || { sum: 0, n: 0 };
    buckets[k].sum += v; buckets[k].n += 1;
  }
  return Object.entries(buckets).map(([k, { sum, n }]) => ({
    key: k,
    engagement_rate: Math.round((sum / n) * 10) / 10,
    n,
  })).sort((a, b) => b.engagement_rate - a.engagement_rate);
}
