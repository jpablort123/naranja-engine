"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { Check, ChevronDown, ChevronUp, Plus, X, Loader2, Sparkles, CheckCircle2, FileText, Upload, Mic, Rss, Brain, BookOpen, Lightbulb, Calendar, Home as HomeIcon, Mail, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import {
  O, OL, OB, GR, GL, MU,
  api, CopyBtn, BankBtn, Skel, Badge,
  EditableText, ApplyBar, EditModal, AIEditBtn,
  SendToParrillaBtn,
} from "@/components/ui";
const LearningsReview = dynamic(() => import("@/components/LearningsReview"), { ssr: false });
const ProtocolosViewer = dynamic(() => import("@/components/ProtocolosViewer"), { ssr: false });
const FixtureBoard = dynamic(() => import("@/components/FixtureBoard"), { ssr: false });
const ParrillaView = dynamic(() => import("@/components/ParrillaView"), { ssr: false });
const InicioView = dynamic(() => import("@/components/InicioView"), { ssr: false });
const NewsletterUploadModal = dynamic(() => import("@/components/NewsletterUploadModal"), { ssr: false });
const NewsletterView = dynamic(() => import("@/components/NewsletterView"), { ssr: false });

async function generate(body) { return api("/api/generate", { method: "POST", body: JSON.stringify(body) }); }

// ═══ FEATURE FLAGS ═══
// Parrilla queda oculta en UI (código conservado). Cambiar a true para reactivar.
const SHOW_PARRILLA = false;

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

// ═══ TAB: REELS (v2) ═══
// Estructura por ángulo: card con propuestas [{ hooks[], desarrollo, ctas[], selected_hook_idx, selected_cta_idx, guion_final }].
// La generación arranca al entrar al tab.
function ReelsTab({ ep, onUpdate, onLearn }) {
  const angulos = ep.ideas || [];
  const sel = ep.selected_ideas || [];
  const selectedAngles = sel.map(i => angulos[i]).filter(Boolean);
  const rp = ep.repurpose_content;
  const cards = rp?.reels_v2;

  const [generating, setGenerating] = useState(false);
  const [variantLoading, setVariantLoading] = useState({}); // { [cardIdx]: bool }
  const [activePropuesta, setActivePropuesta] = useState({}); // { [cardIdx]: propuestaIdx }
  const [editM, setEditM] = useState(null);
  // Prompt inline de motivo de descarte. { type: 'hook'|'cta'|'propuesta', ci, pi, idx?, original_content, proposed_change, motivo }
  const [pendingDelete, setPendingDelete] = useState(null);
  const triggered = useRef(false);
  const promptRef = useRef(null);
  // Ref al estado más reciente de pendingDelete/cards para evitar cerraduras stale en handlers globales
  const stateRef = useRef({ pendingDelete: null, cards: null });

  const doGenerate = useCallback(async () => {
    if (selectedAngles.length === 0) return;
    setGenerating(true);
    const res = await generate({ episode_id: ep.id, phase: "reels_v2", selected_angles: selectedAngles, mapa: ep.mapa });
    if (res.result?.cards) {
      onUpdate({ repurpose_content: { ...(rp || {}), reels_v2: res.result.cards } });
    }
    setGenerating(false);
  }, [ep, rp, selectedAngles, onUpdate]);

  // Auto-generar al entrar al tab si aún no se generó
  useEffect(() => {
    if (triggered.current) return;
    if (cards || generating) return;
    if (selectedAngles.length === 0) return;
    triggered.current = true;
    doGenerate();
  }, [cards, generating, selectedAngles, doGenerate]);

  const patchCards = (nextCards) => onUpdate({ repurpose_content: { ...(rp || {}), reels_v2: nextCards } });

  const patchPropuesta = (ci, pi, patch) => {
    const next = cards.map((c, i) => {
      if (i !== ci) return c;
      const propuestas = c.propuestas.map((p, j) => j === pi ? { ...p, ...patch } : p);
      return { ...c, propuestas };
    });
    patchCards(next);
  };

  const setSelectedHook = (ci, pi, idx) => patchPropuesta(ci, pi, { selected_hook_idx: idx });
  const setSelectedCierre = (ci, pi, idx) => patchPropuesta(ci, pi, { selected_cierre_idx: idx });
  const setSelectedCta = (ci, pi, idx) => patchPropuesta(ci, pi, { selected_cta_idx: idx });

  const removeHookNow = (nextCards, ci, pi, idx) => {
    const target = nextCards[ci].propuestas[pi];
    const hooks = target.hooks.filter((_, k) => k !== idx);
    let selHook = target.selected_hook_idx;
    if (selHook === idx) selHook = null;
    else if (typeof selHook === 'number' && selHook > idx) selHook -= 1;
    return nextCards.map((c, i) => i !== ci ? c : {
      ...c,
      propuestas: c.propuestas.map((p, j) => j !== pi ? p : { ...p, hooks, selected_hook_idx: selHook }),
    });
  };
  const removeCtaNow = (nextCards, ci, pi, idx) => {
    const target = nextCards[ci].propuestas[pi];
    const ctas = target.ctas.filter((_, k) => k !== idx);
    let selCta = target.selected_cta_idx;
    if (selCta === idx) selCta = null;
    else if (typeof selCta === 'number' && selCta > idx) selCta -= 1;
    return nextCards.map((c, i) => i !== ci ? c : {
      ...c,
      propuestas: c.propuestas.map((p, j) => j !== pi ? p : { ...p, ctas, selected_cta_idx: selCta }),
    });
  };
  const removeCierreNow = (nextCards, ci, pi, idx) => {
    const target = nextCards[ci].propuestas[pi];
    const cierres = (target.cierres || []).filter((_, k) => k !== idx);
    let selC = target.selected_cierre_idx;
    if (selC === idx) selC = null;
    else if (typeof selC === 'number' && selC > idx) selC -= 1;
    return nextCards.map((c, i) => i !== ci ? c : {
      ...c,
      propuestas: c.propuestas.map((p, j) => j !== pi ? p : { ...p, cierres, selected_cierre_idx: selC }),
    });
  };
  const removePropuestaNow = (nextCards, ci, pi) => {
    return nextCards.map((c, i) => i !== ci ? c : {
      ...c,
      propuestas: c.propuestas.filter((_, j) => j !== pi),
    });
  };

  const commitDelete = useCallback((motivo) => {
    const pd = stateRef.current.pendingDelete;
    const current = stateRef.current.cards;
    if (!pd || !current) return;
    onLearn('reels', motivo || '', {
      allowEmpty: true,
      original_content: pd.original_content || '',
      proposed_change: pd.proposed_change || null,
      target_protocol_name: 'reels',
    });
    let next = current;
    if (pd.type === 'hook') next = removeHookNow(next, pd.ci, pd.pi, pd.idx);
    else if (pd.type === 'cta') next = removeCtaNow(next, pd.ci, pd.pi, pd.idx);
    else if (pd.type === 'cierre') next = removeCierreNow(next, pd.ci, pd.pi, pd.idx);
    else if (pd.type === 'propuesta') {
      next = removePropuestaNow(next, pd.ci, pd.pi);
      // Ajustar propuesta activa si la eliminada era la activa o venía después
      setActivePropuesta(prev => {
        const cur = prev[pd.ci] ?? 0;
        let nn = cur;
        if (cur === pd.pi) nn = Math.max(0, cur - 1);
        else if (cur > pd.pi) nn = cur - 1;
        return { ...prev, [pd.ci]: nn };
      });
    }
    patchCards(next);
    setPendingDelete(null);
  }, [onLearn, onUpdate, rp]);

  // Mantener stateRef sincronizado con el estado más reciente
  useEffect(() => { stateRef.current = { pendingDelete, cards }; }, [pendingDelete, cards]);

  // Click fuera del prompt inline → commit con motivo vacío
  useEffect(() => {
    if (!pendingDelete) return;
    const handler = (e) => {
      if (promptRef.current && !promptRef.current.contains(e.target)) {
        commitDelete('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pendingDelete, commitDelete]);

  const openDeleteHook = (ci, pi, hi) => {
    if (pendingDelete) commitDelete(pendingDelete.motivo || '');
    const h = cards[ci].propuestas[pi].hooks[hi];
    const tipo = h?.tipo ? ` (${h.tipo})` : '';
    setPendingDelete({
      type: 'hook', ci, pi, idx: hi,
      original_content: h?.texto || '',
      proposed_change: `Hook descartado${tipo}`,
      motivo: '',
    });
  };
  const openDeleteCta = (ci, pi, cti) => {
    if (pendingDelete) commitDelete(pendingDelete.motivo || '');
    const c = cards[ci].propuestas[pi].ctas[cti];
    const tipo = c?.tipo ? ` (${c.tipo})` : '';
    setPendingDelete({
      type: 'cta', ci, pi, idx: cti,
      original_content: c?.texto || '',
      proposed_change: `CTA descartado${tipo}`,
      motivo: '',
    });
  };
  const openDeleteCierre = (ci, pi, cei) => {
    if (pendingDelete) commitDelete(pendingDelete.motivo || '');
    const c = (cards[ci].propuestas[pi].cierres || [])[cei];
    setPendingDelete({
      type: 'cierre', ci, pi, idx: cei,
      original_content: c?.texto || '',
      proposed_change: 'Cierre editorial descartado',
      motivo: '',
    });
  };
  const openDeletePropuesta = (ci, pi) => {
    if (pendingDelete) commitDelete(pendingDelete.motivo || '');
    const prop = cards[ci].propuestas[pi];
    const summary = [
      (prop.hooks || []).map(h => `Hook: ${h.texto}`).join('\n'),
      prop.desarrollo ? `Desarrollo: ${prop.desarrollo}` : '',
      (prop.cierres || []).map(c => `Cierre: ${c.texto}`).join('\n'),
      (prop.ctas || []).map(c => `CTA: ${c.texto}`).join('\n'),
    ].filter(Boolean).join('\n\n');
    setPendingDelete({
      type: 'propuesta', ci, pi,
      original_content: summary,
      proposed_change: 'Propuesta completa descartada',
      motivo: '',
    });
  };

  const armarGuion = (ci, pi) => {
    const prop = cards[ci].propuestas[pi];
    const hook = prop.hooks[prop.selected_hook_idx]?.texto || '';
    const cierre = (prop.cierres || [])[prop.selected_cierre_idx]?.texto || '';
    const cta = prop.ctas[prop.selected_cta_idx]?.texto || '';
    const generado = [hook, prop.desarrollo || '', cierre, cta].filter(Boolean).join('\n\n');
    const guion_final = prop.guion_final || {};
    patchPropuesta(ci, pi, {
      guion_final: {
        generado,
        libre: guion_final.libre ?? generado,
        cerrado: guion_final.cerrado ?? false,
      },
    });
  };

  const generarVariante = async (ci) => {
    setVariantLoading(prev => ({ ...prev, [ci]: true }));
    const angulo = { titulo: cards[ci].angulo_titulo, descripcion: cards[ci].angulo_descripcion };
    const res = await generate({ episode_id: ep.id, phase: "reels_variant", angulo, mapa: ep.mapa });
    if (res.result?.propuesta) {
      const next = cards.map((c, i) => i === ci ? { ...c, propuestas: [...c.propuestas, res.result.propuesta] } : c);
      patchCards(next);
      setActivePropuesta(prev => ({ ...prev, [ci]: next[ci].propuestas.length - 1 }));
    }
    setVariantLoading(prev => ({ ...prev, [ci]: false }));
  };

  const applyDesarrolloFb = async (ci, pi, fb) => {
    const prop = cards[ci].propuestas[pi];
    const res = await generate({ prompt: `Desarrollo actual del guión de reel:\n"${prop.desarrollo}"\n\nFeedback: ${fb}\n\nRegenera aplicando el feedback, manteniendo 120-180 palabras.\nJSON: { "desarrollo": "cuerpo regenerado" }` });
    if (res.result?.desarrollo) patchPropuesta(ci, pi, { desarrollo: res.result.desarrollo });
    onLearn("reels", fb);
  };

  const applyHookFb = async (ci, pi, hi, fb) => {
    const prop = cards[ci].propuestas[pi];
    const hook = prop.hooks[hi];
    const res = await generate({ prompt: `Hook actual de guión de reel:\n"${hook.texto}"\n\nFeedback: ${fb}\n\nRegenera aplicando el feedback. Mantener el hook corto (5-15 palabras).\nJSON: { "texto": "hook regenerado" }` });
    if (res.result?.texto) {
      const hooks = prop.hooks.map((h, k) => k === hi ? { ...h, texto: res.result.texto } : h);
      patchPropuesta(ci, pi, { hooks });
    }
    onLearn("reels", fb);
  };

  const applyCtaFb = async (ci, pi, cti, fb) => {
    const prop = cards[ci].propuestas[pi];
    const cta = prop.ctas[cti];
    const res = await generate({ prompt: `Call to action actual de guión de reel:\n"${cta.texto}"\n\nFeedback: ${fb}\n\nRegenera aplicando el feedback. Mantener 1-2 frases.\nJSON: { "texto": "CTA regenerado" }` });
    if (res.result?.texto) {
      const ctas = prop.ctas.map((c, k) => k === cti ? { ...c, texto: res.result.texto } : c);
      patchPropuesta(ci, pi, { ctas });
    }
    onLearn("reels", fb);
  };

  const applyCierreFb = async (ci, pi, cei, fb) => {
    const prop = cards[ci].propuestas[pi];
    const cierre = (prop.cierres || [])[cei];
    const res = await generate({ prompt: `Cierre editorial actual de guión de reel:\n"${cierre.texto}"\n\nFeedback: ${fb}\n\nRegenera aplicando el feedback. Mantener 1-2 frases que rematan el argumento sin pedir acción.\nJSON: { "texto": "cierre regenerado" }` });
    if (res.result?.texto) {
      const cierres = (prop.cierres || []).map((c, k) => k === cei ? { ...c, texto: res.result.texto } : c);
      patchPropuesta(ci, pi, { cierres });
    }
    onLearn("reels", fb);
  };

  if (sel.length === 0) return <div className="rounded-xl border border-stone-200 bg-white p-8 text-center"><p className="text-sm text-stone-500">Primero selecciona ángulos en el tab Episodio</p></div>;

  if (generating && !cards) return <div className="rounded-xl border border-stone-200 bg-white p-5">
    <h3 className="font-semibold text-[15px] text-stone-800 mb-3">🎥 Guiones de reel</h3>
    <p className="text-xs text-orange-500 mb-3 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Generando hooks, desarrollo y CTAs por cada ángulo...</p>
    <Skel n={6} />
  </div>;

  if (!cards) return <div className="rounded-xl border border-stone-200 bg-white p-5">
    <h3 className="font-semibold text-[15px] text-stone-800 mb-2">🎥 Generar reels</h3>
    <p className="text-xs text-stone-400 mb-4">{selectedAngles.length} ángulos seleccionados</p>
    <button onClick={doGenerate} className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90" style={{ background: O }}>
      <Sparkles size={16} /> Generar reels
    </button>
  </div>;

  return <div className="space-y-4">
    {cards.map((card, ci) => {
      const pIdx = activePropuesta[ci] ?? 0;
      const prop = card.propuestas[pIdx] || card.propuestas[0];
      const hookOk = typeof prop.selected_hook_idx === 'number' && prop.hooks[prop.selected_hook_idx];
      const cierresList = prop.cierres || [];
      const cierreOk = typeof prop.selected_cierre_idx === 'number' && cierresList[prop.selected_cierre_idx];
      const ctaOk = typeof prop.selected_cta_idx === 'number' && prop.ctas[prop.selected_cta_idx];
      const canArmar = hookOk && cierreOk && ctaOk;
      const gf = prop.guion_final;

      return <div key={ci} className="rounded-xl border border-stone-200 bg-white p-5">
        <div className="flex items-start gap-2 mb-3 flex-wrap">
          <span className="text-xs font-bold text-stone-400">#{ci + 1}</span>
          <p className="text-sm font-semibold text-stone-800 flex-1 min-w-0">{card.angulo_titulo}</p>
          {card.angulo_tipo && <Badge label={card.angulo_tipo} />}
        </div>

        {/* Tabs de propuestas dentro de la card */}
        {card.propuestas.length > 1 && (
          <div className="flex items-center gap-1 mb-4 border-b border-stone-200">
            {card.propuestas.map((_, pi) => {
              const active = pIdx === pi;
              return <div key={pi} className="relative group inline-flex items-center">
                <button onClick={() => setActivePropuesta(prev => ({ ...prev, [ci]: pi }))}
                  className="pl-3 pr-6 py-2 text-xs font-medium border-b-2"
                  style={{ borderColor: active ? O : "transparent", color: active ? O : MU }}>
                  Propuesta {pi + 1}
                </button>
                <button onClick={() => openDeletePropuesta(ci, pi)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-stone-100 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Eliminar propuesta">
                  <X size={11} color={MU} />
                </button>
              </div>;
            })}
          </div>
        )}

        {/* Prompt de motivo cuando se descarta la propuesta actual */}
        {pendingDelete?.type === 'propuesta' && pendingDelete.ci === ci && pendingDelete.pi === pIdx && (
          <DeleteReasonPrompt refEl={promptRef} value={pendingDelete.motivo}
            onChange={m => setPendingDelete(prev => prev ? { ...prev, motivo: m } : prev)}
            onSkip={() => commitDelete('')}
            onConfirm={() => commitDelete(pendingDelete.motivo)}
            label="¿Por qué descartás esta propuesta? (opcional)" />
        )}

        {/* HOOKS */}
        <div className="mb-4">
          <p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mb-2">Hooks</p>
          <div className="space-y-1.5">{prop.hooks.map((h, hi) => {
            const selected = prop.selected_hook_idx === hi;
            const pending = pendingDelete?.type === 'hook' && pendingDelete.ci === ci && pendingDelete.pi === pIdx && pendingDelete.idx === hi;
            return <div key={hi}>
              <div className="flex items-start gap-2 p-2.5 rounded-lg border transition-all" style={{ borderColor: selected ? O : "#E7E5E4", background: selected ? OL : "white" }}>
                <button onClick={() => setSelectedHook(ci, pIdx, hi)} className="mt-0.5 shrink-0">
                  <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{ borderColor: selected ? O : "#D6D3D1", background: selected ? O : "white" }}>
                    {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
                <p className="text-sm text-stone-700 flex-1 min-w-0">{h.texto}</p>
                <AIEditBtn onClick={() => setEditM({ title: `Hook`, content: h.texto, ci, pi: pIdx, idx: hi, kind: 'hook' })} />
                <button onClick={() => openDeleteHook(ci, pIdx, hi)} className="p-1 rounded hover:bg-stone-100 shrink-0" title="Eliminar hook"><X size={12} color={MU} /></button>
              </div>
              {pending && (
                <DeleteReasonPrompt refEl={promptRef} value={pendingDelete.motivo}
                  onChange={m => setPendingDelete(prev => prev ? { ...prev, motivo: m } : prev)}
                  onSkip={() => commitDelete('')}
                  onConfirm={() => commitDelete(pendingDelete.motivo)}
                  label="¿Por qué lo descartás? (opcional)" />
              )}
            </div>;
          })}</div>
        </div>

        {/* DESARROLLO */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest">Desarrollo</p>
            <AIEditBtn onClick={() => setEditM({ title: `Desarrollo — ${card.angulo_titulo}`, content: prop.desarrollo, ci, pi: pIdx })} />
          </div>
          <div className="rounded-lg border border-stone-200 p-3">
            <EditableText text={prop.desarrollo} onSave={v => patchPropuesta(ci, pIdx, { desarrollo: v })} multiline />
          </div>
        </div>

        {/* CIERRE EDITORIAL */}
        <div className="mb-4">
          <p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mb-2">Cierre editorial</p>
          <div className="space-y-1.5">{cierresList.map((c, cei) => {
            const selected = prop.selected_cierre_idx === cei;
            const pending = pendingDelete?.type === 'cierre' && pendingDelete.ci === ci && pendingDelete.pi === pIdx && pendingDelete.idx === cei;
            return <div key={cei}>
              <div className="flex items-start gap-2 p-2.5 rounded-lg border transition-all" style={{ borderColor: selected ? O : "#E7E5E4", background: selected ? OL : "white" }}>
                <button onClick={() => setSelectedCierre(ci, pIdx, cei)} className="mt-0.5 shrink-0">
                  <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{ borderColor: selected ? O : "#D6D3D1", background: selected ? O : "white" }}>
                    {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
                <p className="text-sm text-stone-700 flex-1 min-w-0">{c.texto}</p>
                <AIEditBtn onClick={() => setEditM({ title: `Cierre editorial`, content: c.texto, ci, pi: pIdx, idx: cei, kind: 'cierre' })} />
                <button onClick={() => openDeleteCierre(ci, pIdx, cei)} className="p-1 rounded hover:bg-stone-100 shrink-0" title="Eliminar cierre"><X size={12} color={MU} /></button>
              </div>
              {pending && (
                <DeleteReasonPrompt refEl={promptRef} value={pendingDelete.motivo}
                  onChange={m => setPendingDelete(prev => prev ? { ...prev, motivo: m } : prev)}
                  onSkip={() => commitDelete('')}
                  onConfirm={() => commitDelete(pendingDelete.motivo)}
                  label="¿Por qué lo descartás? (opcional)" />
              )}
            </div>;
          })}</div>
        </div>

        {/* CTA DE ACCIÓN */}
        <div className="mb-4">
          <p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mb-2">CTA de acción</p>
          <div className="space-y-1.5">{prop.ctas.map((c, cti) => {
            const selected = prop.selected_cta_idx === cti;
            const pending = pendingDelete?.type === 'cta' && pendingDelete.ci === ci && pendingDelete.pi === pIdx && pendingDelete.idx === cti;
            return <div key={cti}>
              <div className="flex items-start gap-2 p-2.5 rounded-lg border transition-all" style={{ borderColor: selected ? O : "#E7E5E4", background: selected ? OL : "white" }}>
                <button onClick={() => setSelectedCta(ci, pIdx, cti)} className="mt-0.5 shrink-0">
                  <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{ borderColor: selected ? O : "#D6D3D1", background: selected ? O : "white" }}>
                    {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
                <p className="text-sm text-stone-700 flex-1 min-w-0">{c.texto}</p>
                <AIEditBtn onClick={() => setEditM({ title: `CTA de acción`, content: c.texto, ci, pi: pIdx, idx: cti, kind: 'cta' })} />
                <button onClick={() => openDeleteCta(ci, pIdx, cti)} className="p-1 rounded hover:bg-stone-100 shrink-0" title="Eliminar CTA"><X size={12} color={MU} /></button>
              </div>
              {pending && (
                <DeleteReasonPrompt refEl={promptRef} value={pendingDelete.motivo}
                  onChange={m => setPendingDelete(prev => prev ? { ...prev, motivo: m } : prev)}
                  onSkip={() => commitDelete('')}
                  onConfirm={() => commitDelete(pendingDelete.motivo)}
                  label="¿Por qué lo descartás? (opcional)" />
              )}
            </div>;
          })}</div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => armarGuion(ci, pIdx)} disabled={!canArmar}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90"
            style={{ background: canArmar ? O : "#D6D3D1", cursor: canArmar ? "pointer" : "not-allowed" }}>
            <Sparkles size={14} /> Armar guión
          </button>
          <button onClick={() => generarVariante(ci)} disabled={variantLoading[ci]}
            className="px-3 py-2.5 rounded-xl text-sm font-medium border border-stone-200 hover:bg-orange-50 flex items-center gap-1.5"
            style={{ color: O, borderColor: OB }}>
            {variantLoading[ci] ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Generar variante
          </button>
        </div>

        {/* GUIÓN FINAL */}
        {gf && (
          <div className="mt-5 rounded-xl border p-4" style={{ borderColor: OB, background: OL }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-stone-700 uppercase tracking-widest">Guión final</p>
              {gf.cerrado && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: GL, color: GR }}>✓ Cerrado</span>}
            </div>
            <p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mb-1">Sugerencia (hook + desarrollo + cierre + CTA)</p>
            <p className="text-sm text-stone-700 whitespace-pre-wrap mb-4">{gf.generado}</p>
            <p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mb-1">Versión final de copy</p>
            <textarea value={gf.libre || ''} onChange={e => patchPropuesta(ci, pIdx, { guion_final: { ...gf, libre: e.target.value } })}
              className="w-full text-sm border border-stone-200 rounded-lg p-3 focus:outline-none focus:border-orange-300 min-h-[120px] bg-white" />
            <div className="flex items-center justify-end gap-2 mt-2">
              <CopyBtn text={gf.libre || gf.generado} />
              {!gf.cerrado ? (
                <button onClick={() => patchPropuesta(ci, pIdx, { guion_final: { ...gf, cerrado: true } })}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 flex items-center gap-1.5"
                  style={{ background: GR }}>
                  <CheckCircle2 size={14} /> Marcar como cerrado
                </button>
              ) : (
                <button onClick={() => patchPropuesta(ci, pIdx, { guion_final: { ...gf, cerrado: false } })}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-stone-500 hover:bg-stone-100">
                  Reabrir
                </button>
              )}
            </div>
          </div>
        )}
      </div>;
    })}

    <button onClick={() => { triggered.current = false; onUpdate({ repurpose_content: { ...(rp || {}), reels_v2: null } }); }} className="text-sm text-stone-400 hover:text-stone-600">← Regenerar reels</button>

    {editM && <EditModal title={editM.title} content={editM.content}
      onClose={() => setEditM(null)}
      onApply={async fb => {
        if (editM.kind === 'hook') await applyHookFb(editM.ci, editM.pi, editM.idx, fb);
        else if (editM.kind === 'cta') await applyCtaFb(editM.ci, editM.pi, editM.idx, fb);
        else if (editM.kind === 'cierre') await applyCierreFb(editM.ci, editM.pi, editM.idx, fb);
        else await applyDesarrolloFb(editM.ci, editM.pi, fb);
        setEditM(null);
      }} />}
  </div>;
}

// Prompt inline para capturar motivo de descarte. No bloquea: click fuera commit con motivo vacío.
function DeleteReasonPrompt({ refEl, value, onChange, onSkip, onConfirm, label }) {
  return (
    <div ref={refEl} className="mt-1.5 mb-1.5 ml-6 rounded-lg border border-stone-200 bg-stone-50 p-2.5">
      <p className="text-[11px] text-stone-500 mb-1.5">{label}</p>
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onConfirm(); }}
          placeholder="Motivo (opcional)"
          className="flex-1 text-xs px-2.5 py-1.5 rounded-md border border-stone-200 bg-white focus:outline-none focus:border-orange-300"
        />
        <button onClick={onSkip} className="text-xs px-2.5 py-1.5 rounded-md text-stone-500 hover:bg-stone-100">Omitir</button>
        <button onClick={onConfirm} className="text-xs px-3 py-1.5 rounded-md text-white hover:opacity-90" style={{ background: O }}>Confirmar</button>
      </div>
    </div>
  );
}

// ═══ TAB: INTROS ═══
function IntrosTab({ ep, onUpdate, onLearn }) {
  const angulos = ep.ideas || [];
  const sel = ep.selected_ideas || [];
  const selectedAngles = sel.map(i => angulos[i]).filter(Boolean);
  const rp = ep.repurpose_content;
  const intros = rp?.intros;

  const [generating, setGenerating] = useState(false);
  const [editM, setEditM] = useState(null);

  const doGenerate = async () => {
    if (selectedAngles.length === 0) return;
    setGenerating(true);
    const res = await generate({ episode_id: ep.id, phase: "intros_only", selected_angles: selectedAngles, mapa: ep.mapa });
    if (res.result?.intros) onUpdate({ repurpose_content: { ...(rp || {}), intros: res.result.intros } });
    setGenerating(false);
  };

  const applyIntroFb = async (idx, fb) => {
    const intro = intros[idx];
    const res = await generate({ prompt: `Intro actual:\n"${intro.texto}"\n\nFeedback: ${fb}\n\nRegenera aplicando feedback.\nJSON: { "texto": "intro regenerado", "titulo": "${intro.titulo}", "formula": "${intro.formula}" }` });
    if (res.result?.texto) {
      const n = [...intros]; n[idx] = { ...n[idx], ...res.result };
      onUpdate({ repurpose_content: { ...rp, intros: n } });
    }
    onLearn("intros", fb);
  };

  if (sel.length === 0) return <div className="rounded-xl border border-stone-200 bg-white p-8 text-center"><p className="text-sm text-stone-500">Primero selecciona ángulos en el tab Episodio</p></div>;

  if (!intros) return <div className="rounded-xl border border-stone-200 bg-white p-8 text-center">
    <h3 className="font-semibold text-[15px] text-stone-800 mb-2">🎤 Intros leídos</h3>
    <p className="text-xs text-stone-400 mb-5">{selectedAngles.length} ángulos seleccionados</p>
    <button onClick={doGenerate} disabled={generating} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90" style={{ background: O }}>
      {generating ? <><Loader2 size={14} className="animate-spin" /> Generando intros...</> : <><Sparkles size={14} /> Generar intros</>}
    </button>
  </div>;

  return <div className="rounded-xl border border-stone-200 bg-white p-5">
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-semibold text-[15px] text-stone-800">🎤 Intros leídos</h3>
      <button onClick={() => onUpdate({ repurpose_content: { ...rp, intros: null } })} className="text-xs text-stone-400 hover:text-stone-600">← Regenerar</button>
    </div>
    <div className="space-y-3">{intros.map((intro, i) => <div key={i} className="rounded-xl border border-stone-200 p-4">
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0"><span className="text-xs font-bold text-stone-400">#{i + 1}</span><p className="text-sm font-medium text-stone-800">{intro.titulo}</p><Badge label={intro.formula} /></div>
        <div className="flex items-center gap-1 shrink-0"><AIEditBtn onClick={() => setEditM({ title: `Intro #${i + 1}`, content: intro.texto, idx: i })} /><CopyBtn text={intro.texto} /></div>
      </div>
      <EditableText text={intro.texto} onSave={v => { const n = [...intros]; n[i] = { ...n[i], texto: v }; onUpdate({ repurpose_content: { ...rp, intros: n } }); }} multiline />
    </div>)}</div>
    {editM && <EditModal title={editM.title} content={editM.content} onClose={() => setEditM(null)} onApply={async fb => { await applyIntroFb(editM.idx, fb); setEditM(null); }} />}
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
        <SendToParrillaBtn pieces={parrillaPieces} source={{ id: ep.id, name: ep.name, origin_type: 'episode', label_prefix: 'Ep. ' }} />
      </div>
    )}
    {/* VOZ EN OFF — oculto en UI (data se conserva en minado.voz_en_off) */}

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
  const [tab, setTab] = useState("episodio"); const [showUp, setShowUp] = useState(false);
  const [phase, setPhase] = useState(null); const [mapaOpen, setMapaOpen] = useState(false);
  const [learnings, setLearnings] = useState([]); const [loadingEps, setLoadingEps] = useState(true);
  const [genContent, setGenContent] = useState(false);
  const [activeView, setActiveView] = useState("inicio"); // inicio | podcast | newsletter | newsletter_workspace | workspace | learnings | protocolos | fixture | parrilla
  const [parrillaInboxCount, setParrillaInboxCount] = useState(0);
  const [podcastExpanded, setPodcastExpanded] = useState(true);

  // ── Sprint 3: Newsletter state
  const [nls, setNls] = useState([]); const [nlIdx, setNlIdx] = useState(-1);
  const [nlPhase, setNlPhase] = useState(null);
  const [loadingNls, setLoadingNls] = useState(true);
  const [showNlUpload, setShowNlUpload] = useState(false);
  const [newsletterExpanded, setNewsletterExpanded] = useState(true);

  // ── Sprint 4: Inicio en vivo
  const [ideas, setIdeas] = useState([]);
  const [upcomingParrilla, setUpcomingParrilla] = useState([]);

  const ep = idx >= 0 ? eps[idx] : null;
  const nl = nlIdx >= 0 ? nls[nlIdx] : null;

  useEffect(() => {
    api("/api/episodes").then(data => { setEps(Array.isArray(data) ? data : []); setLoadingEps(false); });
    api("/api/newsletters").then(data => { setNls(Array.isArray(data) ? data : []); setLoadingNls(false); });
    // ── Sprint 4: cargar datos del Inicio en vivo
    api("/api/ideas").then(data => { setIdeas(Array.isArray(data) ? data : []); });
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    api(`/api/parrilla?status=scheduled&date_from=${today}`).then(data => {
      setUpcomingParrilla(Array.isArray(data) ? data : []);
    });
    // Seed inicial del badge de aprendizajes con los drafts reales del DB
    api("/api/learnings").then(data => {
      if (Array.isArray(data)) setLearnings(data);
    });
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

  const addLearning = useCallback((section, feedback, extras = {}) => {
    if (!ep?.id) return;
    const allowEmpty = extras.allowEmpty === true;
    if (!allowEmpty && !feedback?.trim()) return;
    const learning = {
      episode_id: ep.id,
      section,
      feedback: feedback || "",
      original_content: extras.original_content || "",
      proposed_change: extras.proposed_change || null,
      target_protocol_name: extras.target_protocol_name || section,
    };
    api("/api/learnings", { method: "POST", body: JSON.stringify(learning) });
    setLearnings(prev => [...prev, { ...learning, status: "draft" }]);
  }, [ep]);

  // ── Sprint 3: Newsletter helpers (espejo de los del podcast) ──
  const updateNl = useCallback((patch) => {
    setNls(prev => prev.map((n, i) => i === nlIdx ? { ...n, ...patch } : n));
    if (nl?.id) {
      const cleanPatch = { ...patch };
      if (Object.keys(cleanPatch).length > 0) {
        api("/api/newsletters", { method: "PUT", body: JSON.stringify({ id: nl.id, ...cleanPatch }) });
      }
    }
  }, [nlIdx, nl]);

  const addLearningNl = useCallback((section, feedback) => {
    if (!feedback?.trim() || !nl?.id) return;
    const learning = { newsletter_id: nl.id, section, feedback, original_content: "", target_protocol_name: section };
    api("/api/learnings", { method: "POST", body: JSON.stringify(learning) });
    setLearnings(prev => [...prev, { ...learning, status: "draft" }]);
  }, [nl]);

  const deleteEp = useCallback(async (i) => {
    const e = eps[i];
    if (!e?.id) return;
    if (!confirm(`¿Seguro que quieres eliminar este episodio?\n\n"${e.name}"`)) return;
    const res = await api(`/api/episodes?id=${e.id}`, { method: "DELETE" });
    if (res?.error) { alert("Error al eliminar: " + res.error); return; }
    setEps(prev => prev.filter(x => x.id !== e.id));
    if (idx === i) { setIdx(-1); setActiveView("podcast"); }
    else if (idx > i) setIdx(idx - 1);
  }, [eps, idx]);

  const deleteNl = useCallback(async (i) => {
    const n = nls[i];
    if (!n?.id) return;
    if (!confirm(`¿Seguro que quieres eliminar esta edición?\n\n"${n.name}"`)) return;
    const res = await api(`/api/newsletters?id=${n.id}`, { method: "DELETE" });
    if (res?.error) { alert("Error al eliminar: " + res.error); return; }
    setNls(prev => prev.filter(x => x.id !== n.id));
    if (nlIdx === i) { setNlIdx(-1); setActiveView("newsletter"); }
    else if (nlIdx > i) setNlIdx(nlIdx - 1);
  }, [nls, nlIdx]);

  const startNlGen = useCallback(async (name, articulo) => {
    const newNl = await api("/api/newsletters", { method: "POST", body: JSON.stringify({ name, articulo }) });
    if (newNl.error) { alert("Error: " + newNl.error); return; }
    setNls(prev => [newNl, ...prev]);
    setNlIdx(0); setShowNlUpload(false); setNlPhase("ideas"); setActiveView("newsletter_workspace");

    const r1 = await api("/api/newsletters/generate", {
      method: "POST",
      body: JSON.stringify({ newsletter_id: newNl.id, phase: "ideas" }),
    });
    if (r1?.result) {
      setNls(prev => prev.map(n => n.id === newNl.id
        ? { ...n, resumen: r1.result.resumen, ideas: r1.result.ideas, status: "ideas_ready" }
        : n));
    } else if (r1?.error) {
      alert("Error generando ideas: " + r1.error);
    }
    setNlPhase("waiting_selection");
  }, []);

  const generateNlRepurpose = useCallback(async (selectedIdeas) => {
    if (!nl?.id) return;
    setNlPhase("repurpose");
    const r = await api("/api/newsletters/generate", {
      method: "POST",
      body: JSON.stringify({ newsletter_id: nl.id, phase: "repurpose", selected_ideas: selectedIdeas }),
    });
    if (r?.result) {
      setNls(prev => prev.map(n => n.id === nl.id
        ? { ...n, repurpose_content: r.result, status: "complete" }
        : n));
    } else if (r?.error) {
      alert("Error generando repurpose: " + r.error);
    }
    setNlPhase("done");
  }, [nl]);

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

  const tabs = [
    { key: "episodio", label: "Episodio", icon: "📝" },
    { key: "reels", label: "Reels", icon: "🎥" },
    { key: "intros", label: "Intros", icon: "🎤" },
    { key: "minado", label: "Minado", icon: "⛏️" },
  ];
  const draftLearnings = learnings.filter(l => l.status === "draft").length;

  // ── Acción contextual del botón "+ Nuevo" según la superficie activa
  const contextualNew = (() => {
    if (activeView === "newsletter" || activeView === "newsletter_workspace") {
      return { label: "Nueva edición", onClick: () => setShowNlUpload(true) };
    }
    if (activeView === "inicio" || activeView === "podcast" || activeView === "workspace") {
      return { label: "Nuevo episodio", onClick: () => setShowUp(true) };
    }
    return null; // fixture / parrilla / learnings / protocolos: cada vista ya tiene su propia creación interna
  })();

  // ── Navegación helper desde InicioView y sidebar
  const goTo = (view) => {
    setIdx(-1);
    setNlIdx(-1);
    setActiveView(view);
  };

  // ── Estado activo de items expandibles
  const podcastActive = activeView === "podcast" || activeView === "workspace";
  const newsletterActive = activeView === "newsletter" || activeView === "newsletter_workspace";

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
                        <div key={e.id || i} className="group relative">
                          <button
                            onClick={() => { setIdx(i); setPhase(e.status === "complete" ? "done" : null); setActiveView("workspace"); }}
                            className="w-full text-left pl-2.5 pr-7 py-1.5 rounded-lg text-[11px] truncate transition-all"
                            style={{ background: epActive ? "#27272A" : "transparent", color: epActive ? "white" : "#A1A1AA" }}
                          >
                            {e.name}
                          </button>
                          <button
                            onClick={(ev) => { ev.stopPropagation(); deleteEp(i); }}
                            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-opacity"
                            title="Eliminar episodio"
                            aria-label="Eliminar episodio"
                          >
                            <Trash2 size={11} style={{ color: "rgba(255,255,255,0.5)" }} />
                          </button>
                        </div>
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

          {/* Newsletter (expandible) */}
          <div className="mb-1">
            <button
              onClick={() => setNewsletterExpanded(v => !v)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs transition-all"
              style={{ background: newsletterActive ? "rgba(234,88,12,0.15)" : "transparent" }}
            >
              <Mail size={14} style={{ color: newsletterActive ? "#EA580C" : "rgba(255,255,255,0.45)" }} />
              <span className="flex-1" style={{ color: newsletterActive ? "#EA580C" : "rgba(255,255,255,0.65)" }}>Newsletter</span>
              {newsletterExpanded
                ? <ChevronUp size={12} style={{ color: "rgba(255,255,255,0.35)" }} />
                : <ChevronDown size={12} style={{ color: "rgba(255,255,255,0.35)" }} />}
            </button>
            {newsletterExpanded && (
              <div className="ml-4 mt-1 mb-1 pl-3 space-y-0.5" style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                {loadingNls ? (
                  <p className="text-[11px] text-zinc-600 px-2 py-1">Cargando...</p>
                ) : nls.length === 0 ? (
                  <p className="text-[11px] text-zinc-600 px-2 py-1">Sin ediciones aún</p>
                ) : (
                  <>
                    {nls.slice(0, 5).map((n, i) => {
                      const nlActive = i === nlIdx && activeView === "newsletter_workspace";
                      return (
                        <div key={n.id || i} className="group relative">
                          <button
                            onClick={() => { setNlIdx(i); setNlPhase(n.status === "complete" ? "done" : n.status === "ideas_ready" ? "waiting_selection" : null); setActiveView("newsletter_workspace"); }}
                            className="w-full text-left pl-2.5 pr-7 py-1.5 rounded-lg text-[11px] truncate transition-all"
                            style={{ background: nlActive ? "#27272A" : "transparent", color: nlActive ? "white" : "#A1A1AA" }}
                          >
                            {n.name}
                          </button>
                          <button
                            onClick={(ev) => { ev.stopPropagation(); deleteNl(i); }}
                            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-opacity"
                            title="Eliminar edición"
                            aria-label="Eliminar edición"
                          >
                            <Trash2 size={11} style={{ color: "rgba(255,255,255,0.5)" }} />
                          </button>
                        </div>
                      );
                    })}
                    <button
                      onClick={() => goTo("newsletter")}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      Ver todas →
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Fixture */}
          <button
            onClick={() => goTo("fixture")}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs transition-all mb-1"
            style={{ background: activeView === "fixture" ? "rgba(234,88,12,0.15)" : "transparent" }}
          >
            <Lightbulb size={14} style={{ color: activeView === "fixture" ? "#EA580C" : "rgba(255,255,255,0.45)" }} />
            <span style={{ color: activeView === "fixture" ? "#EA580C" : "rgba(255,255,255,0.65)" }}>Fixture</span>
          </button>

          {/* Parrilla — oculto vía SHOW_PARRILLA */}
          {SHOW_PARRILLA && (
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
          )}

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
            nls={nls}
            ideas={ideas}
            upcomingParrilla={upcomingParrilla}
            draftLearnings={draftLearnings}
            onOpenEpisode={(i) => { setIdx(i); setPhase(eps[i]?.status === "complete" ? "done" : null); setActiveView('workspace'); }}
            onOpenNl={(i) => { setNlIdx(i); setNlPhase(nls[i]?.status === "complete" ? "done" : nls[i]?.status === "ideas_ready" ? "waiting_selection" : null); setActiveView('newsletter_workspace'); }}
            onGo={goTo}
            onOpenUpload={() => setShowUp(true)}
            onOpenNlUpload={() => setShowNlUpload(true)}
          />
        ) : activeView === 'newsletter' ? (
          <div className="max-w-3xl mx-auto px-6 py-8">
            <div className="mb-6">
              <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-2">
                <button onClick={() => goTo('inicio')} className="hover:text-stone-600 transition-colors">CMO</button>
                <span>/</span>
                <span className="text-stone-600 font-medium">Newsletter</span>
              </div>
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-stone-900">Newsletter</h1>
                <button onClick={() => setShowNlUpload(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white hover:opacity-90" style={{ background: O }}>
                  <Plus size={12} /> Nueva edición
                </button>
              </div>
              <p className="text-sm text-stone-500 mt-1">Todas las ediciones</p>
            </div>
            {loadingNls ? (
              <Skel n={5} />
            ) : nls.length === 0 ? (
              <div className="rounded-xl border border-stone-200 bg-white p-8 text-center">
                <p className="text-sm text-stone-500 mb-4">Aún no hay ediciones de newsletter.</p>
                <button onClick={() => setShowNlUpload(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90" style={{ background: O }}>
                  <Plus size={14} /> Nueva edición
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {nls.map((n, i) => (
                  <button
                    key={n.id || i}
                    onClick={() => { setNlIdx(i); setNlPhase(n.status === "complete" ? "done" : n.status === "ideas_ready" ? "waiting_selection" : null); setActiveView('newsletter_workspace'); }}
                    className="w-full flex items-center justify-between gap-3 text-left rounded-xl border border-stone-200 bg-white px-4 py-3 hover:border-orange-200 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: OL }}>
                        <Mail size={14} color={O} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">{n.name}</p>
                        {n.status === 'complete' && <p className="text-[11px] text-green-600 flex items-center gap-1 mt-0.5"><CheckCircle2 size={10} /> Completo</p>}
                        {n.status === 'ideas_ready' && <p className="text-[11px] text-amber-600 flex items-center gap-1 mt-0.5">✨ Ideas listas — esperando selección</p>}
                      </div>
                    </div>
                    <ChevronDown size={14} color={MU} className="rotate-[-90deg] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : activeView === 'newsletter_workspace' && nl ? (
          <div className="max-w-3xl mx-auto px-6 py-6">
            {/* Breadcrumb */}
            <div className="mb-3 flex items-center gap-1.5 text-xs text-stone-400">
              <button onClick={() => goTo('inicio')} className="hover:text-stone-600 transition-colors">CMO</button>
              <span>/</span>
              <button onClick={() => goTo('newsletter')} className="hover:text-stone-600 transition-colors">Newsletter</button>
              <span>/</span>
              <span className="text-stone-600 font-medium truncate max-w-[320px]">{nl.name}</span>
            </div>
            <div className="mb-5">
              <h1 className="text-xl font-bold text-stone-900">{nl.name}</h1>
              {nlPhase === "ideas" && <p className="text-xs text-orange-500 mt-1 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Analizando artículo + extrayendo ideas...</p>}
              {nlPhase === "waiting_selection" && <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">✨ Selecciona las ideas que querés repurpose-ar</p>}
              {nlPhase === "repurpose" && <p className="text-xs text-orange-500 mt-1 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Generando reel + carrusel + LinkedIn...</p>}
              {nlPhase === "done" && <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle2 size={12} /> Repurpose generado</p>}
            </div>
            <NewsletterView
              nl={nl}
              phase={nlPhase}
              onUpdate={updateNl}
              onLearn={addLearningNl}
              onGenerateRepurpose={generateNlRepurpose}
            />
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
            nls={nls}
            ideas={ideas}
            upcomingParrilla={upcomingParrilla}
            draftLearnings={draftLearnings}
            onOpenEpisode={(i) => { setIdx(i); setPhase(eps[i]?.status === "complete" ? "done" : null); setActiveView('workspace'); }}
            onOpenNl={(i) => { setNlIdx(i); setNlPhase(nls[i]?.status === "complete" ? "done" : nls[i]?.status === "ideas_ready" ? "waiting_selection" : null); setActiveView('newsletter_workspace'); }}
            onGo={goTo}
            onOpenUpload={() => setShowUp(true)}
            onOpenNlUpload={() => setShowNlUpload(true)}
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
            {tab === "episodio" && <ContenidoTab ep={ep} phase={phase} onUpdate={updateEp} onLearn={addLearning} onGenerate={generateContent} generatingContent={genContent} />}
            {tab === "reels" && <ReelsTab ep={ep} onUpdate={updateEp} onLearn={addLearning} />}
            {tab === "intros" && <IntrosTab ep={ep} onUpdate={updateEp} onLearn={addLearning} />}
            {tab === "minado" && <MinadoTab ep={ep} phase={phase} onUpdate={updateEp} onLearn={addLearning} />}
          </div>
        )}
      </div>
      {showUp && <UploadModal onClose={() => setShowUp(false)} onSubmit={startGen} />}
      {showNlUpload && <NewsletterUploadModal onClose={() => setShowNlUpload(false)} onSubmit={startNlGen} />}
    </div>
  );
}
