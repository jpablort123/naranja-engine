import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { fetchMetricsForItem } from '@/lib/metrics';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/metrics/sync
// Body opcional:
//   { published_item_ids: [...] }  → solo esas piezas
//   {}                              → todas las piezas
// Para cada pieza pide métricas a fetchMetricsForItem e inserta snapshots.
// Con METRICS_PROVIDER=mock esto siembra datos para las vistas.
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body?.published_item_ids) ? body.published_item_ids : null;

    let q = db.from('published_items').select('*');
    if (ids && ids.length > 0) q = q.in('id', ids);
    const { data: items, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!items || items.length === 0) return NextResponse.json({ inserted: 0, items: 0 });

    const capturedAt = new Date().toISOString();
    const rows = [];
    for (const item of items) {
      const ms = await fetchMetricsForItem(item);
      (ms || []).forEach(({ metric, value }) => {
        if (metric && typeof value === 'number' && !Number.isNaN(value)) {
          rows.push({
            published_item_id: item.id,
            platform: item.platform,
            metric,
            value,
            captured_at: capturedAt,
          });
        }
      });
    }

    let inserted = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { data, error: ie } = await db.from('metric_snapshots').insert(chunk).select('id');
      if (ie) return NextResponse.json({ error: ie.message, inserted_parciales: inserted }, { status: 500 });
      inserted += (data || []).length;
    }
    return NextResponse.json({ items: items.length, inserted });
  } catch (e) {
    console.error('metrics/sync error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
