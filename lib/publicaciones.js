// ═══ Helpers del Sprint Publicación ═══
// Todo el server-side de la vista "Publicaciones" comparte:
//   - Normalización de URL para dedupe (mismo criterio que lib/metrics/metricool.js).
//   - Deducción del content_type según plataforma para hermanas de un grupo.
//   - Creación de una fila de learning cuando se descarta una pieza.

import { createClient } from '@supabase/supabase-js';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Normaliza URL para comparar/dedupe: quita protocolo, `www.`, trailing slash,
// query, fragment; devuelve host+path en minúsculas. Mismo criterio que el
// provider de Metricool (lib/metrics/metricool.js) — así la pieza registrada
// aquí es la misma que Metricool matchea al sincronizar métricas.
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

// spec §2 — el ángulo/madre/tipo se heredan. El content_type de la HERMANA
// (cuando la PM pega varias plataformas) se deriva del content_type original
// solo si la plataforma es coherente. Ej: si la propuesta es 'reel' y la PM
// pega un link de TikTok, el hermana es 'reel' igual — el mismo video en otra
// red. Si pega un link de LinkedIn, es 'linkedin' (post distinto).
export function deriveContentTypeForSibling(originalContentType, siblingPlatform) {
  const p = (siblingPlatform || '').toLowerCase();
  const t = (originalContentType || '').toLowerCase();
  if (p === 'linkedin') return 'linkedin';
  if (p === 'youtube' && t === 'episodio') return 'episodio';
  // Videos cortos van a IG/TikTok/YT-Shorts como 'reel' (mismo contenido en varias redes)
  if (['instagram', 'tiktok', 'youtube'].includes(p) && ['reel', 'corto', 'mediano'].includes(t)) return t;
  // Fallback: mantener el original
  return t || 'reel';
}

// Dedupe por URL. Devuelve la pieza existente si ya hay una publicada con
// esa URL normalizada dentro del producto, o null.
export async function findByUrl(url, product_id) {
  const norm = normalizeUrl(url);
  if (!norm) return null;
  const { data } = await db
    .from('published_items')
    .select('*')
    .eq('product_id', product_id)
    .not('published_url', 'is', null);
  return (data || []).find(p => normalizeUrl(p.published_url) === norm) || null;
}

// Crea un learning draft cuando se descarta una pieza con razón.
// Comparte el mismo shape que el flujo del Universo (v0.8).
export async function createLearningForDiscard(item) {
  if (!item?.discard_reason) return;
  const learn = {
    episode_id: item.origin_type === 'episode' ? item.origin_id : null,
    newsletter_id: item.origin_type === 'newsletter' ? item.origin_id : null,
    section: 'descarte',
    original_content: item.title,
    feedback: item.discard_reason,
    proposed_change: null,
    target_protocol_name: 'general',
    status: 'draft',
  };
  await db.from('learnings').insert(learn);
}

// Semilla determinística de origin_ref para el puente producción → propuesta
// (spec Módulo A). El backend usa esto para dedupe idempotente: mandar dos
// veces el mismo ítem NO crea dos propuestas.
export function originRefFor({ episode_id, source, ref }) {
  return `ep:${episode_id}/${source}/${ref}`;
}

// El content_type que va en la propuesta según el tipo de ítem de producción.
export function contentTypeFromSource(source, hintPlatform) {
  const p = (hintPlatform || '').toLowerCase();
  if (source === 'mediano') return 'mediano';
  if (source === 'linkedin') return 'linkedin';
  if (source === 'carrusel') return 'carrusel';
  if (source === 'intro') return 'reel';
  if (source === 'reel') return 'reel';
  if (source === 'minado') return 'reel'; // clips de minado → reel por default
  return 'reel';
}

// Plataforma default para una propuesta sin URL. Se usa para propagar el
// campo NOT NULL de `platform` — la PM lo cambia al publicar.
export function defaultPlatformFor(source) {
  if (source === 'linkedin') return 'linkedin';
  if (source === 'carrusel') return 'instagram';
  if (source === 'mediano') return 'youtube';
  return 'instagram';
}
