// ═══ DESCRIPT API CLIENT ═══
// Wrapper server-side de la API REST de Descript v1.
// Regla dura (SPEC §3.5): Descript rechaza un segundo POST /jobs/agent
// sobre el mismo project si hay uno corriendo. Toda cola se serializa por project.

const BASE = 'https://descriptapi.com/v1';

function token() {
  const t = process.env.DESCRIPT_API_TOKEN;
  if (!t) throw new Error('DESCRIPT_API_TOKEN no configurado');
  return t;
}

async function req(path, opts = {}) {
  const r = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Authorization': `Bearer ${token()}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const txt = await r.text();
  let body;
  try { body = txt ? JSON.parse(txt) : {}; } catch { body = { raw: txt }; }
  if (!r.ok) {
    const err = new Error(body?.error?.message || body?.message || body?.raw || `Descript ${r.status}`);
    err.status = r.status;
    err.body = body;
    throw err;
  }
  return body;
}

// ── Extrae { project_id, composition_id } de un link tipo
//    https://web.descript.com/{project_id}/{short_id}  o
//    https://web.descript.com/{project_id}
// Devuelve { project_id, composition_id } (composition_id puede ser null).
export function parseDescriptLink(link) {
  if (!link || typeof link !== 'string') return { project_id: null, composition_id: null };
  const s = link.trim();
  // UUID: 8-4-4-4-12 hex
  const uuidRe = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  const matches = s.match(uuidRe) || [];
  if (matches.length === 0) {
    // Puede ser solo un ID sin URL — probar cadena entera
    return { project_id: s, composition_id: null };
  }
  return {
    project_id: matches[0] || null,
    composition_id: matches[1] || null,
  };
}

// ── GET /projects
export async function listProjects() {
  return req('/projects');
}

// ── GET /projects/{id}
export async function getProject(projectId) {
  return req(`/projects/${encodeURIComponent(projectId)}`);
}

// ── POST /export/transcript
// format: 'srt' | 'txt'
export async function exportTranscript({ project_id, format = 'srt' }) {
  return req('/export/transcript', {
    method: 'POST',
    body: JSON.stringify({
      project_id,
      format,
      include_speaker_labels: 'changes',
      timecodes: { on_speakers: true, on_paragraphs: true },
    }),
  });
}

// ── POST /jobs/agent — crea un job. Devuelve { job_id, ... } de inmediato.
// El corte corre en segundo plano; usar webhook o polling para el estado.
export async function createAgentJob({ project_id, prompt, callback_url }) {
  const body = { project_id, prompt };
  if (callback_url) body.callback_url = callback_url;
  return req('/jobs/agent', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ── GET /jobs/{id}
export async function getJob(jobId) {
  return req(`/jobs/${encodeURIComponent(jobId)}`);
}

// ── Plantilla de prompt validada (SPEC §3.4)
export function buildCutPrompt({
  nombre_composicion_madre,
  nombre_clip,
  frase_inicio_verbatim,
  frase_cierre_verbatim,
  rango_inicio,
  rango_fin,
}) {
  const rango = rango_inicio && rango_fin ? `roughly ${rango_inicio} to ${rango_fin}` : 'somewhere inside the episode';
  return `Create a NEW composition in this project. Do NOT modify or trim the existing
full-episode composition named "${nombre_composicion_madre}" — leave it intact.

Name the new composition: "${nombre_clip}"

It should contain ONLY the continuous segment of the main episode video
("${nombre_composicion_madre}") that:
- STARTS where the speaker says: "${frase_inicio_verbatim}"
- ENDS where the speaker says: "${frase_cierre_verbatim}"

This corresponds to ${rango}. IMPORTANT: err on the side of
leaving the clip a little loose — start a second or two BEFORE the start phrase
and end a second or two AFTER the end phrase, so no word gets clipped. A human
editor will tighten it later. Keep video and audio intact, no other edits
(no filler-word removal, no studio sound). Just isolate that one continuous
section into its own new composition.`;
}

// ── Slug seguro para nombres de composición (ASCII, kebab, corto)
export function slugify(input, maxLen = 40) {
  return (input || '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, maxLen)
    .replace(/^-|-$/g, '');
}

// ── Nombre de composición según convención SPEC §3.6
// clip_type: 'micro' | 'mediano'
export function composicionName({ clip_type, episode_number, slug }) {
  const prefix = clip_type === 'mediano' ? 'MEDIANO' : 'MICRO';
  const n = episode_number || 'X';
  const s = slugify(slug) || 'sin-titulo';
  return `${prefix}_EP${n}_${s}`;
}
