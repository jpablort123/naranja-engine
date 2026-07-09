// ═══ Provider Metricool — STUB (spec §4.4) ═══
// NO implementar en este sprint. Cubre Instagram y LinkedIn agregado
// desde una sola cuenta (plan Advanced/Custom).
//
// TODO: Metricool API. Auth con header X-Mc-Auth y query userId + blogId.
//
// Env esperado:
//   - METRICOOL_TOKEN
//   - METRICOOL_USER_ID
//   - METRICOOL_BLOG_ID
//
// Endpoints a explorar (Metricool no publica docs oficiales completos;
// verificar con support de la plataforma):
//   GET https://app.metricool.com/api/v2/analytics/posts?blogId={blogId}&start=YYYY-MM-DD&end=YYYY-MM-DD
//
// item.platform_post_id = media_id de IG / activity id de LinkedIn.
// Si viene vacío, retornar [].
//
// Devolver formato: [{ metric, value }] con métricas al menos: reach
// (instagram) / impressions (linkedin), engagement_rate, likes, comments,
// shares, saves.

export const platforms = ['instagram', 'linkedin', 'tiktok'];

export async function fetchMetrics(item) {
  // TODO: reemplazar con implementación real.
  console.warn('[metrics/metricool] no implementado — devolviendo []', item?.platform_post_id || item?.id);
  return [];
}
