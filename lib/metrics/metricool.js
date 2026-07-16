// ═══ Provider Metricool (v2) ═══
// Cubre instagram, linkedin y tiktok (el ruteo por plataforma en
// lib/metrics/index.js ya las manda acá). Auth: header X-Mc-Auth + query
// params userId y blogId (el token va SOLO en el header; no como userToken
// en query — la doc oficial lo permite pero no es necesario).
//
// Env:
//   METRICOOL_TOKEN         — token (X-Mc-Auth)
//   METRICOOL_USER_ID       — id del usuario Metricool
//   METRICOOL_BLOG_ID       — id del brand/blog (workspace)
//   METRICOOL_WINDOW_DAYS   — opcional, ventana hacia atrás para pedir
//                             posts (default 365). Los endpoints requieren
//                             from/to obligatorios.
//
// Endpoints (confirmados con swagger + curl contra la API real,
// https://app.metricool.com/api/swagger.json):
//
//   IG reels (mayoría del contenido):  GET /v2/analytics/reels/instagram
//   IG posts (single/carousel):        GET /v2/analytics/posts/instagram
//   LinkedIn:                          GET /v2/analytics/posts/linkedin
//   TikTok (devuelve JSON pese al
//   "CSV" del summary del swagger):    GET /v2/analytics/posts/tiktok
//
// Estrategia:
//   La API devuelve TODOS los posts del rango en una sola llamada. Cachear
//   in-memory por (endpoint, ventana) durante la corrida del sync evita N
//   llamadas para N piezas del mismo endpoint.
//
// Matching:
//   Se hace por published_url normalizada (lowercase, sin www., sin
//   trailing slash, sin query, sin fragment). Fallback por shortcode
//   (última parte del path) y por platform_post_id contra los ids que
//   devuelve Metricool.

const BASE_URL = 'https://app.metricool.com/api';

export const platforms = ['instagram', 'linkedin', 'tiktok'];

// Cache in-memory. Clave: `${endpoint}|${fromISO}|${toISO}`. Guarda la
// promesa (para deduplicar peticiones concurrentes) y expira a los 5 min.
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
  const n = Number(process.env.METRICOOL_WINDOW_DAYS || 365);
  return Number.isFinite(n) && n > 0 ? n : 365;
}

// Metricool acepta ISO 8601 `2026-02-16T11:45:00` (sin ms, sin Z).
function isoLocal(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

// Normaliza URL para matching: quita protocolo, `www.`, trailing slash,
// query string y fragment. Devuelve host+path en minúsculas.
export function normalizeUrl(u) {
  if (!u || typeof u !== 'string') return '';
  const s = u.trim();
  if (!s) return '';
  let parsed;
  try { parsed = new URL(s); }
  catch { return s.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '').toLowerCase(); }
  const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
  const path = (parsed.pathname || '').replace(/\/+$/, '').toLowerCase();
  return `${host}${path}`;
}

// Última parte no vacía del path — el shortcode de IG o el videoId de TikTok.
function urlTail(normalizedOrRaw) {
  const norm = normalizedOrRaw.includes('/') ? normalizedOrRaw : normalizeUrl(normalizedOrRaw);
  return (norm.split('/').filter(Boolean).slice(-1)[0] || '').toLowerCase();
}

// ── Ruteo pieza → endpoint(s) de Metricool ─────────────────────────────────

function endpointsFor(item) {
  const platform = (item?.platform || '').toLowerCase();
  const ct = (item?.content_type || '').toLowerCase();
  if (platform === 'linkedin') return ['/v2/analytics/posts/linkedin'];
  if (platform === 'tiktok') return ['/v2/analytics/posts/tiktok'];
  if (platform !== 'instagram') return [];
  // Instagram: si el URL es de /reel/ → reels; si es /p/ → posts.
  // Si no podemos inferir por URL, usar content_type; y si tampoco, probar
  // ambos endpoints (reels primero: son la mayoría del volumen de CMO).
  const url = (item?.published_url || '').toLowerCase();
  if (url.includes('/reel/') || url.includes('/reels/')) {
    return ['/v2/analytics/reels/instagram'];
  }
  if (url.includes('/p/')) {
    return ['/v2/analytics/posts/instagram'];
  }
  if (ct === 'reel' || ct === 'corto') return ['/v2/analytics/reels/instagram'];
  if (ct === 'carrusel' || ct === 'carousel' || ct === 'post') return ['/v2/analytics/posts/instagram'];
  return ['/v2/analytics/reels/instagram', '/v2/analytics/posts/instagram'];
}

// ── Llamada a Metricool (con cache) ────────────────────────────────────────

async function fetchList(endpoint, cred, { fromISO, toISO }) {
  const cacheKey = `${endpoint}|${fromISO}|${toISO}`;
  if (_cache.has(cacheKey)) return _cache.get(cacheKey);

  const params = new URLSearchParams();
  params.set('userId', cred.userId);
  params.set('blogId', cred.blogId);
  params.set('from', fromISO);
  params.set('to', toISO);
  const url = `${BASE_URL}${endpoint}?${params.toString()}`;

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
      console.error(`[metricool] network error ${endpoint}:`, e.message);
      return [];
    }
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      console.error(`[metricool] http ${r.status} ${endpoint}:`, body.slice(0, 200));
      return [];
    }
    const j = await r.json().catch(() => null);
    // El shape estándar es { data: [...], page, metadata }. También toleramos
    // que venga un array crudo o { posts: [...] } por si cambia.
    const list = Array.isArray(j) ? j
      : Array.isArray(j?.data) ? j.data
      : Array.isArray(j?.posts) ? j.posts
      : [];
    if (process.env.METRICOOL_DEBUG) {
      console.log(`[metricool] ${endpoint} → ${list.length} items`);
    }
    return list;
  })();

  _cache.set(cacheKey, p);
  const t = setTimeout(() => _cache.delete(cacheKey), 5 * 60 * 1000);
  if (typeof t.unref === 'function') t.unref();
  return p;
}

// ── Matching ───────────────────────────────────────────────────────────────

function postUrl(post) {
  // IG posts / IG reels / LinkedIn → `url`. TikTok → `shareUrl`.
  return post?.url || post?.shareUrl || post?.postUrl || post?.permalink || post?.link || '';
}
function postId(post) {
  return (
    post?.postId ?? post?.reelId ?? post?.videoId ?? post?.mediaId ?? post?.activityId ?? post?.id ?? ''
  ).toString();
}

// Extrae los ids numéricos largos (≥15 dígitos) que aparezcan en un string.
// Sirve para matchear URLs de LinkedIn (activity-{ID}) contra los `postId`
// urn:li:share:{ID} / urn:li:ugcPost:{ID}, y también videoIds largos de TikTok.
// LIMITACIÓN CONOCIDA: LinkedIn asigna activity-id y share-id distintos para
// la misma publicación. Un URL tipo `/posts/{slug}-activity-{X}-…` no va a
// matchear contra `urn:li:share:{Y}` (X ≠ Y). Ver NOTAS-SPRINT.md.
function longIdsIn(s) {
  if (!s) return [];
  return (s.toString().match(/\d{15,}/g) || []);
}

function findMatch(list, item) {
  if (!Array.isArray(list) || list.length === 0) return null;
  const target = normalizeUrl(item?.published_url);
  const targetTail = target ? urlTail(target) : '';
  const pid = (item?.platform_post_id || '').toString().trim();

  // 1) URL normalizada exacta.
  if (target) {
    const hit = list.find(p => normalizeUrl(postUrl(p)) === target);
    if (hit) return hit;
  }
  // 2) Shortcode / videoId (última parte del path).
  if (targetTail) {
    const hit = list.find(p => {
      const u = normalizeUrl(postUrl(p));
      if (!u) return false;
      const tail = urlTail(u);
      return tail === targetTail;
    });
    if (hit) return hit;
  }
  // 3) platform_post_id contra los ids que devuelve Metricool (postId,
  // reelId, videoId, mediaId, activityId, id).
  if (pid) {
    const hit = list.find(p => {
      const id = postId(p);
      if (!id) return false;
      return id === pid || id.includes(pid) || pid.includes(id);
    });
    if (hit) return hit;
  }
  // 4) Match por id numérico largo (≥15 dígitos) presente en el URL del
  // item vs en el postId/URL de Metricool. Útil cuando el usuario registró
  // el link "feed/update/urn:li:share:{ID}" de LinkedIn directo.
  const targetIds = [...longIdsIn(item?.published_url), ...longIdsIn(pid)];
  if (targetIds.length > 0) {
    const targetSet = new Set(targetIds);
    const hit = list.find(p => {
      const pool = [...longIdsIn(postId(p)), ...longIdsIn(postUrl(p))];
      return pool.some(x => targetSet.has(x));
    });
    if (hit) return hit;
  }
  return null;
}

// ── Mapping a nuestro contrato ─────────────────────────────────────────────

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }

function mapPost(post, network) {
  if (!post || typeof post !== 'object') return [];

  // Nombres reales confirmados con la API:
  //  IG Reel:   likes, comments, interactions, engagement, views, reach,
  //             saved, shares, impressions, impressionsTotal, videoViews
  //  IG Post:   likes, comments, shares, interactions, engagement, reach,
  //             saved, impressions, impressionsTotal, views
  //  LinkedIn:  clicks, comments, likes, shares, impressions,
  //             uniqueImpressions, engagement, videoViews, viewers
  //  TikTok:    likeCount, commentCount, shareCount, viewCount, engagement,
  //             duration
  const reach = num(post.reach ?? post.uniqueImpressions);
  const impressions = num(post.impressions ?? post.impressionsTotal);
  // "views" solo tiene sentido en video (tiktok/reels).
  const views = num(post.viewCount ?? post.videoViews ?? post.views);

  const likes = num(post.likes ?? post.likeCount);
  const comments = num(post.comments ?? post.commentCount);
  const shares = num(post.shares ?? post.shareCount ?? post.reposts);
  const saves = num(post.saved ?? post.saves ?? post.savedCount);
  const engagementRaw = num(post.engagement ?? post.engagementRate);
  const interactions = num(post.interactions ?? post.totalInteractions);

  // engagement: Metricool lo devuelve ya como %. LinkedIn: 1.81 = 1.81%
  // (verificado con curl: likes 5 / impressions 276 = 1.81%). IG a veces lo
  // devuelve como número entre 0-100. Si viene como fracción ≤1 y >0, lo
  // consideramos fracción y lo multiplicamos por 100.
  let engagementPct = null;
  if (engagementRaw != null) {
    engagementPct = engagementRaw > 0 && engagementRaw <= 1 ? engagementRaw * 100 : engagementRaw;
  } else {
    const num_er = (likes || 0) + (comments || 0) + (shares || 0) + (saves || 0);
    const den_er = reach || impressions || views;
    if (den_er && den_er > 0) engagementPct = (num_er / den_er) * 100;
  }

  const out = [];
  // "Alcance principal" según red — spec universo §5.4 lee reach || views ||
  // impressions en ese orden. Publicamos las 3 métricas cuando estén, así el
  // rollup escoge la mejor.
  if (reach != null) out.push({ metric: 'reach', value: reach });
  if (impressions != null) out.push({ metric: 'impressions', value: impressions });
  if (views != null && (network === 'tiktok' || network === 'instagram')) {
    out.push({ metric: 'views', value: views });
  }
  if (likes != null) out.push({ metric: 'likes', value: likes });
  if (comments != null) out.push({ metric: 'comments', value: comments });
  if (shares != null) out.push({ metric: 'shares', value: shares });
  if (saves != null) out.push({ metric: 'saves', value: saves });
  if (engagementPct != null) {
    out.push({ metric: 'engagement_rate', value: Math.round(engagementPct * 100) / 100 });
  }
  if (out.length === 0 && interactions != null) {
    out.push({ metric: 'likes', value: interactions });
  }
  return out;
}

// ── API pública ────────────────────────────────────────────────────────────

export async function fetchMetrics(item) {
  const cred = envCredentials();
  if (!cred) {
    if (process.env.METRICOOL_DEBUG) {
      console.warn('[metricool] credenciales incompletas — devolviendo []');
    }
    return [];
  }
  const network = (item?.platform || '').toLowerCase();
  if (!platforms.includes(network)) return [];
  if (!item?.published_url && !item?.platform_post_id) return [];

  const to = new Date();
  const from = new Date(to.getTime() - windowDays() * 24 * 3600 * 1000);
  const fromISO = isoLocal(from);
  const toISO = isoLocal(to);

  // Recorre los endpoints candidatos y devuelve las métricas del primer match.
  for (const ep of endpointsFor(item)) {
    const list = await fetchList(ep, cred, { fromISO, toISO });
    const match = findMatch(list, item);
    if (match) {
      if (process.env.METRICOOL_DEBUG) {
        console.log(`[metricool] MATCH ${ep} → ${item.title || item.id} :: ${postUrl(match)}`);
      }
      return mapPost(match, network);
    }
  }
  if (process.env.METRICOOL_DEBUG) {
    console.log(`[metricool] NO MATCH · ${network} · ${item.published_url || item.id}`);
  }
  return [];
}
