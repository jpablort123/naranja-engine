"use client";
import { useState, useEffect, useMemo } from "react";
import { Calendar, Plus, Loader2, X, ChevronRight, ChevronDown, ChevronLeft, ArrowLeft } from "lucide-react";

const O = "#EA580C", OL = "#FFF7ED", OB = "#FED7AA", MU = "#78716A";

const CONTENT_TYPES = {
  episodio:   { emoji: "📻", label: "Episodio"   },
  linkedin:   { emoji: "💼", label: "LinkedIn"   },
  reel:       { emoji: "🎬", label: "Reel"       },
  tiktok:     { emoji: "📱", label: "TikTok"     },
  newsletter: { emoji: "📨", label: "Newsletter" },
  carrousel:  { emoji: "🎠", label: "Carrousel"  },
};

const TYPE_KEYS = Object.keys(CONTENT_TYPES);

const ORIGIN_FILTERS = [
  { key: "all",       label: "Todos"       },
  { key: "episode",   label: "Episodio"    },
  { key: "newsletter",label: "Newsletter"  },
  { key: "fixture",   label: "Fixture"     },
];

const STATUS_STYLES = {
  gray:   { border: "#D6D3D1", bg: "#F5F5F4", dot: "#A8A29E" },
  yellow: { border: "#F59E0B", bg: "#FFFBEB", dot: "#F59E0B" },
  green:  { border: "#16A34A", bg: "#F0FDF4", dot: "#16A34A" },
};

// ─── Helpers de fecha ──────────────────────────────────────────────────────

function getMonday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // si es domingo, retrocede 6
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toISODate(d) {
  // YYYY-MM-DD en zona local (no UTC) para evitar saltos de día
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

function getISOWeek(d) {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return Math.ceil((((dt - yearStart) / 86400000) + 1) / 7);
}

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS_CORTOS = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

// ─── Helpers de estado ────────────────────────────────────────────────────

function getCardStatus(item) {
  const checklist = item.checklist || {};
  const keys = Object.keys(checklist);
  if (keys.length === 0) return "gray";
  const trueCount = keys.filter(k => checklist[k] === true).length;
  if (trueCount === 0) return "gray";
  if (trueCount === keys.length) return "green";
  return "yellow";
}

function checklistProgress(item) {
  const checklist = item.checklist || {};
  const keys = Object.keys(checklist);
  return { keys, done: keys.filter(k => checklist[k] === true).length };
}

// ─── Modal "+ Agregar contenido" ──────────────────────────────────────────

function NewItemModal({ onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState("linkedin");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const submit = async () => {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    await onCreate({
      title: title.trim(),
      content: content.trim() || null,
      content_type: contentType,
      origin_type: "manual",
    });
    setSubmitting(false);
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h3 className="font-semibold text-stone-800">Nueva pieza en parrilla</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100"><X size={18} color={MU} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-stone-600 block mb-1.5">Título</label>
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="¿Qué pieza vas a programar?" className="w-full px-4 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-orange-300" />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-600 block mb-1.5">Tipo</label>
            <select value={contentType} onChange={e => setContentType(e.target.value)} className="w-full px-4 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-orange-300 bg-white">
              {TYPE_KEYS.map(k => <option key={k} value={k}>{CONTENT_TYPES[k].emoji} {CONTENT_TYPES[k].label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-stone-600 block mb-1.5">Contenido <span className="text-stone-400 font-normal">(opcional)</span></label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={4} placeholder="Texto del post, guión, copy..." className="w-full px-4 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-orange-300 resize-y" />
          </div>
          <button onClick={submit} disabled={!title.trim() || submitting} className="w-full py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 flex items-center justify-center gap-2" style={{ background: title.trim() && !submitting ? O : "#D6D3D1", cursor: title.trim() && !submitting ? "pointer" : "not-allowed" }}>
            {submitting ? <><Loader2 size={14} className="animate-spin" /> Creando...</> : "Agregar al inbox"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Filas del inbox ───────────────────────────────────────────────────────

function InboxPiece({ item, onDragStart, onDragEnd, onDiscard }) {
  const meta = CONTENT_TYPES[item.content_type] || { emoji: "📄", label: item.content_type };
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", item.id); onDragStart(item.id); }}
      onDragEnd={onDragEnd}
      className="group flex items-center gap-2 px-2.5 py-2 rounded-lg border bg-white hover:bg-orange-50 hover:border-orange-200 cursor-grab active:cursor-grabbing transition-colors"
      style={{ borderColor: "#E7E5E4" }}
    >
      <span className="text-base shrink-0">{meta.emoji}</span>
      <p className="flex-1 text-xs text-stone-700 truncate" title={item.title}>{item.title}</p>
      <button
        onClick={(e) => { e.stopPropagation(); onDiscard(item.id); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 shrink-0"
        title="Descartar pieza"
      >
        <X size={12} className="text-stone-400 hover:text-red-500" />
      </button>
    </div>
  );
}

function IdeaGroupBlock({ groupId, groupTitle, originLabel, pieces, expanded, onToggle, onDragStart, onDragEnd, onDiscard }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-stone-50 transition-colors text-left">
        {expanded ? <ChevronDown size={14} color={MU} /> : <ChevronRight size={14} color={MU} />}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-stone-800 truncate">{groupTitle}</p>
          <p className="text-[10px] text-stone-500">{originLabel}{originLabel ? " · " : ""}{pieces.length} pieza{pieces.length === 1 ? "" : "s"}</p>
        </div>
      </button>
      {expanded && (
        <div className="px-2 pb-2 space-y-1">
          {pieces.map(p => (
            <InboxPiece key={p.id} item={p} onDragStart={onDragStart} onDragEnd={onDragEnd} onDiscard={onDiscard} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tarjeta del calendario ────────────────────────────────────────────────

function CalendarCard({ item, expanded, onToggle, onUpdate }) {
  const meta = CONTENT_TYPES[item.content_type] || { emoji: "📄", label: item.content_type };
  const statusKey = getCardStatus(item);
  const s = STATUS_STYLES[statusKey];
  const { keys, done } = checklistProgress(item);
  const showBar = keys.length > 1;

  const toggleCheck = (k) => {
    const next = { ...(item.checklist || {}), [k]: !item.checklist?.[k] };
    onUpdate(item.id, { checklist: next });
  };

  const title = item.title || "(sin título)";
  const displayTitle = title.length > 45 ? title.slice(0, 45) + "…" : title;

  return (
    <div
      onClick={onToggle}
      className="rounded-lg border p-2 cursor-pointer transition-all hover:shadow-sm"
      style={{ borderColor: s.border, background: s.bg }}
    >
      <div className="flex items-start justify-between gap-1.5 mb-1">
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/70 text-stone-600 inline-flex items-center gap-1 shrink-0">
          <span>{meta.emoji}</span> {meta.label}
        </span>
        <span className="inline-block w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: s.dot }} />
      </div>
      <p className="text-[11px] font-medium text-stone-800 leading-snug">{displayTitle}</p>
      {item.origin_label && <p className="text-[10px] text-stone-500 mt-0.5">{item.origin_label}</p>}

      {showBar && (
        <div className="flex gap-0.5 mt-2">
          {keys.map((k, i) => (
            <div key={k} className="flex-1 h-1 rounded-full" style={{ background: i < done ? s.dot : "#E7E5E4" }} />
          ))}
        </div>
      )}

      {expanded && (
        <div onClick={e => e.stopPropagation()} className="mt-2 pt-2 border-t" style={{ borderColor: s.border + "55" }}>
          {item.content ? (
            <div className="text-[11px] text-stone-600 leading-relaxed bg-white/70 rounded p-2 mb-2 max-h-24 overflow-y-auto">
              {item.content.slice(0, 160)}{item.content.length > 160 ? "…" : ""}
            </div>
          ) : (
            <p className="text-[10px] italic text-stone-400 mb-2">Sin contenido generado</p>
          )}
          {keys.length > 0 && (
            <>
              <p className="text-[9px] uppercase tracking-widest font-medium text-stone-400 mb-1.5">Checklist</p>
              <div className="space-y-1">
                {keys.map(k => {
                  const checked = !!item.checklist?.[k];
                  return (
                    <label key={k} className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                      <input type="checkbox" checked={checked} onChange={() => toggleCheck(k)}
                        className="w-3 h-3 rounded shrink-0 accent-orange-600" />
                      <span className={checked ? "text-green-700 line-through" : "text-stone-700"}>{k}</span>
                    </label>
                  );
                })}
              </div>
            </>
          )}
          {item.origin_label && <p className="text-[10px] text-stone-500 mt-2 pt-1.5 border-t" style={{ borderColor: s.border + "55" }}>Origen: {item.origin_label}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Ghost slot recurrente (martes) ───────────────────────────────────────

function GhostSlot({ type }) {
  const meta = CONTENT_TYPES[type];
  return (
    <div className="rounded-lg p-2 border border-dashed text-center" style={{ borderColor: "#D6D3D1", background: "#FAFAF9" }}>
      <p className="text-[11px] font-medium text-stone-400">{meta.emoji} {meta.label}</p>
      <p className="text-[9px] text-stone-400 mt-0.5">Slot recurrente</p>
    </div>
  );
}

// ─── Día del calendario ────────────────────────────────────────────────────

function DayColumn({ date, items, isToday, isWeekend, ghostType, expandedId, onToggleExpand, onUpdateItem, onDropPiece }) {
  const [over, setOver] = useState(false);
  const dayName = DIAS_CORTOS[(date.getDay() + 6) % 7]; // Lun=0..Dom=6
  const dayNum = date.getDate();

  // Si ya hay un item del mismo tipo del ghost en este día, no mostrar el ghost
  const hideGhost = ghostType && items.some(i => i.content_type === ghostType);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (!over) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onDropPiece(date); }}
      className="flex flex-col rounded-lg transition-colors"
      style={{
        background: over ? OL : (isWeekend ? "#F9F8F7" : "white"),
        border: `1px solid ${over ? OB : "#E7E5E4"}`,
        minHeight: 320,
      }}
    >
      <div className="px-2 py-2 border-b border-stone-200 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest font-medium text-stone-500">{dayName}</p>
        <div
          className="text-xs font-semibold flex items-center justify-center"
          style={{
            background: isToday ? O : "transparent",
            color: isToday ? "white" : "#292524",
            width: 22, height: 22, borderRadius: "50%",
          }}
        >{dayNum}</div>
      </div>
      <div className="flex-1 p-1.5 space-y-1.5">
        {ghostType && !hideGhost && <GhostSlot type={ghostType} />}
        {items.map(item => (
          <CalendarCard
            key={item.id}
            item={item}
            expanded={expandedId === item.id}
            onToggle={() => onToggleExpand(item.id)}
            onUpdate={onUpdateItem}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────

export default function ParrillaView({ onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [originFilter, setOriginFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [draggingId, setDraggingId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);

  // Fetch — trae el inbox + las piezas de la semana visible
  const fetchAll = async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const wkISO = toISODate(weekStart);
      const [inboxRes, calRes, completeRes] = await Promise.all([
        fetch("/api/parrilla?status=inbox").then(r => r.json()),
        fetch(`/api/parrilla?status=scheduled&week_start=${wkISO}`).then(r => r.json()),
        fetch(`/api/parrilla?status=complete&week_start=${wkISO}`).then(r => r.json()),
      ]);
      // Si alguna respuesta es un objeto con .error en vez de array, mostrarlo
      const firstError = [inboxRes, calRes, completeRes].find(r => r && r.error);
      if (firstError) {
        setErrorBanner(`No pude leer la parrilla: ${firstError.error}. ¿Corriste la SQL de supabase/parrilla_items.sql?`);
        setItems([]);
        return;
      }
      const inbox = Array.isArray(inboxRes) ? inboxRes : [];
      const scheduled = Array.isArray(calRes) ? calRes : [];
      const complete = Array.isArray(completeRes) ? completeRes : [];
      setItems([...inbox, ...scheduled, ...complete]);
    } catch (e) {
      setErrorBanner(`Error de red leyendo la parrilla: ${e.message || e}`);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, [weekStart]);

  // ─── Filtrado del inbox ───
  const inboxItems = useMemo(() => items.filter(i => i.status === "inbox"), [items]);

  const filteredInbox = useMemo(() => {
    return inboxItems.filter(i => {
      if (originFilter !== "all" && (i.origin_type || "manual") !== originFilter) return false;
      if (typeFilter !== "all" && i.content_type !== typeFilter) return false;
      return true;
    });
  }, [inboxItems, originFilter, typeFilter]);

  // Agrupar por idea_group_id (o singletons si no tiene grupo)
  const inboxGroups = useMemo(() => {
    const groups = new Map();
    for (const it of filteredInbox) {
      const key = it.idea_group_id || `__solo_${it.id}`;
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          title: it.idea_group_title || it.title,
          originLabel: it.origin_label || "",
          pieces: [],
          isSolo: !it.idea_group_id,
        });
      }
      groups.get(key).pieces.push(it);
    }
    return Array.from(groups.values());
  }, [filteredInbox]);

  // ─── Calendario ───
  const scheduledByDay = useMemo(() => {
    const map = {};
    for (let i = 0; i < 7; i++) map[toISODate(addDays(weekStart, i))] = [];
    for (const it of items) {
      if (!it.scheduled_date) continue;
      if (it.status === "discarded" || it.status === "inbox") continue;
      const key = it.scheduled_date;
      if (map[key]) map[key].push(it);
    }
    return map;
  }, [items, weekStart]);

  // Ghost slots: martes alterna episodio (semanas pares) / newsletter (impares)
  const ghostFor = (date) => {
    if (date.getDay() !== 2) return null; // 2 = martes
    const wk = getISOWeek(date);
    return wk % 2 === 0 ? "episodio" : "newsletter";
  };

  // ─── Mutaciones ───
  const patchItem = async (id, patch) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
    try {
      const res = await fetch(`/api/parrilla/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const updated = await res.json();
      if (updated && updated.id) {
        setItems(prev => prev.map(i => i.id === id ? updated : i));
      }
    } catch (_) { /* visual ya actualizado */ }
  };

  const handleDropOnDay = (date) => {
    if (!draggingId) return;
    const iso = toISODate(date);
    patchItem(draggingId, { scheduled_date: iso });
    setDraggingId(null);
  };

  const handleDiscard = (id) => patchItem(id, { status: "discarded" });

  const handleCreate = async (payload) => {
    try {
      const res = await fetch("/api/parrilla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const created = await res.json();
      if (created && created.error) {
        setErrorBanner(`No pude crear la pieza: ${created.error}. ¿Corriste la SQL de supabase/parrilla_items.sql?`);
        return;
      }
      if (created && created.id) {
        setItems(prev => [created, ...prev]);
        setShowNew(false);
        // Refetch para asegurar consistencia con DB
        fetchAll();
      } else {
        setErrorBanner("La respuesta del servidor no incluyó el item creado. Revisá la consola del browser.");
      }
    } catch (e) {
      setErrorBanner(`Error de red creando la pieza: ${e.message || e}`);
    }
  };

  const toggleGroup = (gid) => setExpandedGroups(prev => ({ ...prev, [gid]: !prev[gid] }));

  // Headers del calendario
  const today = new Date();
  const monthLabel = `${MESES[weekStart.getMonth()]} ${weekStart.getFullYear()}`;

  return (
    <div className="flex h-full" style={{ background: "#FAFAF9", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* ═══ INBOX (izquierda) ═══ */}
      <div className="w-80 shrink-0 flex flex-col border-r border-stone-200 bg-white">
        <div className="px-5 py-4 border-b border-stone-200">
          {onBack && (
            <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-700 mb-2">
              <ArrowLeft size={12} /> Volver
            </button>
          )}
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-stone-800">Inbox</h2>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: O }}>
              {inboxItems.length}
            </span>
          </div>

          {/* Filtros por origen */}
          <div className="flex flex-wrap gap-1 mb-2">
            {ORIGIN_FILTERS.map(f => {
              const on = originFilter === f.key;
              return (
                <button key={f.key} onClick={() => setOriginFilter(f.key)}
                  className="text-[10px] font-medium px-2 py-1 rounded-md transition-colors"
                  style={{
                    background: on ? OL : "white",
                    color: on ? O : "#78716A",
                    border: `1px solid ${on ? OB : "#E7E5E4"}`,
                  }}>
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Filtros por tipo */}
          <div className="flex flex-wrap gap-1">
            <button onClick={() => setTypeFilter("all")}
              className="text-[10px] font-medium px-2 py-1 rounded-md transition-colors"
              style={{
                background: typeFilter === "all" ? OL : "white",
                color: typeFilter === "all" ? O : "#78716A",
                border: `1px solid ${typeFilter === "all" ? OB : "#E7E5E4"}`,
              }}>
              Todos
            </button>
            {TYPE_KEYS.map(k => {
              const on = typeFilter === k;
              const meta = CONTENT_TYPES[k];
              return (
                <button key={k} onClick={() => setTypeFilter(k)}
                  className="text-[10px] font-medium px-2 py-1 rounded-md transition-colors inline-flex items-center gap-1"
                  style={{
                    background: on ? OL : "white",
                    color: on ? O : "#78716A",
                    border: `1px solid ${on ? OB : "#E7E5E4"}`,
                  }}>
                  <span>{meta.emoji}</span> {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista de grupos */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-xs text-stone-400">
              <Loader2 size={12} className="animate-spin" /> Cargando inbox...
            </div>
          ) : inboxGroups.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-xs text-stone-400 leading-relaxed">
                No hay piezas pendientes.{"\n"}
                Enviá contenido desde Repurpose, Minado, o el Fixture, o creá una pieza nueva acá abajo.
              </p>
            </div>
          ) : (
            inboxGroups.map(g => (
              g.isSolo ? (
                <div key={g.id} className="rounded-xl border border-stone-200 bg-white p-2">
                  <InboxPiece
                    item={g.pieces[0]}
                    onDragStart={setDraggingId}
                    onDragEnd={() => setDraggingId(null)}
                    onDiscard={handleDiscard}
                  />
                </div>
              ) : (
                <IdeaGroupBlock
                  key={g.id}
                  groupId={g.id}
                  groupTitle={g.title}
                  originLabel={g.originLabel}
                  pieces={g.pieces}
                  expanded={expandedGroups[g.id] !== false}
                  onToggle={() => toggleGroup(g.id)}
                  onDragStart={setDraggingId}
                  onDragEnd={() => setDraggingId(null)}
                  onDiscard={handleDiscard}
                />
              )
            ))
          )}
        </div>

        {/* Botón "+ Agregar contenido" */}
        <div className="p-3 border-t border-stone-200">
          <button onClick={() => setShowNew(true)}
            className="w-full py-2.5 rounded-lg text-xs font-medium text-stone-500 hover:text-orange-600 hover:bg-orange-50 border border-dashed border-stone-300 hover:border-orange-300 transition-colors flex items-center justify-center gap-1.5">
            <Plus size={12} /> Agregar contenido
          </button>
        </div>
      </div>

      {/* ═══ CALENDARIO (derecha) ═══ */}
      <div className="flex-1 overflow-auto">
        {errorBanner && (
          <div className="m-4 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700 flex items-start gap-2">
            <span className="font-semibold shrink-0">⚠️</span>
            <div className="flex-1">
              <p className="font-medium">{errorBanner}</p>
              <button onClick={() => { setErrorBanner(null); fetchAll(); }} className="mt-2 text-xs text-red-600 underline hover:text-red-800">Reintentar</button>
            </div>
            <button onClick={() => setErrorBanner(null)} className="p-1 rounded hover:bg-red-100"><X size={14} /></button>
          </div>
        )}
        {/* Header del calendario */}
        <div className="px-6 py-4 border-b border-stone-200 bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar size={18} color={O} />
              <h1 className="text-base font-semibold text-stone-900">Parrilla de contenidos</h1>
              <span className="text-sm text-stone-500">· {monthLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-3 mr-3 text-[10px] text-stone-500">
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: STATUS_STYLES.gray.dot }}/> Sin iniciar</span>
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: STATUS_STYLES.yellow.dot }}/> En progreso</span>
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: STATUS_STYLES.green.dot }}/> Listo</span>
              </div>
              <button onClick={() => setWeekStart(addDays(weekStart, -7))}
                className="p-1.5 rounded-lg hover:bg-stone-100 border border-stone-200"
                title="Semana anterior">
                <ChevronLeft size={14} color={MU} />
              </button>
              <button onClick={() => setWeekStart(getMonday(new Date()))}
                className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-orange-50 transition-colors"
                style={{ color: O, border: `1px solid ${OB}` }}>
                Hoy
              </button>
              <button onClick={() => setWeekStart(addDays(weekStart, 7))}
                className="p-1.5 rounded-lg hover:bg-stone-100 border border-stone-200"
                title="Semana siguiente">
                <ChevronRight size={14} color={MU} />
              </button>
            </div>
          </div>
        </div>

        {/* Grid de 7 columnas — estilo inline para garantizar layout aunque Tailwind purgue */}
        <div className="p-4" style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8 }}>
          {Array.from({ length: 7 }).map((_, i) => {
            const date = addDays(weekStart, i);
            const iso = toISODate(date);
            const dayItems = scheduledByDay[iso] || [];
            const isWeekend = i >= 5;
            const ghostType = ghostFor(date);
            return (
              <DayColumn
                key={iso}
                date={date}
                items={dayItems}
                isToday={isSameDay(date, today)}
                isWeekend={isWeekend}
                ghostType={ghostType}
                expandedId={expandedItemId}
                onToggleExpand={(id) => setExpandedItemId(prev => prev === id ? null : id)}
                onUpdateItem={patchItem}
                onDropPiece={handleDropOnDay}
              />
            );
          })}
        </div>
      </div>

      {showNew && <NewItemModal onClose={() => setShowNew(false)} onCreate={handleCreate} />}
    </div>
  );
}
