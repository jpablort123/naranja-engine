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
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  const t = (d.content?.[0]?.text || "").replace(/```json\n?|```\n?/g, "").trim();
  return JSON.parse(t);
}
