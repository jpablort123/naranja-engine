import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { withProduct } from '@/lib/product';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const dynamic = 'force-dynamic';

// ═══ GET /api/radar ═══
// Payload del RadarView (spec v0.9 §3 Módulo G — selector de rango).
//
// Query params:
//   range = 'week' | 'month' | 'all'  (default 'month')
//   from  = ISO opcional (override manual)
//   to    = ISO opcional (override manual)
//
// Responde:
//   { pulso, patrones, mejores_all_time }
// donde pulso ahora respeta el rango elegido y `mejores_all_time` es un top
// piezas por reach sobre TODO el histórico (independiente del rango).
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const range = (searchParams.get('range') || 'month').toLowerCase();
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const { from, to, previous_from, previous_to, label } = resolveRange({ range, fromParam, toParam });

    const [{ data: items = [] }, { data: metrics = [] }, { data: subs = [] }, { data: episodes = [] }] = await Promise.all([
      // spec universo §4: sólo status='publicada'.
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
    const reachOf = (item) => {
      const met = metByItem[item.id] || {};
      return Number(met.reach ?? met.views ?? met.impressions ?? 0) || 0;
    };
    const engOf = (item) => {
      const met = metByItem[item.id] || {};
      const v = met.engagement_rate;
      return typeof v === 'number' ? v : null;
    };

    // Agrupador por content_group_id — spec §3 Módulo E: hermanas del mismo
    // video/concepto se cuentan como UNA pieza en el ranking (con reach
    // combinado). Piezas sin content_group_id son "grupos de 1".
    const groups = groupByContentGroup(items);
    const groupReach = (g) => g.items.reduce((a, b) => a + reachOf(b), 0);
    const groupEng = (g) => {
      const vs = g.items.map(engOf).filter(v => typeof v === 'number');
      return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null;
    };
    const groupPlatforms = (g) => [...new Set(g.items.map(x => x.platform))];

    // Predicado de "está dentro del rango" (usamos `published_at`; si no hay,
    // caemos a `created_at`).
    const inRange = (it) => {
      const ts = it.published_at || it.created_at;
      if (!ts) return false;
      const t = new Date(ts).getTime();
      if (from && t < from.getTime()) return false;
      if (to && t > to.getTime()) return false;
      return true;
    };
    const itemsInRange = items.filter(inRange);
    const groupsInRange = groups.filter(g => g.items.some(inRange));

    // Alcance / engagement / piezas dentro del rango — cuenta 1 por grupo, no por hermana.
    const alcance_total = groupsInRange.reduce((acc, g) => acc + groupReach(g), 0);
    const piezas_publicadas = groupsInRange.length;
    const madres_activas = new Set(itemsInRange.filter(i => i.origin_id).map(i => i.origin_id)).size;
    const engagements = groupsInRange.map(groupEng).filter(v => typeof v === 'number');
    const engagement_promedio = engagements.length > 0
      ? Math.round((engagements.reduce((a, b) => a + b, 0) / engagements.length) * 10) / 10
      : 0;

    // Suscriptores dentro del rango + ventana previa (comparación).
    const subsInRange = subs.filter(s => {
      if (!s.subscribed_at) return false;
      const t = new Date(s.subscribed_at).getTime();
      return (!from || t >= from.getTime()) && (!to || t <= to.getTime());
    });
    const subs_nuevos = subsInRange.length;
    const subs_prev = previous_from && previous_to
      ? subs.filter(s => {
          if (!s.subscribed_at) return false;
          const t = new Date(s.subscribed_at).getTime();
          return t >= previous_from.getTime() && t < previous_to.getTime();
        }).length
      : 0;

    // Subs atribuidos por pieza / por grupo.
    const subsByItem = subs.reduce((acc, s) => {
      if (s.attributed_item_id) acc[s.attributed_item_id] = (acc[s.attributed_item_id] || 0) + 1;
      return acc;
    }, {});
    const groupSubs = (g) => g.items.reduce((a, b) => a + (subsByItem[b.id] || 0), 0);

    // Top piezas (grupos) del rango, ordenadas por reach agregado.
    const top_piezas = groupsInRange
      .map(g => {
        const rep = pickRepresentative(g);
        return {
          id: rep.id,
          content_group_id: g.groupKey.startsWith('single:') ? null : g.groupKey,
          title: rep.title,
          content_type: rep.content_type,
          platform: rep.platform,
          platforms: groupPlatforms(g),
          reach: groupReach(g),
          engagement_rate: groupEng(g),
          subs: groupSubs(g),
        };
      })
      .sort((a, b) => (b.reach - a.reach) || (b.subs - a.subs))
      .slice(0, 5);

    // Último episodio: agrupa piezas por origin_id y toma la más reciente.
    // (No cambia por el rango — es "el episodio más reciente".)
    let ultimo_episodio = null;
    const epItems = items.filter(i => i.origin_type === 'episode' && i.origin_id);
    if (epItems.length > 0) {
      const byEp = {};
      for (const it of epItems) {
        const k = it.origin_id;
        byEp[k] = byEp[k] || { origin_id: k, label: it.origin_label || null, piezas: 0, alcance: 0, subs: 0, ts: 0, groupSet: new Set() };
        byEp[k].groupSet.add(it.content_group_id || `single:${it.id}`);
        byEp[k].alcance += reachOf(it);
        byEp[k].subs += subsByItem[it.id] || 0;
        const t = it.published_at ? new Date(it.published_at).getTime() : 0;
        if (t > byEp[k].ts) byEp[k].ts = t;
      }
      Object.values(byEp).forEach(b => { b.piezas = b.groupSet.size; delete b.groupSet; });
      const rank = Object.values(byEp).sort((a, b) => b.ts - a.ts);
      const chosen = rank[0];
      if (chosen) {
        ultimo_episodio = { ...chosen, label: chosen.label || episodes[0]?.name || null };
      }
    }
    if (!ultimo_episodio && episodes.length > 0) {
      ultimo_episodio = { origin_id: episodes[0].id, label: episodes[0].name, piezas: 0, alcance: 0, subs: 0 };
    }

    // Patrones sobre TODO el histórico (no dependen del rango — spec §7 v0.7).
    const grpFormato = groupAvg(items, engOf, i => i.content_type);
    const grpAngulo = groupAvg(items.filter(i => i.angle_type), engOf, i => i.angle_type);

    // "Mejores de todos los tiempos" — spec §3 Módulo G.
    // Top 10 grupos por reach, sin ventana temporal.
    const mejores_all_time = groups
      .map(g => {
        const rep = pickRepresentative(g);
        return {
          id: rep.id,
          content_group_id: g.groupKey.startsWith('single:') ? null : g.groupKey,
          title: rep.title,
          content_type: rep.content_type,
          platform: rep.platform,
          platforms: groupPlatforms(g),
          origin_label: rep.origin_label,
          reach: groupReach(g),
          engagement_rate: groupEng(g),
          subs: groupSubs(g),
        };
      })
      .sort((a, b) => (b.reach - a.reach) || (b.subs - a.subs))
      .slice(0, 10);

    return NextResponse.json({
      rango: { range, from: from?.toISOString() || null, to: to?.toISOString() || null, label },
      pulso: {
        subs_nuevos,
        subs_prev,
        engagement_promedio,
        alcance_total,
        piezas_publicadas,
        madres_activas,
        top_piezas,
        ultimo_episodio,
      },
      patrones: {
        engagement_por_formato: grpFormato,
        engagement_por_angulo: grpAngulo,
      },
      mejores_all_time,
    });
  } catch (e) {
    console.error('radar error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function resolveRange({ range, fromParam, toParam }) {
  const now = new Date();
  if (fromParam || toParam) {
    const from = fromParam ? new Date(fromParam) : null;
    const to = toParam ? new Date(toParam) : now;
    return { from, to, previous_from: null, previous_to: null, label: 'custom' };
  }
  if (range === 'week') {
    const from = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const previous_from = new Date(now.getTime() - 14 * 24 * 3600 * 1000);
    return { from, to: now, previous_from, previous_to: from, label: 'esta semana (7d)' };
  }
  if (range === 'all') {
    return { from: null, to: null, previous_from: null, previous_to: null, label: 'todo el tiempo' };
  }
  // month (default) — últimos 30 días para mantener consistencia con "este mes";
  // el rollup natural del mes-calendario da mucho ruido al inicio del mes.
  const from = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const previous_from = new Date(now.getTime() - 60 * 24 * 3600 * 1000);
  return { from, to: now, previous_from, previous_to: from, label: 'este mes (30d)' };
}

function groupByContentGroup(items) {
  const byKey = new Map();
  for (const it of items) {
    const key = it.content_group_id ? it.content_group_id : `single:${it.id}`;
    if (!byKey.has(key)) byKey.set(key, { groupKey: key, items: [] });
    byKey.get(key).items.push(it);
  }
  return [...byKey.values()];
}

// Elige el representante de un grupo (para título/tipo/plataforma).
// Preferimos la pieza más "grande" para que el título sea el más completo.
function pickRepresentative(group) {
  const order = { youtube: 0, tiktok: 1, instagram: 2, linkedin: 3, spotify: 4 };
  return [...group.items].sort((a, b) => (order[a.platform] ?? 9) - (order[b.platform] ?? 9))[0];
}

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
