// ═══ Provider YouTube — STUB (spec §4.4) ═══
// NO implementar en este sprint. Implementar cuando llegue el momento con:
//
// TODO: usar YouTube Data API v3 (contadores) + YouTube Analytics API
//       (retención, watch_time, tráfico) vía OAuth como dueño del canal.
//
// Credenciales esperadas en env:
//   - YOUTUBE_CLIENT_ID
//   - YOUTUBE_CLIENT_SECRET
//   - YOUTUBE_REFRESH_TOKEN
//
// item.platform_post_id = videoId. Si viene vacío, retornar [].
//
// Endpoints útiles:
//   GET https://www.googleapis.com/youtube/v3/videos?part=statistics&id={videoId}
//   POST https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&metrics=views,averageViewDuration,likes,comments,shares&filters=video=={videoId}
//
// Devolver formato: [{ metric, value }] con métricas al menos: views,
// engagement_rate (derivado), likes, comments, shares, watch_time.

export const platforms = ['youtube'];

export async function fetchMetrics(item) {
  // TODO: reemplazar con implementación real.
  console.warn('[metrics/youtube] no implementado — devolviendo []', item?.platform_post_id || item?.id);
  return [];
}
