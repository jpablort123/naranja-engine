"use client";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Lightbulb, Plus, Loader2, X, Copy, Check, Sparkles, CheckCircle2 } from "lucide-react";

const O = "#EA580C", OL = "#FFF7ED", OB = "#FED7AA", GR = "#16A34A", GL = "#F0FDF4", MU = "#78716A";

const COLUMNS = [
  { key: "undecided",  label: "Sin definir",    emoji: "💭" },
  { key: "contenido",  label: "Redes Sociales", emoji: "📱" },
  { key: "newsletter", label: "Newsletter",     emoji: "📨" },
];

const TEMP_SECTIONS = [
  { key: "spotlight", emoji: "💡", label: "Quiere ver la luz", bg: "#ECFDF5", c: "#15803D", border: "#BBF7D0" },
  { key: "warm",      emoji: "🌤️", label: "Tibio",             bg: "#FAF5FF", c: "#7C3AED", border: "#E9D5FF" },
  { key: "cold",      emoji: "❄️", label: "Frío",              bg: "#F1F5F9", c: "#475569", border: "#E2E8F0" },
];
const TEMP_KEYS = TEMP_SECTIONS.map(t => t.key);
const normalizeTemp = (t) => {
  if (t === "hot") return "warm";
  return TEMP_KEYS.includes(t) ? t : "cold";
};

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

function useEscape(handler) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") handler(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [handler]);
}

function AutoTextarea({ value, onChange, onBlur, placeholder, className = "", minHeight = 100, autoFocus }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(el.scrollHeight, minHeight) + "px";
  }, [value, minHeight]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className={className}
      style={{ minHeight }}
    />
  );
}

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
  useEscape(onClose);
  return (
    <div onClick={onClose} className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
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

function NewIdeaModal({ initialCategory, onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useEscape(onClose);

  const cat = COLUMNS.find(c => c.key === initialCategory) || COLUMNS[0];

  const submit = async () => {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    await onCreate({ title: title.trim(), description: description.trim() || null, category: cat.key });
    setSubmitting(false);
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h3 className="font-semibold text-stone-800">Nueva idea en {cat.emoji} {cat.label}</h3>
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
          <button onClick={submit} disabled={!title.trim() || submitting} className="w-full py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 flex items-center justify-center gap-2" style={{ background: title.trim() && !submitting ? O : "#D6D3D1", cursor: title.trim() && !submitting ? "pointer" : "not-allowed" }}>
            {submitting ? <><Loader2 size={14} className="animate-spin" /> Creando...</> : "Crear idea"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MergeModal({ source, target, onConfirm, onCancel }) {
  useEscape(onCancel);
  return (
    <div onClick={onCancel} className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
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

function PasteVersionModal({ format, aiBody, onClose, onSave }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  useEscape(onClose);

  return (
    <div onClick={onClose} className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h3 className="font-semibold text-stone-800">📝 Pegar tu versión — {format === "linkedin" ? "LinkedIn" : "Reel"}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100"><X size={18} color={MU} /></button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto">
          <p className="text-xs text-stone-500 mb-3">Pegá el texto que escribiste por fuera del sistema. Se guarda como tu versión y el sistema aprende comparándola con la versión de la IA.</p>
          {aiBody && (
            <div className="mb-3 rounded-xl border border-stone-200 bg-stone-50 p-3 max-h-32 overflow-y-auto">
              <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium mb-1.5">Versión IA (referencia)</p>
              <p className="text-xs text-stone-600 whitespace-pre-wrap leading-relaxed">{aiBody}</p>
            </div>
          )}
          <textarea autoFocus value={text} onChange={e => setText(e.target.value)} rows={12} placeholder="Pegá acá tu versión..." className="w-full px-4 py-3 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-orange-300 leading-relaxed resize-y" />
        </div>
        <div className="px-6 py-4 border-t border-stone-200 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100">Cancelar</button>
          <button onClick={async () => { if (!text.trim() || saving) return; setSaving(true); await onSave(text); setSaving(false); onClose(); }} disabled={!text.trim() || saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 flex items-center justify-center gap-2" style={{ background: text.trim() ? O : "#D6D3D1", cursor: text.trim() ? "pointer" : "not-allowed" }}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : "Guardar mi versión"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GeneratedBox({ format, content, onEdit, onPaste }) {
  const FORMAT_META = {
    linkedin: { emoji: "📝", label: "LinkedIn", bodyKey: "cuerpo", badgeKey: "patron_hook", badgeBg: "#EFF6FF", badgeC: "#1E40AF" },
    reel:     { emoji: "🎥", label: "Reel",     bodyKey: "guion",  badgeKey: "tipo_gancho", badgeBg: "#F5F3FF", badgeC: "#6D28D9" },
  }[format];
  if (!FORMAT_META || !content) return null;
  const body = content[FORMAT_META.bodyKey] || "";
  const isManual = content.source === "manual";
  return (
    <div className="rounded-xl border border-stone-200 p-4 bg-white">
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <p className="text-sm font-semibold text-stone-800 shrink-0">{FORMAT_META.emoji} {FORMAT_META.label}</p>
          {content[FORMAT_META.badgeKey] && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: FORMAT_META.badgeBg, color: FORMAT_META.badgeC }}>{content[FORMAT_META.badgeKey]}</span>}
          {isManual && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">✍️ Tu versión</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <AIEditButton onClick={onEdit} />
          <CopyBtn text={body} />
        </div>
      </div>
      {content.titulo && <p className="text-sm font-medium text-stone-800 mb-1">{content.titulo}</p>}
      {content.hook && <p className="text-sm font-medium text-stone-700 mb-1">{content.hook}</p>}
      <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{body}</p>
      <div className="mt-3 pt-3 border-t border-stone-100 flex justify-end">
        <button onClick={(e) => { e.stopPropagation(); onPaste(); }} className="text-[11px] font-medium text-stone-500 hover:text-orange-600 flex items-center gap-1">
          📝 Pegar mi versión
        </button>
      </div>
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

function IdeaPanel({ idea, onClose, onUpdate, onSent }) {
  const [notes, setNotes] = useState(idea.notes || "");
  const [promptNotes, setPromptNotes] = useState(idea.prompt_notes || "");
  const [generating, setGenerating] = useState(null);
  const [editM, setEditM] = useState(null);
  const [pasteM, setPasteM] = useState(null);
  const [confirmSend, setConfirmSend] = useState(false);
  const [sent, setSent] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [slideIn, setSlideIn] = useState(false);

  const formats = Array.isArray(idea.formats) ? idea.formats : [];
  const targets = formats.filter(f => GENERABLE_FORMATS.includes(f));
  const gen = idea.generated_content || {};
  const hasGenerated = Object.keys(gen).length > 0;
  const angleStyle = idea.angle ? ANGLE_TYPES[idea.angle] : null;
  const currentTemp = normalizeTemp(idea.temperature);

  // Portal mount + slide-in animation (doble rAF para garantizar el frame inicial)
  useEffect(() => {
    setMounted(true);
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setSlideIn(true)));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (editM || pasteM || confirmSend) return; // let nested handle escape
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, editM, pasteM, confirmSend]);

  const saveNotes = () => { if (notes !== (idea.notes || "")) onUpdate({ notes: notes || null }); };
  const savePrompt = () => { if (promptNotes !== (idea.prompt_notes || "")) onUpdate({ prompt_notes: promptNotes || null }); };

  const toggleFormat = (key) => {
    const next = formats.includes(key) ? formats.filter(f => f !== key) : [...formats, key];
    onUpdate({ formats: next });
  };

  const setTemperature = (t) => {
    if (normalizeTemp(idea.temperature) !== t) onUpdate({ temperature: t });
  };

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

  const saveManualVersion = async (format, manualText) => {
    const ai = gen[format] || {};
    const bodyKey = format === "linkedin" ? "cuerpo" : "guion";
    const aiBody = ai[bodyKey] || "";
    const updated = { ...ai, [bodyKey]: manualText, source: "manual" };
    onUpdate({ generated_content: { ...gen, [format]: updated } });

    // Crear learning draft solo si hay versión IA con la que comparar
    if (aiBody.trim()) {
      try {
        await fetch("/api/learnings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            episode_id: idea.origin_id || null,
            section: format === "linkedin" ? "linkedin" : "reels",
            original_content: aiBody,
            feedback: `JP reescribió la versión generada para la idea "${idea.title}". Versión final:\n\n${manualText}`,
            target_protocol_name: format === "linkedin" ? "linkedin" : "reels",
          }),
        });
      } catch (_) { /* non-fatal */ }
    }
  };

  const sendToGrid = async () => {
    setConfirmSend(false);
    setSent(true);

    // Crear items en parrilla_items, uno por cada formato activo de la idea.
    // Si no hay formatos, creamos uno por default (linkedin) para que la idea
    // sea visible en la Parrilla y JP no quede sin nada.
    const activeFormats = formats.length > 0 ? formats : ["linkedin"];
    const parrillaItems = activeFormats.map(fmt => {
      let content = "";
      if (fmt === "linkedin") content = gen.linkedin?.cuerpo || idea.notes || idea.description || "";
      else if (fmt === "reel") content = gen.reel?.guion || idea.notes || idea.description || "";
      else if (fmt === "newsletter") content = idea.notes || idea.description || "";
      return {
        title: idea.title,
        content,
        content_type: fmt, // 'linkedin' | 'reel' | 'newsletter'
        origin_type: "fixture",
        origin_id: idea.id,
        origin_label: "Fixture",
      };
    });

    console.log("[Fixture→Parrilla] enviando batch:", { items: parrillaItems, idea_group_id: idea.id, idea_group_title: idea.title });

    try {
      const r = await fetch("/api/parrilla/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: parrillaItems,
          idea_group_id: idea.id,
          idea_group_title: idea.title,
        }),
      });
      const data = await r.json();
      console.log("[Fixture→Parrilla] respuesta:", data);
      if (data && data.error) {
        console.error("[Fixture→Parrilla] Supabase error:", data.error);
      }
    } catch (e) {
      console.error("[Fixture→Parrilla] network error:", e);
    }

    onUpdate({ status: "ready" });
    setTimeout(() => { onSent(); }, 1800);
  };

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0, right: 0, bottom: 0, left: 0,
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(4px)",
          opacity: slideIn ? 1 : 0,
          transition: "opacity 220ms ease-out",
          zIndex: 50,
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 0, right: 0, bottom: 0,
          height: "100vh",
          width: "60vw",
          minWidth: 560,
          maxWidth: "calc(100vw - 64px)",
          background: "white",
          boxShadow: "-12px 0 40px rgba(0,0,0,0.18)",
          transform: slideIn ? "translateX(0)" : "translateX(100%)",
          transition: "transform 280ms cubic-bezier(0.16, 1, 0.3, 1)",
          zIndex: 51,
          display: "flex",
          flexDirection: "column",
          willChange: "transform",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-stone-200 gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
            <h3 className="font-semibold text-stone-800 text-base truncate">{idea.title}</h3>
            {angleStyle && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0" style={{ background: angleStyle.bg, color: angleStyle.c }}>{angleStyle.label}</span>}
            {idea.origin_id && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 shrink-0">🎙️ Desde episodio</span>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 shrink-0" title="Cerrar (Esc)"><X size={20} color={MU} /></button>
        </div>

        {/* Controls bar */}
        <div className="px-8 py-3 border-b border-stone-200 bg-stone-50/60 flex items-center justify-between flex-wrap gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest text-stone-400 font-medium mr-1">Formatos</span>
            {FORMAT_OPTIONS.map(f => {
              const on = formats.includes(f.key);
              return (
                <button key={f.key} onClick={() => toggleFormat(f.key)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors"
                  style={{
                    background: on ? OL : "white",
                    color: on ? O : "#A8A29E",
                    border: `1px solid ${on ? OB : "#E7E5E4"}`,
                  }}>
                  {f.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest text-stone-400 font-medium mr-1">Temperatura</span>
            {TEMP_SECTIONS.map(t => {
              const on = currentTemp === t.key;
              return (
                <button key={t.key} onClick={() => setTemperature(t.key)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors flex items-center gap-1"
                  style={{
                    background: on ? t.bg : "white",
                    color: on ? t.c : "#A8A29E",
                    border: `1px solid ${on ? t.border : "#E7E5E4"}`,
                  }}>
                  <span>{t.emoji}</span> {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body — two columns */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left column: notes + prompt */}
          <div className={`${hasGenerated ? "w-1/2 border-r border-stone-200" : "w-full"} overflow-y-auto p-8 space-y-5`}>
            {idea.description && <p className="text-base text-stone-600 leading-relaxed">{idea.description}</p>}

            <div>
              <label className="text-[10px] uppercase tracking-widest text-stone-400 font-medium block mb-2">Notas</label>
              <AutoTextarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                onBlur={saveNotes}
                placeholder="Ideas sueltas, conexiones, comentarios de Daniela..."
                minHeight={220}
                className="w-full px-5 py-4 text-base border border-stone-200 rounded-xl focus:outline-none focus:border-orange-300 leading-[1.75] resize-none"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-stone-400 font-medium block mb-2">Prompt</label>
              <AutoTextarea
                value={promptNotes}
                onChange={e => setPromptNotes(e.target.value)}
                onBlur={savePrompt}
                placeholder="¿Cómo imaginás el contenido? Tono, ángulo, ejemplos..."
                minHeight={140}
                className="w-full px-5 py-4 text-base border border-stone-200 rounded-xl focus:outline-none focus:border-orange-300 leading-[1.75] resize-none"
              />
            </div>

            <div className="space-y-3">
              {targets.length === 0 ? (
                <p className="text-xs text-stone-400 italic">Activá LinkedIn o Reel arriba para generar contenido.</p>
              ) : (
                <button onClick={generateAll} disabled={generating !== null}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90"
                  style={{ background: O, opacity: generating !== null ? 0.7 : 1 }}>
                  {generating !== null ? <><Loader2 size={14} className="animate-spin" /> Generando {targets.join(" + ")}...</> : <><Sparkles size={14} /> Generar contenido ({targets.join(" + ")})</>}
                </button>
              )}
              {!hasGenerated && targets.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium">o pegá tu propia versión</p>
                  {targets.map(fmt => (
                    <button key={fmt} onClick={() => setPasteM({ format: fmt })}
                      className="w-full py-2.5 rounded-xl text-xs font-medium border border-stone-200 hover:bg-stone-50 text-stone-600 flex items-center justify-center gap-1.5">
                      📝 Pegar mi versión de {fmt === "linkedin" ? "LinkedIn" : "Reel"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column: generated content */}
          {hasGenerated && (
            <div className="w-1/2 overflow-y-auto p-8 space-y-4 bg-stone-50/40">
              <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium">Contenido</p>
              {gen.linkedin && <GeneratedBox format="linkedin" content={gen.linkedin}
                onEdit={() => setEditM({ format: "linkedin", title: "LinkedIn", content: gen.linkedin.cuerpo || "" })}
                onPaste={() => setPasteM({ format: "linkedin" })} />}
              {gen.reel && <GeneratedBox format="reel" content={gen.reel}
                onEdit={() => setEditM({ format: "reel", title: "Reel", content: `${gen.reel.titulo || ""}\n\n${gen.reel.guion || ""}` })}
                onPaste={() => setPasteM({ format: "reel" })} />}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-stone-200 px-8 py-4 flex items-center gap-3 shrink-0">
          {sent ? (
            <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium" style={{ background: GL, color: GR }}>
              <CheckCircle2 size={16} /> Enviada a la parrilla
            </div>
          ) : confirmSend ? (
            <>
              <p className="flex-1 text-sm text-stone-600">¿Enviar a la parrilla? Saldrá del Fixture.</p>
              <button onClick={() => setConfirmSend(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100">Cancelar</button>
              <button onClick={sendToGrid} className="px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90" style={{ background: O }}>Confirmar</button>
            </>
          ) : (
            <>
              <div className="flex-1" />
              <button onClick={() => setConfirmSend(true)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 flex items-center gap-2"
                style={{ background: O }}>
                📋 Enviar a la parrilla
              </button>
            </>
          )}
        </div>
      </div>

      {editM && <EditAIModal title={editM.title} content={editM.content} onClose={() => setEditM(null)}
        onApply={async fb => { await editGenerated(editM.format, fb); setEditM(null); }} />}
      {pasteM && <PasteVersionModal
        format={pasteM.format}
        aiBody={pasteM.format === "linkedin" ? (gen.linkedin?.cuerpo || "") : (gen.reel?.guion || "")}
        onClose={() => setPasteM(null)}
        onSave={async (text) => { await saveManualVersion(pasteM.format, text); }} />}
    </>,
    document.body
  );
}

function IdeaCard({ idea, onUpdate, onOpen, onDragStart, onDragEnd, onCardDragOver, onCardDrop, dragging, mergeHint }) {
  const angleStyle = idea.angle ? ANGLE_TYPES[idea.angle] : null;
  const formats = Array.isArray(idea.formats) ? idea.formats : [];

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
      <div className="mb-2">
        <InlineTitle value={idea.title} onSave={v => onUpdate({ title: v })} />
        {idea.description && <p className="text-xs text-stone-500 mt-1 leading-snug line-clamp-2">{idea.description}</p>}
      </div>

      {(angleStyle || idea.origin_id) && (
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          {angleStyle && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: angleStyle.bg, color: angleStyle.c }}>{angleStyle.label}</span>}
          {idea.origin_id && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">🎙️ Desde episodio</span>}
        </div>
      )}

      {formats.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap pt-2 border-t border-stone-100">
          {formats.map(fkey => {
            const f = FORMAT_OPTIONS.find(o => o.key === fkey);
            if (!f) return null;
            return (
              <span key={fkey} className="text-[10px] font-medium px-2 py-0.5 rounded-md" style={{ background: OL, color: O, border: `1px solid ${OB}` }}>
                {f.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FixtureBoard() {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newIdeaCol, setNewIdeaCol] = useState(null);
  const [openIdeaId, setOpenIdeaId] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverSection, setDragOverSection] = useState(null); // "col-temp"
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
      setNewIdeaCol(null);
    }
  };

  const updateIdea = (id, patch) => {
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
    fetch("/api/ideas", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...patch }) });
  };

  // Section drop = mover a esa columna/temperatura. El merge solo dispara desde
  // el onDrop de la tarjeta (que llama stopPropagation), así que si llegamos
  // acá es porque el drop fue en espacio vacío de la sección. No miramos
  // dragOverCard, que puede estar desactualizado por un hover previo.
  const handleSectionDrop = (columnKey, tempKey) => {
    if (!draggingId) return;
    const idea = ideas.find(i => i.id === draggingId);
    if (idea) {
      const patch = {};
      if (idea.category !== columnKey) patch.category = columnKey;
      if (normalizeTemp(idea.temperature) !== tempKey) patch.temperature = tempKey;
      if (Object.keys(patch).length > 0) updateIdea(draggingId, patch);
    }
    setDraggingId(null);
    setDragOverSection(null);
    setDragOverCard(null);
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
    setDragOverSection(null);
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

  const visibleIdeas = ideas.filter(i => i.status !== "merged" && i.status !== "ready");

  // Group by column → temperature
  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.key] = TEMP_SECTIONS.reduce((tacc, t) => {
      tacc[t.key] = visibleIdeas
        .filter(i => (i.category || "undecided") === col.key && normalizeTemp(i.temperature) === t.key)
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      return tacc;
    }, {});
    return acc;
  }, {});

  const openIdea = openIdeaId ? ideas.find(i => i.id === openIdeaId) : null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2"><Lightbulb size={20} color={O} /> Banco de ideas</h1>
        <p className="text-xs text-stone-500 mt-1">Fixture editorial. Calienta lo que importa, archiva el resto.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-stone-400 py-12 justify-center">
          <Loader2 size={14} className="animate-spin" /> Cargando ideas...
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {COLUMNS.map(col => {
            const colItems = grouped[col.key] || {};
            const totalItems = TEMP_SECTIONS.reduce((sum, t) => sum + (colItems[t.key]?.length || 0), 0);
            return (
              <div key={col.key} className="rounded-xl border border-stone-200 bg-white p-3 flex flex-col">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{col.emoji}</span>
                    <p className="text-sm font-semibold text-stone-800 truncate">{col.label}</p>
                  </div>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 shrink-0">{totalItems}</span>
                </div>

                <div className="space-y-3 flex-1">
                  {TEMP_SECTIONS.map(t => {
                    const items = colItems[t.key] || [];
                    const sectionKey = `${col.key}-${t.key}`;
                    const isOver = dragOverSection === sectionKey && draggingId && !dragOverCard;
                    return (
                      <div
                        key={t.key}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          if (dragOverSection !== sectionKey) setDragOverSection(sectionKey);
                          if (dragOverCard !== null) setDragOverCard(null);
                        }}
                        onDrop={(e) => { e.preventDefault(); handleSectionDrop(col.key, t.key); }}
                        className="rounded-lg p-2 transition-all"
                        style={{
                          background: t.bg,
                          outline: isOver ? `2px solid ${t.c}` : "none",
                          outlineOffset: -2,
                          minHeight: 80,
                        }}
                      >
                        <div className="flex items-center justify-between mb-2 px-1">
                          <p className="text-[11px] font-semibold tracking-tight flex items-center gap-1" style={{ color: t.c }}>
                            <span>{t.emoji}</span> {t.label}
                          </p>
                          {items.length > 0 && <span className="text-[10px] font-medium" style={{ color: t.c, opacity: 0.7 }}>{items.length}</span>}
                        </div>
                        <div className="space-y-2">
                          {items.map(idea => (
                            <IdeaCard
                              key={idea.id}
                              idea={idea}
                              onUpdate={(patch) => updateIdea(idea.id, patch)}
                              onOpen={(id) => setOpenIdeaId(id)}
                              onDragStart={setDraggingId}
                              onDragEnd={() => { setDraggingId(null); setDragOverSection(null); setDragOverCard(null); }}
                              onCardDragOver={handleCardDragOver}
                              onCardDrop={handleCardDrop}
                              dragging={draggingId === idea.id}
                              mergeHint={dragOverCard === idea.id}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button onClick={() => setNewIdeaCol(col.key)}
                  className="mt-3 w-full py-2 rounded-lg text-xs font-medium text-stone-500 hover:text-orange-600 hover:bg-orange-50 border border-dashed border-stone-200 hover:border-orange-200 transition-colors flex items-center justify-center gap-1.5">
                  <Plus size={12} /> Nueva idea
                </button>
              </div>
            );
          })}
        </div>
      )}

      {newIdeaCol && <NewIdeaModal initialCategory={newIdeaCol} onClose={() => setNewIdeaCol(null)} onCreate={createIdea} />}
      {openIdea && <IdeaPanel idea={openIdea} onClose={() => setOpenIdeaId(null)} onUpdate={(patch) => updateIdea(openIdea.id, patch)} onSent={() => setOpenIdeaId(null)} />}
      {mergeRequest && <MergeModal source={mergeRequest.source} target={mergeRequest.target} onConfirm={confirmMerge} onCancel={() => setMergeRequest(null)} />}
    </div>
  );
}
