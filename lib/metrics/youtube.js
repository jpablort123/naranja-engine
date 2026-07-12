// ═══ Provider YouTube (spec universo §8) ═══
// Implementación simple con API key (sin OAuth). Solo lee estadísticas
// públicas del video vía YouTube Data API v3.
//
// Env:
//   YOUTUBE_API_KEY   — API key con acceso a YouTube Data API v3.
//
// Se activa cuando:
//   METRICS_PROVIDER != 'mock'  (index.js rutea youtube → este archivo)
// Con METRICS_PROVIDER='mock' (default), el mock sigue devolviendo datos.
//
// TODO futuro (fuera de este sprint):
//   - Añadir YouTube Analytics API (retención, watch_time, tráfico) vía OAuth
//     como dueño del canal. Env: YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN.

export const platforms = ['youtube'];

// Extrae videoId de un URL de YouTube. Soporta:
//   https://www.youtube.com/watch?v=<id>&…
//   https://youtu.be/<id>
//   https://youtube.com/shorts/<id>
//   https://www.youtube.com/embed/<id>
export function extractVideoId(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return (u.pathname || '/').slice(1).split('/')[0] || null;
    const v = u.searchParams.get('v');
    if (v) return v;
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts[0] === 'shorts' && parts[1]) return parts[1];
    if (parts[0] === 'embed' && parts[1]) return parts[1];
    return null;
  } catch {
    // Puede venir un id crudo
    if (/^[A-Za-z0-9_-]{6,20}$/.test(url)) return url;
    return null;
  }
}

export async function fetchMetrics(item) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn('[metrics/youtube] YOUTUBE_API_KEY no configurada — devolviendo []');
    return [];
  }
  const videoId = extractVideoId(item?.published_url) || item?.platform_post_id || null;
  if (!videoId) return [];

  const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(apiKey)}`;
  let r;
  try {
    r = await fetch(url);
  } catch (e) {
    console.error('[metrics/youtube] network:', e.message);
    return [];
  }
  if (!r.ok) {
    console.error('[metrics/youtube] http', r.status, await r.text().catch(() => ''));
    return [];
  }
  const j = await r.json().catch(() => null);
  const stats = j?.items?.[0]?.statistics;
  if (!stats) return [];

  const views = Number(stats.viewCount) || 0;
  const likes = Number(stats.likeCount) || 0;
  const comments = Number(stats.commentCount) || 0;
  const engagement_rate = views > 0
    ? Math.round(((likes + comments) / views) * 10000) / 100  // dos decimales en %
    : 0;

  return [
    { metric: 'views', value: views },
    { metric: 'likes', value: likes },
    { metric: 'comments', value: comments },
    { metric: 'engagement_rate', value: engagement_rate },
  ];
}
