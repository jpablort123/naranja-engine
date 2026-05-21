"use client";
import { useState, useEffect } from "react";
import { Lightbulb, Plus, Loader2, X, Copy, Check, Sparkles, CheckCircle2 } from "lucide-react";

const O = "#EA580C", OL = "#FFF7ED", OB = "#FED7AA", GR = "#16A34A", GL = "#F0FDF4", MU = "#78716A";

const COLUMNS = [
  { key: "newsletter", label: "Newsletter", emoji: "📨", hint: "Ideas largas para escribir" },
  { key: "contenido",  label: "Contenido",  emoji: "📱", hint: "LinkedIn + Reel" },
  { key: "undecided",  label: "Sin definir", emoji: "💭", hint: "Por decidir formato" },
];

const TEMPERATURES = ["spotlight", "hot", "warm", "cold"];
const TEMP_META = {
  spotlight: { emoji: "💡", label: "Quiere ver la luz", order: 0 },
  hot:       { emoji: "🔥", label: "Caliente",          order: 1 },
  warm:      { emoji: "🌤️", label: "Tibio",             order: 2 },
  cold:      { emoji: "❄️", label: "Frío",              order: 3 },
};
const nextTemp = (t) => TEMPERATURES[(TEMPERATURES.indexOf(t || "cold") + 1) % TEMPERATURES.length];

const FORMAT_OPTIONS = [
  { key: "linkedin",   label: "LinkedIn" },
  { key: "reel",       label: "Reel" },
  { key: "newsletter", label: "Newsletter" },
];
const GENERABLE_FORMATS = ["linkedin", "reel"];

const ANGLE_TYPES = {
  contraste:            { bg: "#EFF6FF", c: "#1E40AF", label: "Contraste" },
  dato_absurdo:         { bg: "#FDF2F8", c: "#BE185D", label: "Dato absurdo" },
  dato_duro:            { bg: "#EFF6FF", c: "#1E40AF", label: "Dato duro" },
  secreto:              { bg: "#F5F3FF", c: "#6D28D9", label: "Secreto" },
  cliche_no_practicado: { bg: "#FFFBEB", c: "#B45309", label: "Cliché no practicado" },
  contrarian:           { bg: "#FFF1F2", c: "#BE123C", label: "Contrarian" },
  mecanismo_invisible:  { bg: "#F0FDF4", c: "#15803D", label: "Mecanismo invisible" },
  cambio_paradigma:     { bg: "#ECFEFF", c: "#0E7490", label: "Cambio de paradigma" },
  tension_real:         { bg: "#FFFBEB", c: "#B45309", label: "Tensión real" },
  tendencia:            { bg: "#ECFEFF", c: "#0E7490", label: "Tendencia" },
  barrera_emocional:    { bg: "#FEF2F2", c: "#DC2626", label: "Barrera emocional" },
  historia_personal:    { bg: "#F5F3FF", c: "#6D28D9", label: "Historia personal" },
};

function InlineTitle({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  useEffect(() => setVal(value), [value]);

  if (!editing) return (
    <p onClick={(e) => { e.stopPropagation(); setEditing(true); }}
       className="text-sm font-medium text-stone-800 cursor-text leading-snug hover:bg-stone-50 -mx-1 px-1 rounded">
      {value}
    </p>
  );

  const commit = () => {
    const trimmed = val.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    setEditing(false);
  };

  return (
    <input
      autoFocus
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={commit}
      onClick={e => e.stopPropagation()}
      onKeyDown={e => {
        if (e.key === "Enter") { e.preventDefault(); commit(); }
        if (e.key === "Escape") { setVal(value); setEditing(false); }
      }}
      className="w-full text-sm font-medium text-stone-800 border border-orange-300 rounded px-1 -mx-1 focus:outline-none focus:ring-1 focus:ring-orange-200"
    />
  );
}

function CopyBtn({ text, size = 14 }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); }}
            className="p-1.5 rounded-lg hover:bg-stone-100 shrink-0" title="Copiar">
      {ok ? <Check size={size} color={GR} /> : <Copy size={size} color={MU} />}
    </button>
  );
}

function AIEditButton({ onClick }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg border hover:bg-orange-50"
            style={{ color: O, borderColor: OB }}>
      <Sparkles size={11} /> Editar con IA
    </button>
  );
}

function EditAIModal({ title, content, onClose, onApply }) {
  const [fb, setFb] = useState("");
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h3 className="font-semibold text-stone-800">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100"><X size={18} color={MU} /></button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 p-6 overflow-y-auto border-r border-stone-200">
            <p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mb-3">Contenido actual</p>
            <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">{content}</p>
          </div>
          <div className="flex-1 p-6 flex flex-col">
            <p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mb-3">Tu feedback</p>
            <textarea value={fb} onChange={e => setFb(e.target.value)} placeholder="Escribe qué cambiarías y por qué..." className="flex-1 w-full text-sm border border-stone-200 rounded-xl p-4 resize-none focus:outline-none focus:border-orange-300 mb-4" />
            {done ? (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: GL, color: GR }}><CheckCircle2 size={16} /> Cambios aplicados</div>
            ) : (
              <button onClick={async () => { if (!fb.trim()) return; setApplying(true); await onApply(fb); setApplying(false); setDone(true); }}
                      className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90"
                      style={{ background: fb.trim() ? O : "#D6D3D1", cursor: fb.trim() ? "pointer" : "not-allowed" }}>
                {applying ? <><Loader2 size={16} className="animate-spin" /> Aplicando...</> : <><Sparkles size={16} /> Editar con IA</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NewIdeaModal({ onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("undecided");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    await onCreate({ title: title.trim(), description: description.trim() || null, category });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h3 className="font-semibold text-stone-800">Nueva idea</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100"><X size={18} color={MU} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-stone-600 block mb-1.5">Título</label>
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && title.trim()) submit(); }} placeholder="¿De qué se trata la idea?" className="w-full px-4 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-orange-300" />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-600 block mb-1.5">Descripción <span className="text-stone-400 font-normal">(opcional)</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Un párrafo breve para vos mismo..." className="w-full px-4 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-orange-300 resize-y" />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-600 block mb-1.5">Categoría</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-orange-300 bg-white">
              {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
            </select>
          </div>
          <button onClick={submit} disabled={!title.trim() || submitting} className="w-full py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 flex items-center justify-center gap-2" style={{ background: title.trim() && !submitting ? O : "#D6D3D1", cursor: title.trim() && !submitting ? "pointer" : "not-allowed" }}>
            {submitting ? <><Loader2 size={14} className="animate-spin" /> Creando...</> : "Crear idea"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MergeModal({ source, target, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h3 className="font-semibold text-stone-800 mb-2">¿Fusionar estas ideas?</h3>
        <p className="text-sm text-stone-500 mb-4 leading-relaxed">La idea destino absorberá descripción, notas y formatos. La fuente queda archivada.</p>
        <div className="space-y-2 mb-5">
          <div className="rounded-xl border border-stone-200 p-3 bg-stone-50">
            <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-1 font-medium">Fuente (se archiva)</p>
            <p className="text-sm font-medium text-stone-700">{source.title}</p>
          </div>
          <div className="flex justify-center text-stone-300">↓</div>
          <div className="rounded-xl border-2 p-3" style={{ borderColor: O, background: OL }}>
            <p className="text-[10px] uppercase tracking-widest font-medium mb-1" style={{ color: O }}>Destino (absorbe)</p>
            <p className="text-sm font-medium text-stone-800">{target.title}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90" style={{ background: O }}>Fusionar</button>
        </div>
      </div>
    </div>
  );
}

function GeneratedBox({ format, content, onCopy, onEdit }) {
  const FORMAT_META = {
    linkedin: { emoji: "📝", label: "LinkedIn", body: content?.cuerpo, badgeKey: "patron_hook", badgeBg: "#EFF6FF", badgeC: "#1E40AF" },
    reel:     { emoji: "🎥", label: "Reel",     body: content?.guion,  badgeKey: "tipo_gancho", badgeBg: "#F5F3FF", badgeC: "#6D28D9" },
  }[format];
  if (!FORMAT_META || !content) return null;
  const body = FORMAT_META.body || "";
  return (
    <div className="rounded-xl border border-stone-200 p-4 bg-stone-50/40">
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-semibold text-stone-800 shrink-0">{FORMAT_META.emoji} {FORMAT_META.label}</p>
          {content[FORMAT_META.badgeKey] && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: FORMAT_META.badgeBg, color: FORMAT_META.badgeC }}>{content[FORMAT_META.badgeKey]}</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <AIEditButton onClick={onEdit} />
          <CopyBtn text={body} />
        </div>
      </div>
      {content.titulo && <p className="text-sm font-medium text-stone-800 mb-1">{content.titulo}</p>}
      {content.hook && <p className="text-sm font-medium text-stone-700 mb-1">{content.hook}</p>}
      <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{body}</p>
    </div>
  );
}

function buildIdeaContext(idea) {
  const lines = [`TÍTULO: ${idea.title}`];
  if (idea.description) lines.push(`DESCRIPCIÓN: ${idea.description}`);
  if (idea.notes) lines.push(`NOTAS:\n${idea.notes}`);
  if (idea.prompt_notes) lines.push(`PROMPT DEL AUTOR:\n${idea.prompt_notes}`);
  if (idea.angle) lines.push(`TIPO DE ÁNGULO: ${idea.angle}`);
  if (idea.origin_id) lines.push(`ORIGEN: episodio "${idea.origin_url || idea.origin_id}"`);
  return lines.join("\n");
}

const FORMAT_PROMPTS = {
  linkedin: {
    protocols: ["adn", "linkedin"],
    prompt: (ctx) => `Tengo esta idea en mi banco editorial:\n\n${ctx}\n\nGenera 1 post de LinkedIn basado en esta idea.\n\nJSON: { "hook": "primeras 2 líneas antes del ver más", "cuerpo": "desarrollo completo del post 800-1200 chars", "patron_hook": "reframe|metafora|tension|imperativo|pregunta" }`,
  },
  reel: {
    protocols: ["adn", "reels"],
    prompt: (ctx) => `Tengo esta idea en mi banco editorial:\n\n${ctx}\n\nGenera 1 guión de reel.\n\nJSON: { "titulo": "título del reel", "guion": "guión de 200-230 palabras", "tipo_gancho": "dato|afirmacion|escena|pregunta", "formato": "deep_dive|round_up|serie" }`,
  },
};

async function callGenerate(prompt, protocols) {
  const r = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, protocols }) });
  const d = await r.json();
  return d.result;
}

function IdeaModal({ idea, onClose, onUpdate }) {
  const [notes, setNotes] = useState(idea.notes || "");
  const [promptNotes, setPromptNotes] = useState(idea.prompt_notes || "");
  const [generating, setGenerating] = useState(null);
  const [editM, setEditM] = useState(null);
  const [copied, setCopied] = useState(false);

  const formats = Array.isArray(idea.formats) ? idea.formats : [];
  const targets = formats.filter(f => GENERABLE_FORMATS.includes(f));
  const gen = idea.generated_content || {};
  const angleStyle = idea.angle ? ANGLE_TYPES[idea.angle] : null;

  const saveNotes = () => { if (notes !== (idea.notes || "")) onUpdate({ notes: notes || null }); };
  const savePrompt = () => { if (promptNotes !== (idea.prompt_notes || "")) onUpdate({ prompt_notes: promptNotes || null }); };

  const generateAll = async () => {
    if (targets.length === 0) return;
    setGenerating("all");
    const ctx = buildIdeaContext({ ...idea, notes, prompt_notes: promptNotes });
    const results = await Promise.all(targets.map(async (fmt) => {
      const { prompt, protocols } = FORMAT_PROMPTS[fmt];
      const result = await callGenerate(prompt(ctx), protocols);
      return [fmt, result];
    }));
    const updates = Object.fromEntries(results.filter(([, v]) => v));
    onUpdate({ generated_content: { ...gen, ...updates } });
    setGenerating(null);
  };

  const editGenerated = async (format, feedback) => {
    const current = gen[format];
    if (!current) return;
    const { protocols } = FORMAT_PROMPTS[format];
    const ctx = buildIdeaContext({ ...idea, notes, prompt_notes: promptNotes });
    const result = await callGenerate(
      `${ctx}\n\nCONTENIDO ACTUAL:\n${JSON.stringify(current, null, 2)}\n\nFEEDBACK: ${feedback}\n\nRegenera aplicando el feedback en exactamente el mismo formato JSON.`,
      protocols
    );
    if (result) onUpdate({ generated_content: { ...gen, [format]: result } });
  };

  const copyFullContext = () => {
    const parts = [`# ${idea.title}`];
    if (idea.description) parts.push(`\n${idea.description}`);
    if (notes) parts.push(`\n## Notas\n${notes}`);
    if (promptNotes) parts.push(`\n## Prompt\n${promptNotes}`);
    if (idea.angle) parts.push(`\n**Tipo de ángulo:** ${idea.angle}`);
    if (idea.origin_id) parts.push(`\n**Origen:** episodio "${idea.origin_url || idea.origin_id}"`);
    if (gen.linkedin?.cuerpo) parts.push(`\n## LinkedIn generado\n${gen.linkedin.cuerpo}`);
    if (gen.reel?.guion) parts.push(`\n## Reel generado\n${gen.reel.titulo || ""}\n${gen.reel.guion}`);
    navigator.clipboard.writeText(parts.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[88vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <h3 className="font-semibold text-stone-800 truncate text-base">{idea.title}</h3>
            {angleStyle && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0" style={{ background: angleStyle.bg, color: angleStyle.c }}>{angleStyle.label}</span>}
            {idea.origin_id && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 shrink-0">🎙️ Desde episodio</span>}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100 shrink-0"><X size={18} color={MU} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {idea.description && <p className="text-sm text-stone-600 leading-relaxed">{idea.description}</p>}

          <div>
            <label className="text-[10px] uppercase tracking-widest text-stone-400 font-medium block mb-1.5">Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={saveNotes} rows={4}
                      placeholder="Ideas sueltas, conexiones, comentarios de Daniela..."
                      className="w-full px-4 py-3 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-orange-300 resize-y leading-relaxed" />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-stone-400 font-medium block mb-1.5">Prompt</label>
            <textarea value={promptNotes} onChange={e => setPromptNotes(e.target.value)} onBlur={savePrompt} rows={3}
                      placeholder="¿Cómo imaginás el contenido? Tono, ángulo, ejemplos..."
                      className="w-full px-4 py-3 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-orange-300 resize-y leading-relaxed" />
          </div>

          <div>
            {targets.length === 0 ? (
              <p className="text-xs text-stone-400 italic">Activá LinkedIn o Reel en la tarjeta para generar contenido.</p>
            ) : (
              <button onClick={generateAll} disabled={generating !== null}
                      className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90"
                      style={{ background: O, opacity: generating !== null ? 0.7 : 1 }}>
                {generating !== null ? <><Loader2 size={14} className="animate-spin" /> Generando {targets.join(" + ")}...</> : <><Sparkles size={14} /> Generar contenido ({targets.join(" + ")})</>}
              </button>
            )}
          </div>

          {gen.linkedin && <GeneratedBox format="linkedin" content={gen.linkedin} onEdit={() => setEditM({ format: "linkedin", title: "LinkedIn", content: gen.linkedin.cuerpo || "" })} />}
          {gen.reel && <GeneratedBox format="reel" content={gen.reel} onEdit={() => setEditM({ format: "reel", title: "Reel", content: `${gen.reel.titulo || ""}\n\n${gen.reel.guion || ""}` })} />}

          <div className="pt-2 border-t border-stone-100">
            <button onClick={copyFullContext}
                    className="w-full py-2.5 rounded-xl text-sm font-medium border border-stone-200 hover:bg-stone-50 flex items-center justify-center gap-2"
                    style={{ color: copied ? GR : "#57534E", borderColor: copied ? "#BBF7D0" : "#E7E5E4", background: copied ? GL : "white" }}>
              {copied ? <><Check size={14} /> Copiado al portapapeles</> : <><Copy size={14} /> Copiar idea completa con contexto</>}
            </button>
          </div>
        </div>
      </div>
      {editM && <EditAIModal title={editM.title} content={editM.content} onClose={() => setEditM(null)}
                             onApply={async fb => { await editGenerated(editM.format, fb); setEditM(null); }} />}
    </div>
  );
}

function IdeaCard({ idea, onUpdate, onOpen, onDragStart, onDragEnd, onCardDragOver, onCardDrop, dragging, mergeHint }) {
  const temp = TEMP_META[idea.temperature] || TEMP_META.cold;
  const angleStyle = idea.angle ? ANGLE_TYPES[idea.angle] : null;
  const formats = Array.isArray(idea.formats) ? idea.formats : [];

  const toggleFormat = (key) => {
    const next = formats.includes(key) ? formats.filter(f => f !== key) : [...formats, key];
    onUpdate({ formats: next });
  };

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", idea.id); onDragStart(idea.id); }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onCardDragOver(e, idea)}
      onDrop={(e) => onCardDrop(e, idea)}
      onClick={() => onOpen(idea.id)}
      className="rounded-xl border bg-white p-3 shadow-sm hover:shadow-md transition-all cursor-pointer"
      style={{
        opacity: dragging ? 0.4 : 1,
        borderColor: mergeHint ? O : "#E7E5E4",
        boxShadow: mergeHint ? `0 0 0 2px ${OB}` : undefined,
      }}
    >
      <div className="flex items-start gap-2 mb-2">
        <button
          onClick={(e) => { e.stopPropagation(); onUpdate({ temperature: nextTemp(idea.temperature) }); }}
          title={temp.label}
          className="text-base leading-none mt-0.5 hover:scale-110 transition-transform shrink-0"
        >{temp.emoji}</button>
        <div className="flex-1 min-w-0">
          <InlineTitle value={idea.title} onSave={v => onUpdate({ title: v })} />
          {idea.description && <p className="text-xs text-stone-500 mt-1 leading-snug line-clamp-2">{idea.description}</p>}
        </div>
      </div>

      {(angleStyle || idea.origin_id) && (
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          {angleStyle && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: angleStyle.bg, color: angleStyle.c }}>{angleStyle.label}</span>}
          {idea.origin_id && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">🎙️ Desde episodio</span>}
        </div>
      )}

      <div className="flex items-center gap-1 flex-wrap pt-2 border-t border-stone-100">
        {FORMAT_OPTIONS.map(f => {
          const on = formats.includes(f.key);
          return (
            <button key={f.key} onClick={(e) => { e.stopPropagation(); toggleFormat(f.key); }}
              className="text-[10px] font-medium px-2 py-1 rounded-md transition-colors"
              style={{
                background: on ? OL : "transparent",
                color: on ? O : "#A8A29E",
                border: `1px solid ${on ? OB : "#E7E5E4"}`,
              }}>
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function FixtureBoard() {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [openIdeaId, setOpenIdeaId] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [dragOverCard, setDragOverCard] = useState(null);
  const [mergeRequest, setMergeRequest] = useState(null);

  useEffect(() => {
    fetch("/api/ideas")
      .then(r => r.json())
      .then(data => { setIdeas(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setIdeas([]); setLoading(false); });
  }, []);

  const createIdea = async (payload) => {
    const r = await fetch("/api/ideas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const newIdea = await r.json();
    if (newIdea && !newIdea.error) {
      setIdeas(prev => [...prev, newIdea]);
      setShowModal(false);
    }
  };

  const updateIdea = (id, patch) => {
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
    fetch("/api/ideas", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...patch }) });
  };

  const handleColumnDrop = (columnKey) => {
    if (!draggingId) return;
    if (dragOverCard) { setDraggingId(null); setDragOverCol(null); setDragOverCard(null); return; }
    const idea = ideas.find(i => i.id === draggingId);
    if (idea && idea.category !== columnKey) updateIdea(draggingId, { category: columnKey });
    setDraggingId(null);
    setDragOverCol(null);
  };

  const handleCardDragOver = (e, target) => {
    if (!draggingId || draggingId === target.id) return;
    const dragged = ideas.find(i => i.id === draggingId);
    if (!dragged || dragged.category !== target.category) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (dragOverCard !== target.id) setDragOverCard(target.id);
  };

  const handleCardDrop = (e, target) => {
    if (!draggingId || draggingId === target.id) return;
    const dragged = ideas.find(i => i.id === draggingId);
    if (!dragged || dragged.category !== target.category) return;
    e.preventDefault();
    e.stopPropagation();
    setMergeRequest({ source: dragged, target });
    setDraggingId(null);
    setDragOverCard(null);
    setDragOverCol(null);
  };

  const confirmMerge = () => {
    const { source, target } = mergeRequest;
    const newDesc = [target.description, source.description].filter(Boolean).join("\n\n") || null;
    const newNotes = [target.notes, source.notes].filter(Boolean).join("\n\n") || null;
    const targetFormats = Array.isArray(target.formats) ? target.formats : [];
    const sourceFormats = Array.isArray(source.formats) ? source.formats : [];
    const mergedFormats = Array.from(new Set([...targetFormats, ...sourceFormats]));
    updateIdea(target.id, { description: newDesc, notes: newNotes, formats: mergedFormats });
    updateIdea(source.id, { parent_id: target.id, status: "merged" });
    setMergeRequest(null);
  };

  const visibleIdeas = ideas.filter(i => i.status !== "merged");
  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.key] = visibleIdeas
      .filter(i => (i.category || "undecided") === col.key)
      .sort((a, b) => {
        const oa = (TEMP_META[a.temperature] || TEMP_META.cold).order;
        const ob = (TEMP_META[b.temperature] || TEMP_META.cold).order;
        if (oa !== ob) return oa - ob;
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
    return acc;
  }, {});

  const openIdea = openIdeaId ? ideas.find(i => i.id === openIdeaId) : null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2"><Lightbulb size={20} color={O} /> Banco de ideas</h1>
          <p className="text-xs text-stone-500 mt-1">Fixture editorial. Calienta lo que importa, archiva el resto.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white hover:opacity-90" style={{ background: O }}>
          <Plus size={14} /> Nueva idea
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-stone-400 py-12 justify-center">
          <Loader2 size={14} className="animate-spin" /> Cargando ideas...
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {COLUMNS.map(col => {
            const items = grouped[col.key] || [];
            const isOver = dragOverCol === col.key && draggingId && !dragOverCard;
            return (
              <div
                key={col.key}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (dragOverCol !== col.key) setDragOverCol(col.key); }}
                onDrop={(e) => { e.preventDefault(); handleColumnDrop(col.key); }}
                className="rounded-xl border p-4 min-h-[60vh] flex flex-col transition-colors"
                style={{ borderColor: isOver ? O : "#E7E5E4", background: isOver ? OL : "white" }}
              >
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{col.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-800 truncate">{col.label}</p>
                      <p className="text-[10px] text-stone-400 truncate">{col.hint}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 shrink-0">{items.length}</span>
                </div>
                {items.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-center px-4">
                    <p className="text-xs text-stone-400">Arrastra ideas aquí o usá &ldquo;+ Nueva idea&rdquo;</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map(idea => (
                      <IdeaCard
                        key={idea.id}
                        idea={idea}
                        onUpdate={(patch) => updateIdea(idea.id, patch)}
                        onOpen={(id) => setOpenIdeaId(id)}
                        onDragStart={setDraggingId}
                        onDragEnd={() => { setDraggingId(null); setDragOverCol(null); setDragOverCard(null); }}
                        onCardDragOver={handleCardDragOver}
                        onCardDrop={handleCardDrop}
                        dragging={draggingId === idea.id}
                        mergeHint={dragOverCard === idea.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && <NewIdeaModal onClose={() => setShowModal(false)} onCreate={createIdea} />}
      {openIdea && <IdeaModal idea={openIdea} onClose={() => setOpenIdeaId(null)} onUpdate={(patch) => updateIdea(openIdea.id, patch)} />}
      {mergeRequest && <MergeModal source={mergeRequest.source} target={mergeRequest.target} onConfirm={confirmMerge} onCancel={() => setMergeRequest(null)} />}
    </div>
  );
}
