// ═══ Costura multi-producto (spec universo §7) ═══
// Constante del producto activo. La UI actual es CMO-only; esta costura
// existe para el día que llegue un segundo producto (no es multi-tenant).
//
// - Todo insert en episodes/newsletters/published_items/subscribers/ideas
//   debe setear product_id = CURRENT_PRODUCT_ID.
// - Todo read (Radar, Público, Universo, listas del sidebar, ángulos)
//   debe filtrar por product_id = CURRENT_PRODUCT_ID.

const DEFAULT_PRODUCT_ID = 'c0000000-0000-4000-8000-000000000001';

export const CURRENT_PRODUCT_ID = process.env.CURRENT_PRODUCT_ID || DEFAULT_PRODUCT_ID;

// Helper para aplicar el filtro en supabase-js con una API simple.
// Uso: q = db.from('episodes').select('*'); q = withProduct(q);
export function withProduct(query, column = 'product_id') {
  return query.eq(column, CURRENT_PRODUCT_ID);
}

// Merge sobre un objeto de payload de insert.
// Uso: db.from('episodes').insert(withProductPayload({ name, transcript })).
export function withProductPayload(payload) {
  if (Array.isArray(payload)) {
    return payload.map(p => ({ product_id: CURRENT_PRODUCT_ID, ...p }));
  }
  return { product_id: CURRENT_PRODUCT_ID, ...payload };
}
