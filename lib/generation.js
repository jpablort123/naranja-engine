import { supabase as db } from './supabase';

// ═══ PROTOCOL LOADING ═══
// Carga el protocolo base desde Supabase + inyecta los aprendizajes aprobados
// en la sección [APRENDIZAJES] como bullets. Mismo mecanismo para podcast y newsletter.
export async function loadProtocol(slug) {
  const { data } = await db.from('protocolos').select('id, content').eq('slug', slug).single();
  if (!data) return '';
  const { data: learnings } = await db.from('learnings')
    .select('feedback, proposed_change')
    .eq('target_protocol_id', data.id)
    .eq('status', 'approved');
  let content = data.content;
  if (learnings?.length > 0) {
    const bullets = learnings.map(l => `- ${l.proposed_change || l.feedback}`).join('\n');
    content = content.replace(
      /\[APRENDIZAJES\]\n_Sección vacía.*?_/,
      `[APRENDIZAJES]\n${bullets}`
    );
  }
  return content;
}

// Concatena varios protocolos (por slug) en un único system prompt.
export async function buildSystem(slugs) {
  const protocols = await Promise.all(slugs.map(loadProtocol));
  return protocols.filter(Boolean).join('\n\n---\n\n');
}

// ═══ CLAUDE API CALL ═══
export async function callClaude(prompt, system, maxTokens = 8192) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const raw = await r.text();
  let d;
  try { d = JSON.parse(raw); }
  catch { throw new Error(`Anthropic respondió algo que no es JSON (HTTP ${r.status}): ${raw.slice(0, 200)}`); }
  if (d.error) throw new Error(d.error.message);
  // Si el modelo llega al tope de tokens, el JSON queda cortado a la mitad y
  // JSON.parse falla con un error críptico. Mejor decirlo explícito.
  if (d.stop_reason === 'max_tokens') {
    throw new Error(`La respuesta del modelo se cortó al llegar al tope de ${maxTokens} tokens (JSON incompleto).`);
  }
  const t = (d.content?.[0]?.text || "").replace(/```json\n?|```\n?/g, "").trim();
  try { return JSON.parse(t); }
  catch (e) {
    // Rescate: a veces el modelo agrega una línea antes o después del JSON.
    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a !== -1 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch {} }
    throw new Error(`El modelo devolvió JSON inválido: ${e.message}`);
  }
}

// Los episodios importados desde Descript guardaron el transcript envuelto como
// {"raw":"..."} (comillas y saltos de línea escapados). Lo desenvolvemos antes de
// mandarlo al modelo para que las citas textuales salgan limpias.
export function cleanTranscript(tx) {
  if (typeof tx !== 'string') return '';
  const s = tx.trimStart();
  if (s.startsWith('{"raw":')) {
    try {
      const o = JSON.parse(s);
      if (typeof o?.raw === 'string') return o.raw;
    } catch {}
  }
  return tx;
}
