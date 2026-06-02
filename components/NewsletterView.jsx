"use client";
import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Loader2, Sparkles, CheckCircle2, Copy, Layers } from "lucide-react";
import {
  O, OL, OB, GR, GL, MU,
  api, CopyBtn, BankBtn, Skel, Badge,
  EditableText, AIEditBtn, EditModal,
  SendToParrillaBtn,
} from "@/components/ui";

const SLIDE_TYPES = {
  portada:    { label: "Portada",    bg: "#FFF7ED", c: "#9A3412", border: "#FED7AA" },
  desarrollo: { label: "Desarrollo", bg: "#F4F4F5", c: "#52525B", border: "#E7E5E4" },
  cta:        { label: "CTA",        bg: "#F0FDF4", c: "#15803D", border: "#BBF7D0" },
};

async function generate(body) {
  return api("/api/generate", { method: "POST", body: JSON.stringify(body) });
}

// ═══ CARRUSEL BLOCK ═══
function CarruselBlock({ idx, carrusel, onUpdateSlide, onUpdateCarrusel, onLearn }) {
  const [editM, setEditM] = useState(null);

  const fullText = (carrusel.slides || [])
    .map((s) => `Slide ${s.n} (${(SLIDE_TYPES[s.tipo] || {}).label || s.tipo}):\n${s.texto}`)
    .join("\n\n");

  const applyAiEdit = async (fb) => {
    const slidesText = (carrusel.slides || [])
      .map((s) => `Slide ${s.n} (${s.tipo}): ${s.texto}`)
      .join("\n");
    const res = await generate({
      prompt: `Carrusel actual:
${slidesText}

Feedback de JP: ${fb}

Regenerá el carrusel aplicando el feedback. Reglas estrictas:
- slides[0] siempre tipo "portada"
- última slide siempre tipo "cta"
- intermedias tipo "desarrollo"
- numerar slides en orden con "n": 1, 2, 3, ... N
- mantener "titulo" y "patron_gancho" originales salvo que el feedback los contradiga

JSON: { "titulo": "${(carrusel.titulo || "").replace(/"/g, '\\"')}", "patron_gancho": "${carrusel.patron_gancho || "dato_contundente"}", "slides": [{ "n": 1, "tipo": "portada|desarrollo|cta", "texto": "..." }] }`,
      protocols: ["adn", "carrusel"],
    });
    if (res.result?.slides) onUpdateCarrusel(idx, res.result);
    onLearn("carrusel", fb);
  };

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 mb-4">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-stone-400">#{idx + 1}</span>
          <p className="text-sm font-semibold text-stone-800 truncate">{carrusel.titulo || `Carrusel ${idx + 1}`}</p>
          {carrusel.patron_gancho && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">{carrusel.patron_gancho}</span>
          )}
          <span className="text-[11px] text-stone-400">{carrusel.slides?.length || 0} slides</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <AIEditBtn onClick={() => setEditM({ title: `Carrusel #${idx + 1}`, content: fullText })} />
          <CopyBtn text={fullText} />
        </div>
      </div>

      <div className="space-y-2">
        {(carrusel.slides || []).map((slide, si) => {
          const tStyle = SLIDE_TYPES[slide.tipo] || SLIDE_TYPES.desarrollo;
          return (
            <div key={si} className="rounded-xl border p-3" style={{ borderColor: tStyle.border, background: "white" }}>
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-1 shrink-0 w-12">
                  <span className="text-xs font-bold text-stone-500">{slide.n || si + 1}</span>
                  <span
                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider whitespace-nowrap"
                    style={{ background: tStyle.bg, color: tStyle.c }}
                  >
                    {tStyle.label}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <EditableText
                    text={slide.texto}
                    onSave={(v) => onUpdateSlide(idx, si, v)}
                    multiline
                  />
                </div>
                <CopyBtn text={slide.texto} />
              </div>
            </div>
          );
        })}
      </div>

      {editM && (
        <EditModal
          title={editM.title}
          content={editM.content}
          onClose={() => setEditM(null)}
          onApply={async (fb) => { await applyAiEdit(fb); setEditM(null); }}
        />
      )}
    </div>
  );
}

// ═══ NEWSLETTER VIEW ═══
export default function NewsletterView({ nl, phase, onUpdate, onLearn, onGenerateRepurpose }) {
  const [ideaComments, setIdeaComments] = useState({});
  const [editM, setEditM] = useState(null);
  const [genRP, setGenRP] = useState(false);

  const ideas = nl.ideas || [];
  const sel = nl.selected_ideas || [];
  const hasSel = sel.length > 0;
  const rp = nl.repurpose_content;
  const hasRP = !!rp;
  const loadingIdeas = phase === "ideas";

  const toggleIdea = (i) => {
    const n = sel.includes(i) ? sel.filter((x) => x !== i) : [...sel, i];
    onUpdate({ selected_ideas: n });
  };

  const selectedIdeas = sel.map((i) => ideas[i]).filter(Boolean);

  const handleGenerateRepurpose = async () => {
    setGenRP(true);
    await onGenerateRepurpose(selectedIdeas);
    setGenRP(false);
  };

  // ═══ AI EDIT HELPERS ═══
  const applyReelFb = async (rIdx, fb) => {
    const reel = rp.reels[rIdx];
    const res = await generate({
      prompt: `Guión actual del reel:
"${reel.guion}"

Feedback de JP: ${fb}

Regenerá el guión aplicando el feedback.
JSON: { "titulo": "${(reel.titulo || "").replace(/"/g, '\\"')}", "guion": "guión regenerado de 200-230 palabras", "tipo_gancho": "${reel.tipo_gancho || "dato"}", "formato": "${reel.formato || "deep_dive"}" }`,
      protocols: ["adn", "reels"],
    });
    if (res.result?.guion) {
      const next = [...rp.reels];
      next[rIdx] = res.result;
      onUpdate({ repurpose_content: { ...rp, reels: next } });
    }
    onLearn("reels", fb);
  };

  const applyLinkedinFb = async (pIdx, fb) => {
    const post = rp.linkedin[pIdx];
    const res = await generate({
      prompt: `Post de LinkedIn actual:
Hook: ${post.hook}
Cuerpo: ${post.cuerpo}

Feedback de JP: ${fb}

Regenerá el post aplicando el feedback.
JSON: { "hook": "primeras 2 líneas antes del 'ver más'", "cuerpo": "desarrollo completo 800-1200 chars", "patron_hook": "${post.patron_hook || "reframe"}" }`,
      protocols: ["adn", "linkedin"],
    });
    if (res.result?.cuerpo) {
      const next = [...rp.linkedin];
      next[pIdx] = res.result;
      onUpdate({ repurpose_content: { ...rp, linkedin: next } });
    }
    onLearn("linkedin", fb);
  };

  const updateCarruselSlide = (cIdx, sIdx, text) => {
    const next = [...rp.carrusel];
    const slides = [...(next[cIdx].slides || [])];
    slides[sIdx] = { ...slides[sIdx], texto: text };
    next[cIdx] = { ...next[cIdx], slides };
    onUpdate({ repurpose_content: { ...rp, carrusel: next } });
  };

  const updateCarrusel = (cIdx, full) => {
    const next = [...rp.carrusel];
    next[cIdx] = full;
    onUpdate({ repurpose_content: { ...rp, carrusel: next } });
  };

  // ═══ PIEZAS PARA PARRILLA ═══
  const parrillaPieces = hasRP
    ? [
        ...((rp.reels) || []).map((reel, i) => ({
          key: `reel-${i}`,
          label_prefix: `🎬 Reel — `,
          title: reel.titulo || `Reel #${i + 1}`,
          content: reel.guion || "",
          content_type: "reel",
          preview: reel.guion,
        })),
        ...((rp.carrusel) || []).map((c, i) => ({
          key: `carrusel-${i}`,
          label_prefix: `🖼️ Carrusel — `,
          title: c.titulo || `Carrusel #${i + 1}`,
          content: (c.slides || []).map((s) => `Slide ${s.n} (${s.tipo}):\n${s.texto}`).join("\n\n"),
          content_type: "carrousel",
          preview: (c.slides || [])[0]?.texto,
        })),
        ...((rp.linkedin) || []).map((post, i) => ({
          key: `linkedin-${i}`,
          label_prefix: `💼 LinkedIn — `,
          title: (post.hook || post.cuerpo || "").split("\n")[0].slice(0, 80) || `LinkedIn #${i + 1}`,
          content: post.cuerpo || "",
          content_type: "linkedin",
          preview: post.cuerpo,
        })),
      ]
    : [];

  return (
    <div>
      {/* ═══ IDEAS VALIDABLES ═══ */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 mb-4">
        <h3 className="font-semibold text-[15px] text-stone-800 mb-1 flex items-center gap-2">💡 Ideas validables</h3>
        <p className="text-xs text-stone-400 mb-4">Selecciona las que querés convertir en piezas (reel, carrusel, LinkedIn).</p>

        {loadingIdeas || ideas.length === 0 ? (
          <Skel n={6} />
        ) : (
          <>
            <div className="space-y-1.5 mb-4">
              {ideas.map((idea, i) => (
                <div
                  key={i}
                  className="rounded-xl border transition-all"
                  style={{ borderColor: sel.includes(i) ? O : "#E7E5E4", background: sel.includes(i) ? OL : "white" }}
                >
                  <div className="flex items-start gap-3 p-3 cursor-pointer" onClick={() => toggleIdea(i)}>
                    <div
                      className="mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0"
                      style={{ borderColor: sel.includes(i) ? O : "#D6D3D1", background: sel.includes(i) ? O : "white" }}
                    >
                      {sel.includes(i) && <Check size={12} color="white" strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="text-sm font-medium text-stone-800">{idea.titulo}</p>
                        {idea.tipo && <Badge label={idea.tipo} />}
                      </div>
                      <p className="text-xs text-stone-500">{idea.descripcion}</p>
                    </div>
                    <BankBtn
                      payload={{
                        title: idea.titulo,
                        description: idea.descripcion,
                        category: "undecided",
                        temperature: "cold",
                        angle: idea.tipo,
                        origin_type: "newsletter",
                        origin_id: nl.id,
                        origin_url: nl.name,
                      }}
                    />
                    <span className="text-xs font-medium text-stone-300 shrink-0">{i + 1}</span>
                  </div>
                  {sel.includes(i) && (
                    <div className="px-3 pb-3 ml-8">
                      <input
                        value={ideaComments[i] || ""}
                        onChange={(e) => setIdeaComments({ ...ideaComments, [i]: e.target.value })}
                        placeholder="Comentario opcional sobre esta idea..."
                        className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-orange-300"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!hasRP && (
              <button
                onClick={handleGenerateRepurpose}
                disabled={!hasSel || genRP || phase === "repurpose"}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90"
                style={{ background: hasSel ? O : "#D6D3D1", cursor: hasSel ? "pointer" : "not-allowed" }}
              >
                {genRP || phase === "repurpose" ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Generando reel + carrusel + LinkedIn...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Generar repurpose con {sel.length} idea{sel.length === 1 ? "" : "s"}
                  </>
                )}
              </button>
            )}

            {hasRP && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium" style={{ background: GL, color: GR }}>
                <CheckCircle2 size={14} /> Repurpose generado con {sel.length} idea{sel.length === 1 ? "" : "s"}
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ REPURPOSE ═══ */}
      {hasRP && (
        <>
          {parrillaPieces.length > 0 && (
            <div className="mb-4 flex justify-end">
              <SendToParrillaBtn
                pieces={parrillaPieces}
                source={{ id: nl.id, name: nl.name, origin_type: "newsletter", label_prefix: "NL. " }}
              />
            </div>
          )}

          {/* REELS */}
          {rp.reels?.length > 0 && (
            <div className="rounded-xl border border-stone-200 bg-white p-5 mb-4">
              <h3 className="font-semibold text-[15px] text-stone-800 mb-3 flex items-center gap-2">🎥 Reel</h3>
              <div className="space-y-3">
                {rp.reels.map((reel, i) => (
                  <div key={i} className="rounded-xl border border-stone-200 p-4">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="text-xs font-bold text-stone-400">#{i + 1}</span>
                        <p className="text-sm font-medium text-stone-800">{reel.titulo}</p>
                        {reel.tipo_gancho && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">{reel.tipo_gancho}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <AIEditBtn onClick={() => setEditM({ kind: "reel", idx: i, title: `Reel #${i + 1}`, content: reel.guion })} />
                        <CopyBtn text={reel.guion} />
                      </div>
                    </div>
                    <EditableText
                      text={reel.guion}
                      onSave={(v) => {
                        const next = [...rp.reels];
                        next[i] = { ...next[i], guion: v };
                        onUpdate({ repurpose_content: { ...rp, reels: next } });
                      }}
                      multiline
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CARRUSELES */}
          {rp.carrusel?.length > 0 && (
            <div className="rounded-xl border border-stone-200 bg-white p-5 mb-4">
              <h3 className="font-semibold text-[15px] text-stone-800 mb-1 flex items-center gap-2">
                <Layers size={16} color={O} /> Carrusel de Instagram
              </h3>
              <p className="text-xs text-stone-400 mb-3">Una pieza por idea, 8-10 slides cada una. Portada → Desarrollo → CTA.</p>
              <div>
                {rp.carrusel.map((c, i) => (
                  <CarruselBlock
                    key={i}
                    idx={i}
                    carrusel={c}
                    onUpdateSlide={updateCarruselSlide}
                    onUpdateCarrusel={updateCarrusel}
                    onLearn={onLearn}
                  />
                ))}
              </div>
            </div>
          )}

          {/* LINKEDIN */}
          {rp.linkedin?.length > 0 && (
            <div className="rounded-xl border border-stone-200 bg-white p-5 mb-4">
              <h3 className="font-semibold text-[15px] text-stone-800 mb-3 flex items-center gap-2">📝 LinkedIn</h3>
              <div className="space-y-3">
                {rp.linkedin.map((post, i) => (
                  <div key={i} className="rounded-xl border border-stone-200 p-4">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-stone-400">#{i + 1}</span>
                        {post.patron_hook && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{post.patron_hook}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <AIEditBtn onClick={() => setEditM({ kind: "linkedin", idx: i, title: `LinkedIn #${i + 1}`, content: post.cuerpo })} />
                        <CopyBtn text={post.cuerpo} />
                      </div>
                    </div>
                    <EditableText
                      text={post.cuerpo}
                      onSave={(v) => {
                        const next = [...rp.linkedin];
                        next[i] = { ...next[i], cuerpo: v };
                        onUpdate({ repurpose_content: { ...rp, linkedin: next } });
                      }}
                      multiline
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => onUpdate({ repurpose_content: null })}
            className="text-sm text-stone-400 hover:text-stone-600 mb-4"
          >
            ← Regenerar repurpose
          </button>
        </>
      )}

      {editM?.kind === "reel" && (
        <EditModal
          title={editM.title}
          content={editM.content}
          onClose={() => setEditM(null)}
          onApply={async (fb) => { await applyReelFb(editM.idx, fb); setEditM(null); }}
        />
      )}
      {editM?.kind === "linkedin" && (
        <EditModal
          title={editM.title}
          content={editM.content}
          onClose={() => setEditM(null)}
          onApply={async (fb) => { await applyLinkedinFb(editM.idx, fb); setEditM(null); }}
        />
      )}
    </div>
  );
}
