import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { withProduct } from '@/lib/product';

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
      // Universo v0.8: piezas de TODOS los estados (spec §4).
      withProduct(db.from('published_items').select('*').eq('origin_type', 'episode').eq('origin_id', id)),
      db.from('latest_metrics').select('*'),
      withProduct(db.from('subscribers').select('id, email, attributed_item_id')),
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
    // Piezas no publicadas (propuesta/descartada) siempre 'debil' — no tienen
    // métricas todavía, así el color del stub no miente.
    const HIGH_REACH = 8000; // umbral suave por defecto — funciona con mock
    const shaped = (piezas || []).map(it => {
      const status = it.status || 'publicada';
      const subs = subsByItem[it.id] || 0;
      const reach = status === 'publicada' ? reachOf(it) : 0;
      let strength = 'debil';
      if (status === 'publicada') {
        if (subs >= 3) strength = 'fuerte';
        else if (reach >= HIGH_REACH) strength = 'medio';
      }
      return {
        id: it.id,
        content_group_id: it.content_group_id || null,
        title: it.title,
        content_type: it.content_type,
        platform: it.platform,
        published_url: it.published_url,
        angle_type: it.angle_type,
        origin_ref: it.origin_ref || null,
        status,
        discard_reason: it.discard_reason || null,
        reach,
        engagement_rate: status === 'publicada' ? engOf(it) : null,
        subs_atribuidos: subs,
        strength,
        published_at: it.published_at,
      };
    }).sort((a, b) => {
      // Publicadas primero (por reach), luego propuestas (por título), luego descartadas.
      const rank = { publicada: 0, propuesta: 1, descartada: 2 };
      if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
      return (b.reach - a.reach);
    });

    // ── Módulo E: agrupar hermanas del mismo content_group_id ──────────────
    // Piezas con el mismo content_group_id (y mismo status='publicada') se
    // colapsan en UNA sola tarjeta en la UI. El desglose por plataforma va
    // dentro. Propuestas y descartes NO se agrupan (cada una es su tarjeta).
    const gruposMap = new Map();
    const filas = []; // filas finales que la UI renderiza (una fila = una tarjeta)
    for (const p of shaped) {
      if (p.status === 'publicada' && p.content_group_id) {
        const key = p.content_group_id;
        if (!gruposMap.has(key)) {
          const stub = {
            kind: 'grupo',
            group_id: key,
            status: 'publicada',
            angle_type: p.angle_type,
            content_type: p.content_type,
            title: p.title,
            published_at: p.published_at,
            miembros: [],
          };
          gruposMap.set(key, stub);
          filas.push(stub);
        }
        gruposMap.get(key).miembros.push(p);
      } else {
        filas.push({ kind: 'individual', ...p });
      }
    }
    // Consolidar agregados por grupo.
    for (const g of gruposMap.values()) {
      g.reach = g.miembros.reduce((a, b) => a + b.reach, 0);
      g.subs_atribuidos = g.miembros.reduce((a, b) => a + b.subs_atribuidos, 0);
      const eng = g.miembros.map(m => m.engagement_rate).filter(v => typeof v === 'number');
      g.engagement_rate = eng.length ? Math.round((eng.reduce((a, b) => a + b, 0) / eng.length) * 10) / 10 : null;
      // strength del grupo: la mejor de sus miembros
      const rank = { fuerte: 3, medio: 2, debil: 1 };
      g.strength = g.miembros.reduce((best, m) => (rank[m.strength] > rank[best] ? m.strength : best), 'debil');
      g.platforms = [...new Set(g.miembros.map(m => m.platform))];
      // ordenar miembros por reach descendente
      g.miembros.sort((a, b) => (b.reach - a.reach));
    }
    // Reordenar filas: primero publicadas (por reach), luego propuestas,
    // luego descartadas.
    filas.sort((a, b) => {
      const rank = { publicada: 0, propuesta: 1, descartada: 2 };
      if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
      return ((b.reach || 0) - (a.reach || 0));
    });

    // Madre: si hay una published_item de content_type='episodio' publicada en
    // las piezas, sus métricas propias (por plataforma) van al header.
    const propias = (piezas || []).filter(p => p.content_type === 'episodio' && (p.status || 'publicada') === 'publicada');
    const madreMetrics = {};
    for (const p of propias) {
      const met = metByItem[p.id] || {};
      madreMetrics[p.platform] = {
        reach: Number(met.reach ?? met.views ?? met.impressions ?? 0) || 0,
        engagement_rate: typeof met.engagement_rate === 'number' ? met.engagement_rate : null,
      };
    }

    // Resultado total — solo cuenta las publicadas (las propuestas/descartes no aportan).
    const publicadas = shaped.filter(p => p.status === 'publicada');
    const alcance_total = publicadas.reduce((a, b) => a + b.reach, 0);
    const subs_total = publicadas.reduce((a, b) => a + b.subs_atribuidos, 0);
    // Conteos: piezas (individuales) para propuesta/descartada; para
    // 'publicada' contamos GRUPOS (un video en 3 redes = 1). Esto mata el
    // "veo repetidas" de JP.
    const conteo = {
      publicada: filas.filter(f => f.status === 'publicada').length,
      propuesta: filas.filter(f => f.status === 'propuesta').length,
      descartada: filas.filter(f => f.status === 'descartada').length,
    };

    return NextResponse.json({
      madre: {
        id: ep.id,
        label: ep.name,
        type: 'episode',
        metrics: madreMetrics,
      },
      piezas: shaped,      // shape v0.8 (para compat) — array plano de todas las piezas
      filas,               // shape v0.9 (spec Módulo E) — grupos + individuales listos para la UI
      resultado: { alcance_total, subs_total, conteo },
    });
  } catch (e) {
    console.error('linaje error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
