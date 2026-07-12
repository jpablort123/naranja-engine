import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { withProduct } from '@/lib/product';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const dynamic = 'force-dynamic';

// ═══ GET /api/published/[id] ═══
// Pieza + métricas + madre + hermanas + serie de reach (para el PiezaPanel).
// spec universo §5 — nodo con sus vecinos.
export async function GET(_req, { params }) {
  try {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

    const { data: pieza, error } = await db.from('published_items').select('*').eq('id', id).single();
    if (error || !pieza) return NextResponse.json({ error: 'pieza no encontrada' }, { status: 404 });

    // Métricas más recientes por tipo
    const { data: metrics = [] } = await db.from('latest_metrics').select('*').eq('published_item_id', id);
    const byMetric = {};
    for (const m of metrics) byMetric[m.metric] = Number(m.value);

    // Serie histórica de reach/views/impressions (mini-histórico)
    const { data: snaps = [] } = await db
      .from('metric_snapshots')
      .select('metric, value, captured_at')
      .eq('published_item_id', id)
      .in('metric', ['reach', 'views', 'impressions', 'engagement_rate'])
      .order('captured_at', { ascending: true });

    // Madre: si origin_type es episode/newsletter, traer nombre real.
    let madre = null;
    if (pieza.origin_id && (pieza.origin_type === 'episode' || pieza.origin_type === 'newsletter')) {
      const tabla = pieza.origin_type === 'episode' ? 'episodes' : 'newsletters';
      const { data } = await db.from(tabla).select('id, name').eq('id', pieza.origin_id).single();
      if (data) madre = { id: data.id, label: data.name, type: pieza.origin_type };
    }
    if (!madre && pieza.origin_label) {
      madre = { id: null, label: pieza.origin_label, type: pieza.origin_type || 'manual' };
    }

    // Hermanas: piezas de la misma madre (excluye a la actual).
    let hermanas = [];
    if (pieza.origin_id) {
      const { data } = await withProduct(
        db.from('published_items')
          .select('id, title, content_type, platform, status, angle_type, published_at, published_url')
          .eq('origin_type', pieza.origin_type)
          .eq('origin_id', pieza.origin_id)
          .neq('id', id)
          .order('published_at', { ascending: false, nullsFirst: false })
      );
      hermanas = data || [];
    }

    // Suscriptores atribuidos
    const { data: subsCount } = await db
      .from('subscribers')
      .select('id', { count: 'exact', head: false })
      .eq('attributed_item_id', id);
    const subs_atribuidos = (subsCount || []).length;

    return NextResponse.json({
      pieza,
      metrics: byMetric,
      history: snaps,
      madre,
      hermanas,
      subs_atribuidos,
    });
  } catch (e) {
    console.error('published/[id] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
