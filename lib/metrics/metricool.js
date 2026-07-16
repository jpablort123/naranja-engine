// ═══ Provider Metricool ═══
// Cubre instagram, linkedin y tiktok (el ruteo por plataforma en index.js ya
// las manda acá). Auth: header X-Mc-Auth + query params userToken/userId/blogId.
//
// Env:
//   METRICOOL_TOKEN         — token de API (va tanto en header como en query)
//   METRICOOL_USER_ID       — id del usuario
//   METRICOOL_BLOG_ID       — id del brand/blog (workspace)
//   METRICOOL_WINDOW_DAYS   — opcional, ventana hacia atrás para pedir posts (default 180)
//
// Se activa cuando METRICS_PROVIDER != 'mock'. index.js NO se toca.
//
// Estrategia:
//   La API de Metricool devuelve TODOS los posts de un rango en una sola
//   llamada. Cachear el resultado por (network, rango) durante la corrida
//   de un sync evita N llamadas para N piezas de la misma red.
//   El matching con published_items se hace por published_url normalizada.

const BASE_URL = 'https://app.metricool.com/api';

// Redes que este provider cubre (spec + index.js). La API acepta más
// (facebook, threads, bluesky, pinterest, twitter/x) pero el CMO Engine hoy
// solo produce piezas para estas 3.
export const platforms = ['instagram', 'linkedin', 'tiktok'];

// Cache in-memory dentro del proceso Node: sirve para que un `metrics/sync`
// que procesa varias piezas de una misma red solo pegue una vez a Metricool.
// Clave: `${network}|${fromISO}|${toISO}`.
const _cache = new Map();

// ── Helpers ────────────────────────────────────────────────────────────────

function envCredentials() {
  const token = process.env.METRICOOL_TOKEN;
  const userId = process.env.METRICOOL_USER_ID;
  const blogId = process.env.METRICOOL_BLOG_ID;
  if (!token || !userId || !blogId) return null;
  return { token, userId, blogId };
}

function windowDays() {
  const n = Number(process.env.METRICOOL_WINDOW_DAYS || 180);
  return Number.isFinite(n) && n > 0 ? n : 180;
}

// Formato ISO 8601 sin ms ni Z (formato que el CLI de referencia usa:
// `2026-02-16T11:45:00`). Metricool también acepta la fecha completa ISO,
// pero mantenemos el formato del ejemplo.
function isoLocal(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

// Normaliza una URL de post para matching:
//   - protocolo homogeneizado a https
//   - hostname en minúsculas, sin 'www.'
//   - path sin trailing slash y en minúsculas
//   - SIN query string, SIN fragment
// Devuelve `${host}${path}` (sin protocolo) para tolerar http/https.
export function normalizeUrl(u) {
  if (!u || typeof u !== 'string') return '';
  const s = u.trim();
  if (!s) return '';
  let parsed;
  try {
    parsed = new URL(s);
  } catch {
    // Puede venir un id crudo o algo sin protocolo — devolver limpio.
    return s.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '').toLowerCase();
  }
  const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
  const path = (parsed.pathname || '').replace(/\/+$/, '').toLowerCase();
  return `${host}${path}`;
}

// ── Llamada cruda a Metricool ──────────────────────────────────────────────

async function fetchPosts(network, cred, { fromISO, toISO }) {
  const cacheKey = `${network}|${fromISO}|${toISO}`;
  if (_cache.has(cacheKey)) return _cache.get(cacheKey);

  const params = new URLSearchParams();
  params.set('userToken', cred.token);
  params.set('userId', cred.userId);
  params.set('blogId', cred.blogId);
  params.set('from', fromISO);
  params.set('to', toISO);

  const url = `${BASE_URL}/v2/analytics/posts/${encodeURIComponent(network)}?${params.toString()}`;

  const p = (async () => {
    let r;
    try {
      r = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-Mc-Auth': cred.token,
        },
      });
    } catch (e) {
      console.error(`[metrics/metricool] network error (${network}):`, e.message);
      return [];
    }
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      console.error(`[metrics/metricool] http ${r.status} (${network}):`, body.slice(0, 200));
      return [];
    }
    const j = await r.json().catch(() => null);
    // La respuesta puede venir como { data: [...] } o directamente como [...].
    // Nos protegemos contra ambas.
    const list = Array.isArray(j) ? j : Array.isArray(j?.data) ? j.data : Array.isArray(j?.posts) ? j.posts : [];
    return list;
  })();

  _cache.set(cacheKey, p);
  // Auto-invalidar la promesa cacheada después de 5 min por si el proceso
  // Node vive mucho (dev server, cron sostenido).
  setTimeout(() => _cache.delete(cacheKey), 5 * 60 * 1000).unref?.();

  return p;
}

// ── Matching de un post por URL/post_id ────────────────────────────────────

function findMatchingPost(posts, item) {
  if (!Array.isArray(posts) || posts.length === 0) return null;
  const target = normalizeUrl(item?.published_url);
  const postId = (item?.platform_post_id || '').toString().trim();

  // Metricool nombra la URL de post de varias formas según la red. Probamos
  // todos los campos plausibles.
  const urlOf = (p) =>
    p?.url ||
    p?.postUrl ||
    p?.post_url ||
    p?.permalink ||
    p?.link ||
    p?.shortlink ||
    p?.publicUrl ||
    '';

  const idOf = (p) =>
    (p?.id ?? p?.postId ?? p?.mediaId ?? p?.activityId ?? p?.videoId ?? '').toString();

  // 1) Match por URL normalizada.
  if (target) {
    const hit = posts.find(p => normalizeUrl(urlOf(p)) === target);
    if (hit) return hit;

    // 2) Fallback: la URL del item contiene el id del post (ej. IG shortcode)
    //    y podemos matchear por endsWith de la última parte.
    const targetTail = target.split('/').filter(Boolean).slice(-1)[0] || '';
    if (targetTail) {
      const hit2 = posts.find(p => {
        const u = normalizeUrl(urlOf(p));
        return u && (u.endsWith(`/${targetTail}`) || u.endsWith(targetTail));
      });
      if (hit2) return hit2;
    }
  }

  // 3) Match por platform_post_id contra ids de la respuesta.
  if (postId) {
    const hit = posts.find(p => {
      const pid = idOf(p);
      return pid && (pid === postId || pid.includes(postId) || postId.includes(pid));
    });
    if (hit) return hit;
  }

  return null;
}

// ── Mapping del post a nuestro contrato [{metric, value}] ──────────────────

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapPostToMetrics(post, network) {
  if (!post || typeof post !== 'object') return [];

  // Metricool devuelve campos con nombres distintos por red. Aceptamos
  // varios alias por métrica y usamos el primero disponible.
  const reach = num(post.reach ?? post.uniqueImpressions);
  const impressions = num(post.impressions ?? post.views ?? post.videoViews);
  const views = num(post.videoViews ?? post.plays ?? post.videoPlays);
  const likes = num(post.likes ?? post.reactions ?? post.likesCount);
  const comments = num(post.comments ?? post.commentsCount);
  const shares = num(post.shares ?? post.reposts ?? post.shareCount);
  const saves = num(post.saves ?? post.saved ?? post.savedCount);
  const engagementRaw = num(post.engagementRate ?? post.engagement_rate ?? post.engagement);
  // Interacciones agregadas cuando la API las provee y no vienen desglosadas.
  const interactions = num(post.interactions ?? post.totalInteractions);

  // engagement_rate: Metricool a veces lo devuelve como fracción (0.058) y a
  // veces como porcentaje (5.8). Si viene <=1, asumimos fracción y multiplicamos.
  let engagementPct = null;
  if (engagementRaw != null) {
    engagementPct = engagementRaw <= 1 ? engagementRaw * 100 : engagementRaw;
  } else {
    // Derivar si no vino: (likes + comments + shares + saves) / (reach|impressions)
    const num_er = (likes || 0) + (comments || 0) + (shares || 0) + (saves || 0);
    const den_er = reach || impressions;
    if (den_er && den_er > 0) engagementPct = (num_er / den_er) * 100;
  }

  const out = [];
  // Alcance principal por red (spec universo §5.4 en el radar usa reach || views || impressions):
  //   instagram → reach (fallback impressions)
  //   linkedin  → impressions
  //   tiktok    → views (fallback impressions)
  if (reach != null) out.push({ metric: 'reach', value: reach });
  if (impressions != null) out.push({ metric: 'impressions', value: impressions });
  if (views != null && network === 'tiktok') out.push({ metric: 'views', value: views });

  if (likes != null) out.push({ metric: 'likes', value: likes });
  if (comments != null) out.push({ metric: 'comments', value: comments });
  if (shares != null) out.push({ metric: 'shares', value: shares });
  if (saves != null) out.push({ metric: 'saves', value: saves });
  if (engagementPct != null) {
    out.push({ metric: 'engagement_rate', value: Math.round(engagementPct * 100) / 100 });
  }
  // Métrica auxiliar solo si no hubo desglose útil.
  if (out.length === 0 && interactions != null) {
    out.push({ metric: 'likes', value: interactions });
  }

  return out;
}

// ── API pública ────────────────────────────────────────────────────────────

export async function fetchMetrics(item) {
  const cred = envCredentials();
  if (!cred) {
    console.warn('[metrics/metricool] credenciales incompletas (METRICOOL_TOKEN/USER_ID/BLOG_ID) — devolviendo []');
    return [];
  }
  const network = (item?.platform || '').toLowerCase();
  if (!platforms.includes(network)) return [];

  // Sin published_url ni platform_post_id no podemos matchear. Devolver [].
  if (!item?.published_url && !item?.platform_post_id) return [];

  const to = new Date();
  const from = new Date(to.getTime() - windowDays() * 24 * 3600 * 1000);
  const fromISO = isoLocal(from);
  const toISO = isoLocal(to);

  const posts = await fetchPosts(network, cred, { fromISO, toISO });
  const match = findMatchingPost(posts, item);
  if (!match) {
    // Silencioso: es normal si la pieza está fuera de la ventana o si el URL
    // registrado no coincide con el shortlink de Metricool.
    return [];
  }
  return mapPostToMetrics(match, network);
}
