"use client";
import { useState, useEffect } from "react";
import { Copy, Check, Loader2, Sparkles, CheckCircle2, X, Pencil, Save, Lightbulb, Calendar } from "lucide-react";

// ═══ THEME CONSTANTS ═══
export const O = "#EA580C";
export const OL = "#FFF7ED";
export const OB = "#FED7AA";
export const GR = "#16A34A";
export const GL = "#F0FDF4";
export const MU = "#78716A";

// ═══ DOMAIN DICTIONARIES ═══
export const ANGLE_TYPES = {
  contraste: { bg: "#EFF6FF", c: "#1E40AF", label: "Contraste" },
  dato_absurdo: { bg: "#FDF2F8", c: "#BE185D", label: "Dato absurdo" },
  secreto: { bg: "#F5F3FF", c: "#6D28D9", label: "Secreto" },
  cliche_no_practicado: { bg: "#FFFBEB", c: "#B45309", label: "Cliché no practicado" },
  contrarian: { bg: "#FFF1F2", c: "#BE123C", label: "Contrarian" },
  mecanismo_invisible: { bg: "#F0FDF4", c: "#15803D", label: "Mecanismo invisible" },
  cambio_paradigma: { bg: "#ECFEFF", c: "#0E7490", label: "Cambio de paradigma" },
  tension_real: { bg: "#FFFBEB", c: "#B45309", label: "Tensión real" },
  barrera_emocional: { bg: "#FEF2F2", c: "#DC2626", label: "Barrera emocional" },
  historia_personal: { bg: "#F5F3FF", c: "#6D28D9", label: "Historia personal" },
};

export const MINADO_CATS = {
  "DATO ABSURDO": { bg: "#EFF6FF", c: "#1E40AF" }, "INSIGHT ACCIONABLE": { bg: "#F0FDF4", c: "#15803D" },
  "CONFESIÓN": { bg: "#F5F3FF", c: "#6D28D9" }, "IDEA CONTRARIAN": { bg: "#FFF1F2", c: "#BE123C" },
  "HISTORIA CON REMATE": { bg: "#FFFBEB", c: "#B45309" }, "TENSIÓN SIN RESOLVER": { bg: "#FDF2F8", c: "#BE185D" },
};

// ═══ API HELPER ═══
export async function api(path, opts) {
  const r = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opts });
  return r.json();
}

// ═══ SMALL UI ═══
export function CopyBtn({ text }) {
  const [ok, s] = useState(false);
  return <button onClick={() => { navigator.clipboard.writeText(text); s(true); setTimeout(() => s(false), 1500); }} className="p-1.5 rounded-lg hover:bg-stone-100 transition-all shrink-0" title="Copiar">{ok ? <Check size={14} color={GR} /> : <Copy size={14} color={MU} />}</button>;
}

export function BankBtn({ payload }) {
  const [added, setAdded] = useState(false);
  const click = async (e) => {
    e.stopPropagation();
    if (added) return;
    await api("/api/ideas", { method: "POST", body: JSON.stringify(payload) });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };
  if (added) return <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg shrink-0" style={{ background: GL, color: GR }}><Check size={11} /> Agregado</span>;
  return <button onClick={click} title="Llevar al banco de ideas" className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg text-stone-500 border border-stone-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-colors shrink-0"><Lightbulb size={11} /> Al banco</button>;
}

export function Skel({ n = 3 }) {
  return <div className="space-y-2.5 py-1">{Array.from({ length: n }).map((_, i) => <div key={i} className="h-3 rounded-md animate-pulse bg-stone-200" style={{ width: `${88 - i * 14}%` }} />)}</div>;
}

export function Badge({ label }) {
  const s = ANGLE_TYPES[label] || MINADO_CATS[label] || { bg: "#F4F4F5", c: "#52525B" };
  return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: s.bg, color: s.c }}>{s.label || label}</span>;
}

// ═══ EDITABLE TEXT ═══
export function EditableText({ text, onSave, multiline = false, className = "" }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(text);
  useEffect(() => setVal(text), [text]);
  if (!editing) return (
    <div className={`group relative cursor-text ${className}`} onClick={() => setEditing(true)}>
      <div className="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded flex items-center gap-1"><Pencil size={9} /> editar</span>
      </div>
      {multiline ? <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">{text}</p> : <span>{text}</span>}
    </div>
  );
  return (
    <div className="relative">
      {multiline ? (
        <textarea value={val} onChange={e => setVal(e.target.value)} autoFocus onKeyDown={e => { if (e.key === 'Escape') { setVal(text); setEditing(false); } }}
          className="w-full text-sm text-stone-700 leading-relaxed border border-orange-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-200 min-h-[100px] resize-y" />
      ) : (
        <input value={val} onChange={e => setVal(e.target.value)} autoFocus onKeyDown={e => { if (e.key === 'Enter') { onSave(val); setEditing(false); } if (e.key === 'Escape') { setVal(text); setEditing(false); } }}
          className="w-full text-sm text-stone-700 border border-orange-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-200" />
      )}
      <div className="flex gap-1.5 mt-1.5 justify-end">
        <button onClick={() => { setVal(text); setEditing(false); }} className="text-xs text-stone-400 hover:text-stone-600 px-2 py-1">Cancelar</button>
        <button onClick={() => { onSave(val); setEditing(false); }} className="text-xs text-white px-3 py-1 rounded-lg hover:opacity-90" style={{ background: O }}><Save size={11} className="inline mr-1" />Guardar</button>
      </div>
    </div>
  );
}

// ═══ FEEDBACK BAR ═══
export function ApplyBar({ feedbacks, onApply, applying, applied }) {
  const count = Object.values(feedbacks || {}).filter(v => v?.trim()).length;
  if (applied) return <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium mt-3" style={{ background: GL, color: GR }}><CheckCircle2 size={16} /> Cambios aplicados</div>;
  if (count === 0) return null;
  return <button onClick={onApply} disabled={applying} className="w-full mt-3 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90" style={{ background: O }}>{applying ? <><Loader2 size={16} className="animate-spin" /> Aplicando...</> : <><Sparkles size={16} /> Aplicar cambios y aprender ({count})</>}</button>;
}

// ═══ EDIT WITH AI MODAL ═══
export function EditModal({ title, content, onClose, onApply }) {
  const [fb, setFb] = useState(""); const [applying, setApplying] = useState(false); const [done, setDone] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200"><h3 className="font-semibold text-stone-800">{title}</h3><button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100"><X size={18} color={MU} /></button></div>
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 p-6 overflow-y-auto border-r border-stone-200"><p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mb-3">Contenido actual</p><p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">{content}</p></div>
          <div className="flex-1 p-6 flex flex-col">
            <p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mb-3">Tu feedback</p>
            <textarea value={fb} onChange={e => setFb(e.target.value)} placeholder="Escribe qué cambiarías y por qué..." className="flex-1 w-full text-sm border border-stone-200 rounded-xl p-4 resize-none focus:outline-none focus:border-orange-300 mb-4" />
            {done ? <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: GL, color: GR }}><CheckCircle2 size={16} /> Cambios aplicados</div> : (
              <button onClick={async () => { if (!fb.trim()) return; setApplying(true); await onApply?.(fb); setApplying(false); setDone(true); }}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90"
                style={{ background: fb.trim() ? O : "#D6D3D1", cursor: fb.trim() ? "pointer" : "not-allowed" }}>
                {applying ? <><Loader2 size={16} className="animate-spin" /> Aplicando...</> : <><Sparkles size={16} /> Editar con IA y aprender</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AIEditBtn({ onClick }) {
  return <button onClick={onClick} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-orange-50 shrink-0" style={{ color: O, borderColor: OB }}><Sparkles size={12} /> Editar con IA</button>;
}

// ═══ SEND TO PARRILLA ═══
// pieces: [{ key, title, content, content_type, preview, label_prefix }]
// source: { id, name, origin_type, label_prefix }
export function SendToParrillaModal({ pieces, source, onClose, onSent }) {
  const [selected, setSelected] = useState(() => Object.fromEntries(pieces.map(p => [p.key, true])));
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [errMsg, setErrMsg] = useState(null);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const toggle = (k) => setSelected(prev => ({ ...prev, [k]: !prev[k] }));
  const count = Object.values(selected).filter(Boolean).length;

  const submit = async () => {
    if (count === 0 || submitting) return;
    setSubmitting(true);
    setErrMsg(null);
    const labelPrefix = source.label_prefix || "";
    const toSend = pieces.filter(p => selected[p.key]).map(p => ({
      title: p.title,
      content: p.content,
      content_type: p.content_type,
      origin_type: source.origin_type,
      origin_id: source.id,
      origin_label: `${labelPrefix}${source.name}`,
    }));
    try {
      const payload = { items: toSend, idea_group_id: source.id, idea_group_title: source.name };
      console.log("[→Parrilla] enviando batch:", payload);
      const result = await api("/api/parrilla/batch", { method: "POST", body: JSON.stringify(payload) });
      console.log("[→Parrilla] respuesta:", result);
      if (result && result.error) {
        setErrMsg(`No pude enviar a la parrilla: ${result.error}. ¿Corriste la SQL de supabase/parrilla_items.sql?`);
        setSubmitting(false);
        return;
      }
      setDone(true);
      setTimeout(() => { onSent?.(); onClose(); }, 1400);
    } catch (e) {
      console.error("[→Parrilla] network error:", e);
      setErrMsg(`Error de red: ${e.message || e}`);
      setSubmitting(false);
    }
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h3 className="font-semibold text-stone-800">📅 Enviar a Parrilla</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100"><X size={18} color={MU} /></button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto space-y-2">
          {errMsg && (
            <div className="mb-3 p-3 rounded-xl border border-red-200 bg-red-50 text-xs text-red-700">⚠️ {errMsg}</div>
          )}
          <p className="text-xs text-stone-500 mb-3">Seleccioná las piezas que querés enviar al inbox de la Parrilla.</p>
          {pieces.length === 0 ? (
            <p className="text-sm text-stone-400 italic">No hay piezas para enviar.</p>
          ) : pieces.map(p => {
            const on = !!selected[p.key];
            return (
              <label key={p.key} className="flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors"
                style={{ background: on ? OL : "white", borderColor: on ? OB : "#E7E5E4" }}>
                <input type="checkbox" checked={on} onChange={() => toggle(p.key)}
                  className="mt-0.5 w-4 h-4 accent-orange-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-800 truncate">{p.label_prefix}{p.title}</p>
                  {p.preview && <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{p.preview}</p>}
                </div>
              </label>
            );
          })}
        </div>
        <div className="px-6 py-4 border-t border-stone-200 flex items-center gap-2">
          {done ? (
            <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium" style={{ background: GL, color: GR }}>
              <CheckCircle2 size={16} /> Enviadas {count} pieza{count === 1 ? "" : "s"} al inbox
            </div>
          ) : (
            <>
              <p className="flex-1 text-xs text-stone-500">{count} pieza{count === 1 ? "" : "s"} seleccionada{count === 1 ? "" : "s"}</p>
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100">Cancelar</button>
              <button onClick={submit} disabled={count === 0 || submitting} className="px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 flex items-center gap-2"
                style={{ background: count && !submitting ? O : "#D6D3D1", cursor: count && !submitting ? "pointer" : "not-allowed" }}>
                {submitting ? <><Loader2 size={14} className="animate-spin" /> Enviando...</> : `Enviar ${count}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Parrilla oculta en la UI. Cambiar a true para reactivar el botón.
const SHOW_PARRILLA = false;

export function SendToParrillaBtn({ pieces, source, onSent }) {
  const [open, setOpen] = useState(false);
  if (!SHOW_PARRILLA) return null;
  return (
    <>
      <button onClick={() => setOpen(true)}
        disabled={pieces.length === 0}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ color: O, borderColor: OB }}>
        <Calendar size={12} /> Enviar a Parrilla
      </button>
      {open && <SendToParrillaModal pieces={pieces} source={source} onClose={() => setOpen(false)} onSent={onSent} />}
    </>
  );
}
