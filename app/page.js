"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { Copy, Check, ChevronDown, ChevronUp, Plus, X, Loader2, Sparkles, CheckCircle2, FileText, Upload, Mic, Rss, Brain, Pencil, Save, BookOpen, Lightbulb, Calendar, Home as HomeIcon, Mail } from "lucide-react";
import dynamic from "next/dynamic";
const LearningsReview = dynamic(() => import("@/components/LearningsReview"), { ssr: false });
const ProtocolosViewer = dynamic(() => import("@/components/ProtocolosViewer"), { ssr: false });
const FixtureBoard = dynamic(() => import("@/components/FixtureBoard"), { ssr: false });
const ParrillaView = dynamic(() => import("@/components/ParrillaView"), { ssr: false });
const InicioView = dynamic(() => import("@/components/InicioView"), { ssr: false });

const O = "#EA580C", OL = "#FFF7ED", OB = "#FED7AA", GR = "#16A34A", GL = "#F0FDF4", MU = "#78716A";

const ANGLE_TYPES = {
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
const MINADO_CATS = {
  "DATO ABSURDO": { bg: "#EFF6FF", c: "#1E40AF" }, "INSIGHT ACCIONABLE": { bg: "#F0FDF4", c: "#15803D" },
  "CONFESIÓN": { bg: "#F5F3FF", c: "#6D28D9" }, "IDEA CONTRARIAN": { bg: "#FFF1F2", c: "#BE123C" },
  "HISTORIA CON REMATE": { bg: "#FFFBEB", c: "#B45309" }, "TENSIÓN SIN RESOLVER": { bg: "#FDF2F8", c: "#BE185D" },
};

// ═══ API HELPERS ═══
async function api(path, opts) {
  const r = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opts });
  return r.json();
}
async function generate(body) { return api("/api/generate", { method: "POST", body: JSON.stringify(body) }); }

// ═══ SMALL COMPONENTS ═══
function CopyBtn({ text }) {
  const [ok, s] = useState(false);
  return <button onClick={() => { navigator.clipboard.writeText(text); s(true); setTimeout(() => s(false), 1500); }} className="p-1.5 rounded-lg hover:bg-stone-100 transition-all shrink-0" title="Copiar">{ok ? <Check size={14} color={GR} /> : <Copy size={14} color={MU} />}</button>;
}
function BankBtn({ payload }) {
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
function Skel({ n = 3 }) { return <div className="space-y-2.5 py-1">{Array.from({ length: n }).map((_, i) => <div key={i} className="h-3 rounded-md animate-pulse bg-stone-200" style={{ width: `${88 - i * 14}%` }} />)}</div>; }
function Badge({ label }) {
  const s = ANGLE_TYPES[label] || MINADO_CATS[label] || { bg: "#F4F4F5", c: "#52525B" };
  return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: s.bg, color: s.c }}>{s.label || label}</span>;
}

// ═══ EDITABLE TEXT ═══
function EditableText({ text, onSave, multiline = false, className = "" }) {
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
function ApplyBar({ feedbacks, onApply, applying, applied }) {
  const count = Object.values(feedbacks || {}).filter(v => v?.trim()).length;
  if (applied) return <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium mt-3" style={{ background: GL, color: GR }}><CheckCircle2 size={16} /> Cambios aplicados</div>;
  if (count === 0) return null;
  return <button onClick={onApply} disabled={applying} className="w-full mt-3 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90" style={{ background: O }}>{applying ? <><Loader2 size={16} className="animate-spin" /> Aplicando...</> : <><Sparkles size={16} /> Aplicar cambios y aprender ({count})</>}</button>;
}

// ═══ EDIT WITH AI MODAL ═══
function EditModal({ title, content, onClose, onApply }) {
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

function AIEditBtn({ onClick }) {
  return <button onClick={onClick} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-orange-50 shrink-0" style={{ color: O, borderColor: OB }}><Sparkles size={12} /> Editar con IA</button>;
}

// ═══ SEND TO PARRILLA MODAL ═══
// pieces: [{ key, title, content, content_type, preview }]
function SendToParrillaModal({ pieces, ep, onClose, onSent }) {
  const [selected, setSelected] = useState(() => Object.fromEntries(pieces.map(p => [p.key, true])));
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const toggle = (k) => setSelected(prev => ({ ...prev, [k]: !prev[k] }));
  const count = Object.values(selected).filter(Boolean).length;

  const [errMsg, setErrMsg] = useState(null);

  const submit = async () => {
    if (count === 0 || submitting) return;
    setSubmitting(true);
    setErrMsg(null);
    const toSend = pieces.filter(p => selected[p.key]).map(p => ({
      title: p.title,
      content: p.content,
      content_type: p.content_type,
      origin_type: "episode",
      origin_id: ep.id,
      origin_label: `Ep. ${ep.name}`,
    }));
    try {
      const payload = { items: toSend, idea_group_id: ep.id, idea_group_title: ep.name };
      console.log("[Episode→Parrilla] enviando batch:", payload);
      const result = await api("/api/parrilla/batch", { method: "POST", body: JSON.stringify(payload) });
      console.log("[Episode→Parrilla] respuesta:", result);
      if (result && result.error) {
        setErrMsg(`No pude enviar a la parrilla: ${result.error}. ¿Corriste la SQL de supabase/parrilla_items.sql?`);
        setSubmitting(false);
        return;
      }
      setDone(true);
      setTimeout(() => { onSent?.(); onClose(); }, 1400);
    } catch (e) {
      console.error("[Episode→Parrilla] network error:", e);
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

function SendToParrillaBtn({ pieces, ep, onSent }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}
        disabled={pieces.length === 0}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ color: O, borderColor: OB }}>
        <Calendar size={12} /> Enviar a Parrilla
      </button>
      {open && <SendToParrillaModal pieces={pieces} ep={ep} onClose={() => setOpen(false)} onSent={onSent} />}
    </>
  );
}

// ═══ UPLOAD MODAL ═══
function UploadModal({ onClose, onSubmit }) {
  const [name, setName] = useState(""); const [tx, setTx] = useState(""); const [fn, setFn] = useState(""); const fr = useRef(null);
  const readFile = f => { if (!f) return; setFn(f.name); const r = new FileReader(); r.onload = e => setTx(e.target.result); r.readAsText(f); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200"><h3 className="font-semibold text-stone-800">Nuevo episodio</h3><button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100"><X size={18} color={MU} /></button></div>
        <div className="p-6 space-y-4">
          <div><label className="text-sm font-medium text-stone-600 block mb-1.5">Nombre del episodio</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Silvi — Rappi Retail Media" className="w-full px-4 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-orange-300" /></div>
          <div>
            <label className="text-sm font-medium text-stone-600 block mb-1.5">Fuente del episodio</label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <button onClick={() => fr.current?.click()} className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100"><Upload size={20} /><span className="text-xs font-medium">Archivo .txt</span></button>
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-400 relative cursor-not-allowed"><Rss size={20} /><span className="text-xs font-medium">RSS Feed</span><span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-stone-200 text-stone-500">Pronto</span></div>
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-400 relative cursor-not-allowed"><Mic size={20} /><span className="text-xs font-medium">Audio MP3</span><span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-stone-200 text-stone-500">Pronto</span></div>
            </div>
            <input ref={fr} type="file" accept=".txt,.srt,.vtt" onChange={e => readFile(e.target.files?.[0])} className="hidden" />
            {fn ? <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200"><FileText size={16} color={GR} /><span className="text-sm text-green-700 font-medium flex-1 truncate">{fn}</span><button onClick={() => { setFn(""); setTx(""); }} className="p-1 rounded hover:bg-green-100"><X size={14} color={GR} /></button></div>
            : <div onClick={() => fr.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); readFile(e.dataTransfer.files?.[0]); }} className="border-2 border-dashed border-stone-200 rounded-xl p-8 text-center cursor-pointer hover:border-orange-300 hover:bg-orange-50/30 transition-all"><Upload size={28} color={MU} className="mx-auto mb-2" /><p className="text-sm text-stone-500">Arrastra tu archivo .txt aquí</p><p className="text-xs text-stone-400 mt-1">o haz click para seleccionar</p></div>}
          </div>
          <button onClick={() => { if (name.trim() && tx.trim()) onSubmit(name.trim(), tx.trim()); }} className="w-full py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90" style={{ background: name.trim() && tx.trim() ? O : "#D6D3D1", cursor: name.trim() && tx.trim() ? "pointer" : "not-allowed" }}>Procesar episodio</button>
        </div>
      </div>
    </div>
  );
}

// ═══ MAPA ═══
function Mapa({ mapa, open, toggle }) {
  if (!mapa) return null;
  return (
    <div className="mb-4 rounded-xl border border-stone-200 bg-white overflow-hidden">
      <button onClick={toggle} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-stone-50 transition-colors"><span className="font-semibold text-[14px] text-stone-800 flex items-center gap-2">🗺️ Mapa del episodio</span>{open ? <ChevronUp size={16} color={MU} /> : <ChevronDown size={16} color={MU} />}</button>
      {open && <div className="px-5 pb-5 space-y-4 border-t border-stone-100 pt-4">
        {mapa.tesis && <div><p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mb-1">Tesis principal</p><p className="text-sm text-stone-700 leading-relaxed">{mapa.tesis}</p></div>}
        {mapa.ideas?.length > 0 && <div><p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mb-2">Ideas clave</p>{mapa.ideas.map((d, i) => <p key={i} className="text-sm text-stone-600 flex items-start gap-2 mb-1"><span style={{ color: O }} className="mt-0.5">•</span>{d}</p>)}</div>}
        {mapa.datos_duros?.length > 0 && <div><p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mb-2">Datos duros</p><div className="flex flex-wrap gap-2">{mapa.datos_duros.map((d, i) => <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700">{d}</span>)}</div></div>}
        {mapa.tensiones?.length > 0 && <div><p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mb-2">Tensiones</p>{mapa.tensiones.map((d, i) => <p key={i} className="text-sm text-stone-600 flex items-start gap-2 mb-1"><span className="text-amber-500 mt-0.5">⚡</span>{d}</p>)}</div>}
        {mapa.frases?.length > 0 && <div><p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mb-2">Frases memorables</p>{mapa.frases.map((d, i) => <p key={i} className="text-sm text-stone-500 italic mb-1">&ldquo;{d}&rdquo;</p>)}</div>}
        {mapa.historia_personal && <div><p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mb-1">Historia personal</p><p className="text-sm text-stone-600">{mapa.historia_personal}</p></div>}
      </div>}
    </div>
  );
}

// ═══ GEN STATUS ═══
function GenStatus({ phase }) {
  const steps = [
    { key: "angles", label: "Mapa del episodio + 20 ángulos" },
    { key: "contenido", label: "Títulos y descripciones" },
    { key: "minado", label: "Minado de micro-contenido" },
  ];
  const ci = steps.findIndex(s => s.key === phase);
  return <div className="mb-6 p-4 rounded-xl border border-orange-200 bg-orange-50">
    <div className="flex items-center gap-2 mb-3"><Loader2 size={16} color={O} className="animate-spin" /><p className="text-sm font-medium" style={{ color: O }}>Procesando episodio...</p></div>
    <div className="space-y-2">{steps.map((s, i) => <div key={s.key} className="flex items-center gap-2.5">{i < ci ? <CheckCircle2 size={14} color={GR} /> : i === ci ? <Loader2 size={14} color={O} className="animate-spin" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-stone-300" />}<span className={`text-xs ${i < ci ? "text-green-600" : i === ci ? "text-orange-600 font-medium" : "text-stone-400"}`}>{s.label}</span></div>)}</div>
  </div>;
}

// ═══ TAB: CONTENIDO ═══
function ContenidoTab({ ep, phase, onUpdate, onLearn, onGenerate, generatingContent }) {
  const [titleFb, setTitleFb] = useState({}); const [thumbFb, setThumbFb] = useState({});
  const [applyingT, setApplyingT] = useState(false); const [appliedT, setAppliedT] = useState(false);
  const [applyingTh, setApplyingTh] = useState(false); const [appliedTh, setAppliedTh] = useState(false);
  const [editM, setEditM] = useState(null);
  const [titlesOpen, setTitlesOpen] = useState(true);
  const [angComments, setAngComments] = useState({});

  const angulos = ep.ideas || [];
  const sel = ep.selected_ideas || [];
  const hasSel = sel.length > 0;
  const hasContent = !!ep.titulos;
  const loadingAngles = phase === "angles";

  const toggleAngle = i => {
    const n = sel.includes(i) ? sel.filter(x => x !== i) : [...sel, i];
    onUpdate({ selected_ideas: n });
  };

  const selectedAngles = sel.map(i => angulos[i]).filter(Boolean);

  const applyTitleFb = async () => {
    setApplyingT(true);
    const fbs = Object.entries(titleFb).filter(([, v]) => v.trim());
    const fbText = fbs.map(([i, v]) => `Título ${+i + 1} ("${ep.titulos[i]}"): ${v}`).join("\n");
    const res = await generate({ prompt: `Tienes estos 10 títulos:\n${ep.titulos.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\nFeedback:\n${fbText}\n\nRegenera SOLO los que tienen feedback. Mantén los demás igual.\nJSON: { "titulos": ["los 10 títulos actualizados"] }` });
    if (res.result?.titulos) onUpdate({ titulos: res.result.titulos });
    fbs.forEach(([, v]) => onLearn("titulos", v));
    setApplyingT(false); setAppliedT(true); setTitleFb({}); setTimeout(() => setAppliedT(false), 3000);
  };

  const applyThumbFb = async () => {
    setApplyingTh(true);
    const fbs = Object.entries(thumbFb).filter(([, v]) => v.trim());
    const fbText = fbs.map(([i, v]) => `Thumbnail ${+i + 1}: ${v}`).join("\n");
    const res = await generate({ prompt: `Sugerencias actuales:\n${ep.thumbnails.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\nFeedback:\n${fbText}\n\nRegenera aplicando feedback.\nJSON: { "thumbnails": ["actualizadas"] }` });
    if (res.result?.thumbnails) onUpdate({ thumbnails: res.result.thumbnails });
    fbs.forEach(([, v]) => onLearn("thumbnails", v));
    setApplyingTh(false); setAppliedTh(true); setThumbFb({}); setTimeout(() => setAppliedTh(false), 3000);
  };

  const applyDescFb = async (key, label, fb) => {
    const res = await generate({ prompt: `Descripción actual de ${label}:\n"${ep[key]}"\n\nFeedback: ${fb}\n\nRegenera aplicando feedback.\nJSON: { "texto": "descripción regenerada" }` });
    if (res.result?.texto) onUpdate({ [key]: res.result.texto });
    onLearn("titulos", fb);
  };

  return <div>
    {/* ÁNGULOS */}
    <div className="rounded-xl border border-stone-200 bg-white p-5 mb-4">
      <h3 className="font-semibold text-[15px] text-stone-800 mb-1 flex items-center gap-2">💡 Ángulos del episodio</h3>
      <p className="text-xs text-stone-400 mb-4">Selecciona los que más te gustan. El contenido se generará afilado alrededor de ellos.</p>
      {loadingAngles || angulos.length === 0 ? <Skel n={6} /> : <>
        <div className="space-y-1.5 mb-4">{angulos.map((a, i) => (
          <div key={i} className="rounded-xl border transition-all" style={{ borderColor: sel.includes(i) ? O : "#E7E5E4", background: sel.includes(i) ? OL : "white" }}>
            <div className="flex items-start gap-3 p-3 cursor-pointer" onClick={() => toggleAngle(i)}>
              <div className="mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0" style={{ borderColor: sel.includes(i) ? O : "#D6D3D1", background: sel.includes(i) ? O : "white" }}>{sel.includes(i) && <Check size={12} color="white" strokeWidth={3} />}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap"><p className="text-sm font-medium text-stone-800">{a.titulo}</p><Badge label={a.tipo} /></div>
                <p className="text-xs text-stone-500">{a.descripcion}</p>
              </div>
              <BankBtn payload={{ title: a.titulo, description: a.descripcion, category: 'undecided', temperature: 'cold', angle: a.tipo, origin_type: 'episode', origin_id: ep.id, origin_url: ep.name }} />
              <span className="text-xs font-medium text-stone-300 shrink-0">{i + 1}</span>
            </div>
            {sel.includes(i) && <div className="px-3 pb-3 ml-8"><input value={angComments[i] || ""} onChange={e => setAngComments({ ...angComments, [i]: e.target.value })} placeholder="Comentario opcional sobre este ángulo..." className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-orange-300" onClick={e => e.stopPropagation()} /></div>}
          </div>
        ))}</div>
        {!hasContent && (
          <button onClick={() => onGenerate(selectedAngles)} disabled={!hasSel || generatingContent}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90"
            style={{ background: hasSel ? O : "#D6D3D1", cursor: hasSel ? "pointer" : "not-allowed" }}>
            {generatingContent ? <><Loader2 size={16} className="animate-spin" /> Generando contenido...</> : <><Sparkles size={16} /> Generar contenido con {sel.length} ángulos</>}
          </button>
        )}
        {hasContent && <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium" style={{ background: GL, color: GR }}><CheckCircle2 size={14} /> Contenido generado con {sel.length} ángulos</div>}
      </>}
    </div>

    {/* TÍTULOS */}
    {(hasContent || generatingContent) && <div className="rounded-xl border border-stone-200 bg-white mb-4 overflow-hidden">
      <button onClick={() => setTitlesOpen(!titlesOpen)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-stone-50 transition-colors">
        <span className="font-semibold text-[15px] text-stone-800 flex items-center gap-2">🏷️ Opciones de título</span>
        {titlesOpen ? <ChevronUp size={16} color={MU} /> : <ChevronDown size={16} color={MU} />}
      </button>
      {titlesOpen && (!ep.titulos ? <div className="px-5 pb-5"><Skel n={5} /></div> : <div className="px-5 pb-5">
        <div className="space-y-0.5">{ep.titulos.map((t, i) => <div key={i}>
          <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-stone-50 group">
            <span className="text-xs font-medium text-stone-400 w-5 shrink-0">{i + 1}</span>
            <div className="flex-1"><EditableText text={t} onSave={v => { const n = [...ep.titulos]; n[i] = v; onUpdate({ titulos: n }); }} /></div>
            <CopyBtn text={t} />
          </div>
          <div className="ml-10 mr-3 mb-1"><input value={titleFb[i] || ""} onChange={e => setTitleFb({ ...titleFb, [i]: e.target.value })} placeholder="Feedback sobre este título..." className="w-full text-xs px-3 py-1.5 rounded-lg border border-transparent hover:border-stone-200 focus:border-orange-300 focus:outline-none bg-transparent focus:bg-white transition-all placeholder:text-stone-300" /></div>
        </div>)}</div>
        <ApplyBar feedbacks={titleFb} onApply={applyTitleFb} applying={applyingT} applied={appliedT} />
      </div>)}
    </div>}

    {/* SPOTIFY */}
    {(hasContent || generatingContent) && <div className="rounded-xl border border-stone-200 bg-white p-5 mb-4">
      <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-[15px] text-stone-800 flex items-center gap-2">🎧 Descripción Spotify</h3>
        <div className="flex items-center gap-2">{ep.descripcion_spotify && <AIEditBtn onClick={() => setEditM({ title: "Descripción Spotify", content: ep.descripcion_spotify, key: "descripcion_spotify", label: "Spotify" })} />}</div>
      </div>
      {!ep.descripcion_spotify ? <Skel /> : <>
        <EditableText text={ep.descripcion_spotify} onSave={v => onUpdate({ descripcion_spotify: v })} multiline className="mb-3" />
        <div className="flex items-center justify-between"><span className="text-xs text-stone-400">{ep.descripcion_spotify.length} chars</span><CopyBtn text={ep.descripcion_spotify} /></div>
      </>}
    </div>}

    {/* YOUTUBE */}
    {(hasContent || generatingContent) && <div className="rounded-xl border border-stone-200 bg-white p-5 mb-4">
      <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-[15px] text-stone-800 flex items-center gap-2">📺 Descripción YouTube</h3>
        <div className="flex items-center gap-2">{ep.descripcion_youtube && <AIEditBtn onClick={() => setEditM({ title: "Descripción YouTube", content: ep.descripcion_youtube, key: "descripcion_youtube", label: "YouTube" })} />}</div>
      </div>
      {!ep.descripcion_youtube ? <Skel /> : <>
        <EditableText text={ep.descripcion_youtube} onSave={v => onUpdate({ descripcion_youtube: v })} multiline className="mb-3" />
        <div className="flex items-center justify-between"><span className="text-xs text-stone-400">{ep.descripcion_youtube.length} chars</span><CopyBtn text={ep.descripcion_youtube} /></div>
      </>}
    </div>}

    {/* THUMBNAILS */}
    {(hasContent || generatingContent) && <div className="rounded-xl border border-stone-200 bg-white p-5 mb-4">
      <h3 className="font-semibold text-[15px] text-stone-800 flex items-center gap-2 mb-3">🖼️ Sugerencias de thumbnail</h3>
      {!ep.thumbnails ? <Skel /> : <><div className="space-y-2">{ep.thumbnails.map((t, i) => <div key={i} className="rounded-xl border border-stone-200 p-3.5">
        <div className="flex items-start justify-between gap-3 mb-2"><div className="flex items-start gap-2.5 min-w-0"><span className="text-xs font-bold text-stone-400 mt-0.5">{i + 1}</span><EditableText text={t} onSave={v => { const n = [...ep.thumbnails]; n[i] = v; onUpdate({ thumbnails: n }); }} multiline /></div><CopyBtn text={t} /></div>
        <input value={thumbFb[i] || ""} onChange={e => setThumbFb({ ...thumbFb, [i]: e.target.value })} placeholder="Feedback..." className="w-full text-xs px-3 py-1.5 rounded-lg border border-transparent hover:border-stone-200 focus:border-orange-300 focus:outline-none bg-transparent focus:bg-white transition-all placeholder:text-stone-300" />
      </div>)}</div><ApplyBar feedbacks={thumbFb} onApply={applyThumbFb} applying={applyingTh} applied={appliedTh} /></>}
    </div>}
    {editM && <EditModal title={editM.title} content={editM.content} onClose={() => setEditM(null)} onApply={async fb => { await applyDescFb(editM.key, editM.label, fb); setEditM(null); }} />}
  </div>;
}

// ═══ TAB: REPURPOSE ═══
function RepurposeTab({ ep, onUpdate, onLearn }) {
  const [genRP, setGenRP] = useState(false);
  const [editM, setEditM] = useState(null);
  const angulos = ep.ideas || [];
  const sel = ep.selected_ideas || [];
  const selectedAngles = sel.map(i => angulos[i]).filter(Boolean);
  const rp = ep.repurpose_content;

  const generateRP = async () => {
    if (selectedAngles.length === 0) return;
    setGenRP(true);
    const res = await generate({ episode_id: ep.id, phase: "repurpose", selected_angles: selectedAngles, mapa: ep.mapa });
    if (res.result) onUpdate({ repurpose_content: res.result });
    setGenRP(false);
  };

  const applyIntroFb = async (idx, fb) => {
    const intro = rp.intros[idx];
    const res = await generate({ prompt: `Intro actual:\n"${intro.texto}"\n\nFeedback: ${fb}\n\nRegenera aplicando feedback.\nJSON: { "texto": "intro regenerado", "titulo": "${intro.titulo}", "formula": "${intro.formula}" }` });
    if (res.result?.texto) {
      const n = [...rp.intros]; n[idx] = res.result;
      onUpdate({ repurpose_content: { ...rp, intros: n } });
    }
    onLearn("intros", fb);
  };

  // Piezas para enviar a la Parrilla (todos los reels + todos los LinkedIn — los intros no van)
  const parrillaPieces = [
    ...(rp?.reels || []).map((reel, i) => ({
      key: `reel-${i}`,
      label_prefix: `🎬 Reel — `,
      title: reel.titulo || `Reel #${i + 1}`,
      content: reel.guion || "",
      content_type: "reel",
      preview: reel.guion,
    })),
    ...(rp?.linkedin || []).map((post, i) => ({
      key: `linkedin-${i}`,
      label_prefix: `💼 LinkedIn — `,
      title: (post.hook || post.cuerpo || "").split("\n")[0].slice(0, 80) || `LinkedIn #${i + 1}`,
      content: post.cuerpo || "",
      content_type: "linkedin",
      preview: post.cuerpo,
    })),
  ];

  if (sel.length === 0) return <div className="rounded-xl border border-stone-200 bg-white p-8 text-center"><p className="text-sm text-stone-500">Primero selecciona ángulos en la tab de Contenido</p></div>;

  return <div>
    {rp && parrillaPieces.length > 0 && (
      <div className="mb-4 flex justify-end">
        <SendToParrillaBtn pieces={parrillaPieces} ep={ep} />
      </div>
    )}
    {!rp && <div className="rounded-xl border border-stone-200 bg-white p-5 mb-4">
      <h3 className="font-semibold text-[15px] text-stone-800 mb-2">🔄 Generar repurpose</h3>
      <p className="text-xs text-stone-400 mb-4">{selectedAngles.length} ángulos seleccionados → intros + reels + LinkedIn</p>
      <div className="space-y-1.5 mb-4">{selectedAngles.map((a, i) => <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 border border-orange-100"><Badge label={a.tipo} /><p className="text-xs text-stone-700">{a.titulo}</p></div>)}</div>
      <button onClick={generateRP} disabled={genRP} className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90" style={{ background: O }}>
        {genRP ? <><Loader2 size={16} className="animate-spin" /> Generando intros + reels + LinkedIn...</> : <><Sparkles size={16} /> Generar repurpose</>}
      </button>
    </div>}

    {/* INTROS */}
    {rp?.intros && <div className="rounded-xl border border-stone-200 bg-white p-5 mb-4">
      <h3 className="font-semibold text-[15px] text-stone-800 mb-3">🎤 Intros leídos</h3>
      <div className="space-y-3">{rp.intros.map((intro, i) => <div key={i} className="rounded-xl border border-stone-200 p-4">
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0"><span className="text-xs font-bold text-stone-400">#{i + 1}</span><p className="text-sm font-medium text-stone-800">{intro.titulo}</p><Badge label={intro.formula} /></div>
          <div className="flex items-center gap-1 shrink-0"><BankBtn payload={{ title: intro.titulo || `Intro #${i + 1}`, description: intro.formula, notes: intro.texto, category: 'undecided', temperature: 'cold', origin_type: 'episode', origin_id: ep.id, origin_url: ep.name }} /><AIEditBtn onClick={() => setEditM({ title: `Intro #${i + 1}`, content: intro.texto, idx: i, type: "intro" })} /><CopyBtn text={intro.texto} /></div>
        </div>
        <EditableText text={intro.texto} onSave={v => { const n = [...rp.intros]; n[i] = { ...n[i], texto: v }; onUpdate({ repurpose_content: { ...rp, intros: n } }); }} multiline />
      </div>)}</div>
    </div>}

    {/* REELS */}
    {rp?.reels && <div className="rounded-xl border border-stone-200 bg-white p-5 mb-4">
      <h3 className="font-semibold text-[15px] text-stone-800 mb-3">🎥 Guiones de reel</h3>
      <div className="space-y-3">{rp.reels.map((reel, i) => <div key={i} className="rounded-xl border border-stone-200 p-4">
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0"><span className="text-xs font-bold text-stone-400">#{i + 1}</span><p className="text-sm font-medium text-stone-800">{reel.titulo}</p><span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">{reel.tipo_gancho}</span></div>
          <div className="flex items-center gap-1 shrink-0"><BankBtn payload={{ title: reel.titulo || `Reel #${i + 1}`, description: reel.tipo_gancho, notes: reel.guion, formats: ['reel'], category: 'contenido', temperature: 'cold', origin_type: 'episode', origin_id: ep.id, origin_url: ep.name, generated_content: { reel } }} /><CopyBtn text={reel.guion} /></div>
        </div>
        <EditableText text={reel.guion} onSave={v => { const n = [...rp.reels]; n[i] = { ...n[i], guion: v }; onUpdate({ repurpose_content: { ...rp, reels: n } }); }} multiline />
      </div>)}</div>
    </div>}

    {/* LINKEDIN */}
    {rp?.linkedin && <div className="rounded-xl border border-stone-200 bg-white p-5 mb-4">
      <h3 className="font-semibold text-[15px] text-stone-800 mb-3">📝 Posts de LinkedIn</h3>
      <div className="space-y-3">{rp.linkedin.map((post, i) => <div key={i} className="rounded-xl border border-stone-200 p-4">
        <div className="flex items-center justify-between mb-2 gap-2"><div className="flex items-center gap-2 min-w-0"><span className="text-xs font-bold text-stone-400">#{i + 1}</span><span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{post.patron_hook}</span></div><div className="flex items-center gap-1 shrink-0"><BankBtn payload={{ title: (post.hook || '').split('\n')[0].slice(0, 80) || `LinkedIn #${i + 1}`, description: post.patron_hook, notes: post.cuerpo, formats: ['linkedin'], category: 'contenido', temperature: 'cold', origin_type: 'episode', origin_id: ep.id, origin_url: ep.name, generated_content: { linkedin: post } }} /><CopyBtn text={post.cuerpo} /></div></div>
        <EditableText text={post.cuerpo} onSave={v => { const n = [...rp.linkedin]; n[i] = { ...n[i], cuerpo: v }; onUpdate({ repurpose_content: { ...rp, linkedin: n } }); }} multiline />
      </div>)}</div>
    </div>}

    {rp && <button onClick={() => onUpdate({ repurpose_content: null })} className="text-sm text-stone-400 hover:text-stone-600 mb-4">← Regenerar repurpose</button>}
    {editM?.type === "intro" && <EditModal title={editM.title} content={editM.content} onClose={() => setEditM(null)} onApply={async fb => { await applyIntroFb(editM.idx, fb); setEditM(null); }} />}
  </div>;
}

// ═══ TAB: MINADO ═══
function MinadoTab({ ep, phase, onUpdate, onLearn }) {
  const loading = phase === "minado" || phase === "angles" || phase === "contenido";
  const minado = ep.minado;
  const momentos = minado?.momentos || minado || [];
  const vozEnOff = minado?.voz_en_off || [];
  const [fb, setFb] = useState({}); const [applying, setApplying] = useState(false); const [applied, setApplied] = useState(false);

  const applyFb = async () => {
    setApplying(true);
    const fbs = Object.entries(fb).filter(([, v]) => v.trim());
    const fbText = fbs.map(([i, v]) => `Momento ${+i + 1} ("${momentos[i]?.cita}"): ${v}`).join("\n");
    const res = await generate({ prompt: `Momentos actuales:\n${momentos.map((m, i) => `${i + 1}. "${m.cita}" [${m.categoria}]`).join("\n")}\n\nFeedback:\n${fbText}\n\nRegenera aplicando feedback.\nJSON: { "momentos": [{ "cita": "string", "timestamp": "string", "duracion_seg": 30, "categoria": "string", "dani": false, "por_que_funciona": "string", "sugerencia_caption": "string" }] }` });
    if (res.result?.momentos) {
      const updated = minado?.voz_en_off ? { ...minado, momentos: res.result.momentos } : res.result.momentos;
      onUpdate({ minado: updated });
    }
    fbs.forEach(([, v]) => onLearn("minado", v));
    setApplying(false); setApplied(true); setFb({}); setTimeout(() => setApplied(false), 3000);
  };

  if (loading || !momentos.length) return <div className="rounded-xl border border-stone-200 bg-white p-5"><h3 className="font-semibold text-[15px] text-stone-800 mb-3">⛏️ Micro-contenido para redes</h3><Skel n={6} /></div>;

  // Piezas para enviar a la Parrilla — los clips de minado entran como 'reel' por defecto
  const parrillaPieces = momentos.map((m, i) => ({
    key: `minado-${i}`,
    label_prefix: `🎬 Clip — `,
    title: (m.cita || "").slice(0, 80) + ((m.cita || "").length > 80 ? "…" : ""),
    content: m.cita || "",
    content_type: "reel",
    preview: m.por_que_funciona || m.sugerencia_caption,
  }));

  return <div>
    {parrillaPieces.length > 0 && (
      <div className="mb-4 flex justify-end">
        <SendToParrillaBtn pieces={parrillaPieces} ep={ep} />
      </div>
    )}
    {/* VOZ EN OFF */}
    {vozEnOff.length > 0 && <div className="rounded-xl border border-stone-200 bg-white p-5 mb-4">
      <h3 className="font-semibold text-[15px] text-stone-800 mb-3">🎙️ Voz en off — Presentación del invitado</h3>
      <div className="space-y-2">{vozEnOff.map((v, i) => <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-stone-200">
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 shrink-0 mt-0.5">{v.formula}</span>
        <EditableText text={v.texto} onSave={val => { const n = [...vozEnOff]; n[i] = { ...n[i], texto: val }; onUpdate({ minado: { ...minado, voz_en_off: n } }); }} multiline className="flex-1" />
        <CopyBtn text={v.texto} />
      </div>)}</div>
    </div>}

    {/* MOMENTOS */}
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <h3 className="font-semibold text-[15px] text-stone-800 mb-1">⛏️ {momentos.length} clips para redes</h3>
      <p className="text-xs text-stone-400 mb-4">Cada clip funciona solo, sin contexto, como pieza independiente en el feed.</p>
      <div className="space-y-2">{momentos.map((m, i) => <div key={i} className="rounded-xl border border-stone-200 p-3.5">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <span className="text-xs font-mono font-medium text-stone-400 bg-stone-100 px-2 py-1 rounded-md">{m.timestamp}</span>
            {m.duracion_seg && <span className="text-[10px] text-stone-400">{m.duracion_seg}s</span>}
          </div>
          <div className="flex-1 min-w-0">
            <EditableText text={m.cita} onSave={v => { const n = [...momentos]; n[i] = { ...n[i], cita: v }; const updated = minado?.voz_en_off ? { ...minado, momentos: n } : n; onUpdate({ minado: updated }); }} multiline />
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge label={m.categoria} />
              {m.dani && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-50 text-pink-600">+DANI</span>}
              {m.por_que_funciona && <span className="text-[11px] text-stone-400 truncate">{m.por_que_funciona}</span>}
            </div>
            {m.sugerencia_caption && <p className="text-[11px] text-stone-400 italic mt-1">Caption: {m.sugerencia_caption}</p>}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <CopyBtn text={m.cita} />
            <BankBtn payload={{ title: (m.cita || '').slice(0, 80) + ((m.cita || '').length > 80 ? '…' : ''), description: m.por_que_funciona, notes: m.cita, category: 'undecided', temperature: 'cold', origin_type: 'episode', origin_id: ep.id, origin_url: ep.name }} />
          </div>
        </div>
        <div className="mt-2 ml-16"><input value={fb[i] || ""} onChange={e => setFb({ ...fb, [i]: e.target.value })} placeholder="Feedback..." className="w-full text-xs px-3 py-1.5 rounded-lg border border-transparent hover:border-stone-200 focus:border-orange-300 focus:outline-none bg-transparent focus:bg-white transition-all placeholder:text-stone-300" /></div>
      </div>)}</div>
      <ApplyBar feedbacks={fb} onApply={applyFb} applying={applying} applied={applied} />
    </div>
  </div>;
}

// ═══ MAIN APP ═══
export default function Home() {
  const [eps, setEps] = useState([]); const [idx, setIdx] = useState(-1);
  const [tab, setTab] = useState("contenido"); const [showUp, setShowUp] = useState(false);
  const [phase, setPhase] = useState(null); const [mapaOpen, setMapaOpen] = useState(false);
  const [learnings, setLearnings] = useState([]); const [loadingEps, setLoadingEps] = useState(true);
  const [genContent, setGenContent] = useState(false);
  const [activeView, setActiveView] = useState("inicio"); // inicio | podcast | newsletter | workspace | learnings | protocolos | fixture | parrilla
  const [parrillaInboxCount, setParrillaInboxCount] = useState(0);
  const [podcastExpanded, setPodcastExpanded] = useState(true);
  const [newsletterToast, setNewsletterToast] = useState(false);

  const ep = idx >= 0 ? eps[idx] : null;

  useEffect(() => {
    api("/api/episodes").then(data => { setEps(Array.isArray(data) ? data : []); setLoadingEps(false); });
  }, []);

  // Cargar count del inbox para el badge del sidebar (refresca cuando entra al view)
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const r = await fetch("/api/parrilla?status=inbox");
        const data = await r.json();
        if (!cancelled) setParrillaInboxCount(Array.isArray(data) ? data.length : 0);
      } catch (_) { /* swallow */ }
    };
    refresh();
    return () => { cancelled = true; };
  }, [activeView]);

  const updateEp = useCallback((patch) => {
    setEps(prev => prev.map((e, i) => i === idx ? { ...e, ...patch } : e));
    if (ep?.id) {
      const cleanPatch = { ...patch };
      if (Object.keys(cleanPatch).length > 0) {
        api("/api/episodes", { method: "PUT", body: JSON.stringify({ id: ep.id, ...cleanPatch }) });
      }
    }
  }, [idx, ep]);

  const addLearning = useCallback((section, feedback) => {
    if (!feedback?.trim() || !ep?.id) return;
    const learning = { episode_id: ep.id, section, feedback, original_content: "", target_protocol_name: section };
    api("/api/learnings", { method: "POST", body: JSON.stringify(learning) });
    setLearnings(prev => [...prev, { ...learning, status: "draft" }]);
  }, [ep]);

  // ═══ FLOW: UPLOAD → ANGLES ═══
  const startGen = useCallback(async (name, transcript) => {
    const newEp = await api("/api/episodes", { method: "POST", body: JSON.stringify({ name, transcript }) });
    if (newEp.error) { alert("Error: " + newEp.error); return; }
    setEps(prev => [newEp, ...prev]);
    setIdx(0); setShowUp(false); setTab("contenido"); setPhase("angles"); setActiveView("workspace");

    // Phase 1: Mapa + Ángulos (automatic)
    const r1 = await generate({ episode_id: newEp.id, phase: "angles" });
    if (r1.result) {
      setEps(prev => prev.map(e => e.id === newEp.id ? { ...e, mapa: r1.result.mapa, ideas: r1.result.angulos } : e));
      setMapaOpen(true);
    }
    setPhase("waiting_selection"); // Wait for JP to select angles
  }, []);

  // ═══ FLOW: SELECT ANGLES → GENERATE CONTENT + MINADO ═══
  const generateContent = useCallback(async (selectedAngles) => {
    if (!ep?.id) return;
    setGenContent(true); setPhase("contenido");

    // Phase 2: Títulos + Descripciones
    const r2 = await generate({ episode_id: ep.id, phase: "contenido", selected_angles: selectedAngles, mapa: ep.mapa });
    if (r2.result) {
      setEps(prev => prev.map(e => e.id === ep.id ? { ...e, titulos: r2.result.titulos, descripcion_spotify: r2.result.descripcion_spotify, descripcion_youtube: r2.result.descripcion_youtube, thumbnails: r2.result.thumbnails } : e));
    }

    // Phase 3: Minado (parallel-ish, uses transcript)
    setPhase("minado");
    const r3 = await generate({ episode_id: ep.id, phase: "minado", selected_angles: selectedAngles });
    if (r3.result) {
      setEps(prev => prev.map(e => e.id === ep.id ? { ...e, minado: r3.result } : e));
    }

    setPhase("done"); setGenContent(false);
    api("/api/episodes", { method: "PUT", body: JSON.stringify({ id: ep.id, status: "complete" }) });
  }, [ep]);

  const tabs = [{ key: "contenido", label: "Contenido", icon: "📝" }, { key: "repurpose", label: "Repurpose", icon: "🔄" }, { key: "minado", label: "Minado", icon: "⛏️" }];
  const draftLearnings = learnings.filter(l => l.status === "draft").length;

  // ── Sprint 1: acción contextual del botón "+ Nuevo" según la superficie activa
  const contextualNew = (() => {
    if (activeView === "newsletter") {
      return { label: "Nueva edición", onClick: () => { setNewsletterToast(true); setTimeout(() => setNewsletterToast(false), 2400); } };
    }
    if (activeView === "inicio" || activeView === "podcast" || activeView === "workspace") {
      return { label: "Nuevo episodio", onClick: () => setShowUp(true) };
    }
    return null; // fixture / parrilla / learnings / protocolos: cada vista ya tiene su propia creación interna
  })();

  // ── Sprint 1: navegación helper desde InicioView
  const goTo = (view) => {
    setIdx(-1);
    setActiveView(view);
  };

  // ── Sprint 1: estado activo del item "Podcast" (incluye workspace al estar viendo un episodio)
  const podcastActive = activeView === "podcast" || activeView === "workspace";

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#FAFAF9", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* SIDEBAR — Sprint 1: re-jerarquización (Inicio + Contenido + Sistema) */}
      <div className="w-56 shrink-0 flex flex-col text-white" style={{ background: "#18181B" }}>
        {/* Logo */}
        <div className="p-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: O }}>N</div>
            <div>
              <p className="text-sm font-semibold text-white tracking-tight">CMO Engine</p>
              <p className="text-[10px] text-zinc-500 -mt-0.5">Naranja Media</p>
            </div>
          </div>
        </div>

        {/* + Nuevo contextual */}
        <div className="px-3 mb-3 min-h-[44px]">
          {contextualNew && (
            <button
              onClick={contextualNew.onClick}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium hover:opacity-90"
              style={{ background: O }}
            >
              <Plus size={14} /> {contextualNew.label}
            </button>
          )}
          {newsletterToast && activeView === "newsletter" && (
            <p className="text-[10px] text-zinc-500 mt-2 px-1 text-center">Próximamente — flujo de newsletter</p>
          )}
        </div>

        {/* Nav scrollable */}
        <div className="flex-1 overflow-y-auto px-3 pb-2">
          {/* Inicio */}
          <button
            onClick={() => goTo("inicio")}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs transition-all mb-1"
            style={{ background: activeView === "inicio" ? "rgba(234,88,12,0.15)" : "transparent" }}
          >
            <HomeIcon size={14} style={{ color: activeView === "inicio" ? "#EA580C" : "rgba(255,255,255,0.45)" }} />
            <span style={{ color: activeView === "inicio" ? "#EA580C" : "rgba(255,255,255,0.65)" }}>Inicio</span>
          </button>

          {/* CONTENIDO */}
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 px-2 mb-2 mt-4">Contenido</p>

          {/* Podcast (expandible) */}
          <div className="mb-1">
            <button
              onClick={() => setPodcastExpanded(v => !v)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs transition-all"
              style={{ background: podcastActive ? "rgba(234,88,12,0.15)" : "transparent" }}
            >
              <Mic size={14} style={{ color: podcastActive ? "#EA580C" : "rgba(255,255,255,0.45)" }} />
              <span className="flex-1" style={{ color: podcastActive ? "#EA580C" : "rgba(255,255,255,0.65)" }}>Podcast</span>
              {podcastExpanded
                ? <ChevronUp size={12} style={{ color: "rgba(255,255,255,0.35)" }} />
                : <ChevronDown size={12} style={{ color: "rgba(255,255,255,0.35)" }} />}
            </button>
            {podcastExpanded && (
              <div className="ml-4 mt-1 mb-1 pl-3 space-y-0.5" style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                {loadingEps ? (
                  <p className="text-[11px] text-zinc-600 px-2 py-1">Cargando...</p>
                ) : eps.length === 0 ? (
                  <p className="text-[11px] text-zinc-600 px-2 py-1">Sin episodios aún</p>
                ) : (
                  <>
                    {eps.slice(0, 5).map((e, i) => {
                      const epActive = i === idx && activeView === "workspace";
                      return (
                        <button
                          key={e.id || i}
                          onClick={() => { setIdx(i); setPhase(e.status === "complete" ? "done" : null); setActiveView("workspace"); }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] truncate transition-all"
                          style={{ background: epActive ? "#27272A" : "transparent", color: epActive ? "white" : "#A1A1AA" }}
                        >
                          {e.name}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => goTo("podcast")}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      Ver todos →
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Newsletter */}
          <button
            onClick={() => goTo("newsletter")}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs transition-all mb-1"
            style={{ background: activeView === "newsletter" ? "rgba(234,88,12,0.15)" : "transparent" }}
          >
            <Mail size={14} style={{ color: activeView === "newsletter" ? "#EA580C" : "rgba(255,255,255,0.45)" }} />
            <span style={{ color: activeView === "newsletter" ? "#EA580C" : "rgba(255,255,255,0.65)" }}>Newsletter</span>
          </button>

          {/* Fixture */}
          <button
            onClick={() => goTo("fixture")}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs transition-all mb-1"
            style={{ background: activeView === "fixture" ? "rgba(234,88,12,0.15)" : "transparent" }}
          >
            <Lightbulb size={14} style={{ color: activeView === "fixture" ? "#EA580C" : "rgba(255,255,255,0.45)" }} />
            <span style={{ color: activeView === "fixture" ? "#EA580C" : "rgba(255,255,255,0.65)" }}>Fixture</span>
          </button>

          {/* Parrilla */}
          <button
            onClick={() => goTo("parrilla")}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs transition-all mb-1"
            style={{ background: activeView === "parrilla" ? "rgba(234,88,12,0.15)" : "transparent" }}
          >
            <Calendar size={14} style={{ color: activeView === "parrilla" ? "#EA580C" : "rgba(255,255,255,0.45)" }} />
            <span className="flex-1" style={{ color: activeView === "parrilla" ? "#EA580C" : "rgba(255,255,255,0.65)" }}>Parrilla</span>
            {parrillaInboxCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: "#EA580C", color: "white" }}>
                {parrillaInboxCount}
              </span>
            )}
          </button>

          {/* SISTEMA — visualmente discreto */}
          <p className="text-[9px] uppercase tracking-[0.15em] text-zinc-700 px-2 mb-1.5 mt-6">Sistema</p>

          <button
            onClick={() => goTo("protocolos")}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[11px] transition-all mb-0.5 opacity-80 hover:opacity-100"
            style={{ background: activeView === "protocolos" ? "rgba(234,88,12,0.15)" : "transparent" }}
          >
            <BookOpen size={12} style={{ color: activeView === "protocolos" ? "#EA580C" : "rgba(255,255,255,0.35)" }} />
            <span style={{ color: activeView === "protocolos" ? "#EA580C" : "rgba(255,255,255,0.55)" }}>Protocolos</span>
          </button>

          <button
            onClick={() => goTo("learnings")}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[11px] transition-all opacity-80 hover:opacity-100"
            style={{ background: activeView === "learnings" ? "rgba(234,88,12,0.15)" : "transparent" }}
          >
            <Brain size={12} style={{ color: activeView === "learnings" ? "#EA580C" : "rgba(255,255,255,0.35)" }} />
            <span className="flex-1" style={{ color: activeView === "learnings" ? "#EA580C" : "rgba(255,255,255,0.55)" }}>Aprendizajes</span>
            {draftLearnings > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: "#EA580C", color: "white" }}>
                {draftLearnings}
              </span>
            )}
          </button>
        </div>

        <div className="p-4 border-t border-zinc-800">
          <p className="text-[10px] text-zinc-600">CMO Stories · v0.4</p>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 overflow-y-auto">
        {activeView === 'learnings' ? (
          <LearningsReview onBack={() => setActiveView('inicio')} onApplied={() => setLearnings(prev => prev.map(l => l.status === 'draft' ? { ...l, status: 'reviewed' } : l))} />
        ) : activeView === 'protocolos' ? (
          <ProtocolosViewer onBack={() => setActiveView('inicio')} />
        ) : activeView === 'fixture' ? (
          <FixtureBoard onBack={() => setActiveView('inicio')} />
        ) : activeView === 'parrilla' ? (
          <ParrillaView onBack={() => setActiveView('inicio')} />
        ) : activeView === 'inicio' ? (
          <InicioView
            eps={eps}
            draftLearnings={draftLearnings}
            onOpenEpisode={(i) => { setIdx(i); setPhase(eps[i]?.status === "complete" ? "done" : null); setActiveView('workspace'); }}
            onGo={goTo}
            onOpenUpload={() => setShowUp(true)}
          />
        ) : activeView === 'newsletter' ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: OL }}><Mail size={28} color={O} /></div>
            <h2 className="text-xl font-semibold text-stone-800 mb-2">Newsletter</h2>
            <p className="text-sm text-stone-500 mb-2 max-w-sm">Aún no hay ediciones.</p>
            <p className="text-xs text-stone-400 max-w-sm">El flujo de Newsletter llega en un próximo sprint.</p>
          </div>
        ) : activeView === 'podcast' ? (
          <div className="max-w-3xl mx-auto px-6 py-8">
            <div className="mb-6">
              <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-2">
                <button onClick={() => goTo('inicio')} className="hover:text-stone-600 transition-colors">CMO</button>
                <span>/</span>
                <span className="text-stone-600 font-medium">Podcast</span>
              </div>
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-stone-900">Podcast</h1>
                <button onClick={() => setShowUp(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white hover:opacity-90" style={{ background: O }}>
                  <Plus size={12} /> Nuevo episodio
                </button>
              </div>
              <p className="text-sm text-stone-500 mt-1">Todos los episodios</p>
            </div>
            {loadingEps ? (
              <Skel n={5} />
            ) : eps.length === 0 ? (
              <div className="rounded-xl border border-stone-200 bg-white p-8 text-center">
                <p className="text-sm text-stone-500 mb-4">Aún no cargaste ningún episodio.</p>
                <button onClick={() => setShowUp(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90" style={{ background: O }}>
                  <Plus size={14} /> Cargá tu primer episodio
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {eps.map((e, i) => (
                  <button
                    key={e.id || i}
                    onClick={() => { setIdx(i); setPhase(e.status === "complete" ? "done" : null); setActiveView('workspace'); }}
                    className="w-full flex items-center justify-between gap-3 text-left rounded-xl border border-stone-200 bg-white px-4 py-3 hover:border-orange-200 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: OL }}>
                        <Mic size={14} color={O} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">{e.name}</p>
                        {e.status === 'complete' && <p className="text-[11px] text-green-600 flex items-center gap-1 mt-0.5"><CheckCircle2 size={10} /> Completo</p>}
                      </div>
                    </div>
                    <ChevronDown size={14} color={MU} className="rotate-[-90deg] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : !ep ? (
          <InicioView
            eps={eps}
            draftLearnings={draftLearnings}
            onOpenEpisode={(i) => { setIdx(i); setPhase(eps[i]?.status === "complete" ? "done" : null); setActiveView('workspace'); }}
            onGo={goTo}
            onOpenUpload={() => setShowUp(true)}
          />
        ) : (
          <div className="max-w-3xl mx-auto px-6 py-6">
            {/* Breadcrumb — Sprint 1 */}
            <div className="mb-3 flex items-center gap-1.5 text-xs text-stone-400">
              <button onClick={() => goTo('inicio')} className="hover:text-stone-600 transition-colors">CMO</button>
              <span>/</span>
              <button onClick={() => goTo('podcast')} className="hover:text-stone-600 transition-colors">Podcast</button>
              <span>/</span>
              <span className="text-stone-600 font-medium truncate max-w-[320px]">{ep.name}</span>
            </div>
            <div className="mb-5"><h1 className="text-xl font-bold text-stone-900">{ep.name}</h1>
              {phase === "angles" && <p className="text-xs text-orange-500 mt-1 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Analizando episodio...</p>}
              {phase === "waiting_selection" && <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">✨ Selecciona los ángulos que más te gusten</p>}
              {(phase === "contenido" || phase === "minado") && <p className="text-xs text-orange-500 mt-1 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Generando contenido...</p>}
              {phase === "done" && <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle2 size={12} /> Contenido generado</p>}
            </div>
            <Mapa mapa={ep.mapa} open={mapaOpen} toggle={() => setMapaOpen(!mapaOpen)} />
            {phase && phase !== "done" && phase !== "waiting_selection" && <GenStatus phase={phase} />}
            <div className="flex items-center gap-1 mb-5 border-b border-stone-200">{tabs.map(t => <button key={t.key} onClick={() => setTab(t.key)} className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2" style={{ borderColor: tab === t.key ? O : "transparent", color: tab === t.key ? O : MU }}><span>{t.icon}</span> {t.label}</button>)}</div>
            {tab === "contenido" && <ContenidoTab ep={ep} phase={phase} onUpdate={updateEp} onLearn={addLearning} onGenerate={generateContent} generatingContent={genContent} />}
            {tab === "repurpose" && <RepurposeTab ep={ep} onUpdate={updateEp} onLearn={addLearning} />}
            {tab === "minado" && <MinadoTab ep={ep} phase={phase} onUpdate={updateEp} onLearn={addLearning} />}
          </div>
        )}
      </div>
      {showUp && <UploadModal onClose={() => setShowUp(false)} onSubmit={startGen} />}
    </div>
  );
}
