"use client";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Youtube, Instagram, Linkedin, Music, Play, ExternalLink, ArrowRight, Sparkles, Ban } from "lucide-react";
import { api } from "@/components/ui";
import {
  O, OL, OB, GR, GL, MU, BORDER, DARK, AMBER, GRAY_STRENGTH,
  LILA, LILA_L, LILA_B,
  CONTENT_TYPE_LABEL, PLATFORM_LABEL, ANGLE_TYPE_LABEL,
} from "@/components/estrategia/theme";
// Sprint Publicación §5 — el modal viejo "Registrar publicación" se retiró.
// Ahora "+ agregar pieza" abre el nuevo ContenidoOriginalModal (creation_source='idea_propia').
import ContenidoOriginalModal from "@/components/estrategia/ContenidoOriginalModal";
import PiezaPanel from "@/components/estrategia/PiezaPanel";
import AnguloView from "@/components/estrategia/AnguloView";

// ═══ Universo del episodio (spec universo §4) — evolución del Linaje (v0.7).
// - Piezas en 3 estados (publicada, propuesta, descartada).
// - Clic-según-estado: publicada → PiezaPanel; propuesta → "producir"
//   (redirige a la tab de producción correspondiente); descartada → panel con
//   la razón + link al aprendizaje.
// - Filtro segmentado: Todo · Publicado · En producción · Propuestas.
//
// props:
//   episode              — { id, name, ... }
//   onGoToWorkshopTab(k) — cambia la tab del workspace ('reels' | 'medianos' | ...)
export default function LineageTab({ episode, onGoToWorkshopTab }) {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [openPiezaId, setOpenPiezaId] = useState(null);
  const [openAngulo, setOpenAngulo] = useState(null);
  const [descartada, setDescartada] = useState(null); // pieza en estado descartada mostrada
  const [filter, setFilter] = useState('todo'); // todo | publicada | propuesta | descartada

  const load = async () => {
    if (!episode?.id) return;
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`/api/episodes/${episode.id}/linaje`, { cache: 'no-store' });
      const j = await r.json();
      if (j?.error) throw new Error(j.error);
      setTree(j);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [episode?.id]);

  const piezas = tree?.piezas || [];
  const conteo = tree?.resultado?.conteo || {};
  // Sprint Publicación §3 E — el endpoint devuelve `filas[]` que ya trae los
  // grupos (kind:'grupo' con desglose por plataforma) y piezas individuales
  // (kind:'individual') en la mezcla correcta. Si un backend viejo no las
  // devuelve, caemos al shape v0.8 (`piezas`).
  const filasRaw = Array.isArray(tree?.filas) && tree.filas.length > 0
    ? tree.filas
    : piezas.map(p => ({ kind: 'individual', ...p }));

  const filasVisibles = useMemo(() => {
    if (filter === 'todo') return filasRaw;
    return filasRaw.filter(p => (p.status || 'publicada') === filter);
  }, [filasRaw, filter]);

  const madreYT = tree?.madre?.metrics?.youtube;
  const madreSP = tree?.madre?.metrics?.spotify;

  // Clic en una fila — routing por estado (spec universo §4).
  // Para grupos publicados, abrimos el panel de la pieza representativa
  // (miembro con más reach), y el panel muestra las hermanas del grupo.
  const onClickFila = (f) => {
    if (!f) return;
    const s = f.status || 'publicada';
    if (s === 'publicada') {
      const targetId = f.kind === 'grupo' ? f.miembros?.[0]?.id : f.id;
      if (targetId) setOpenPiezaId(targetId);
    } else if (s === 'propuesta') {
      const tab = tabForContentType(f.content_type);
      if (tab && onGoToWorkshopTab) onGoToWorkshopTab(tab);
      else if (f.id) setOpenPiezaId(f.id);
    } else if (s === 'descartada') setDescartada(f);
  };

  if (loading) return <div className="flex items-center gap-2 text-sm text-stone-400 py-6"><Loader2 size={14} className="animate-spin" /> Cargando universo…</div>;
  if (err) return <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">{err}</div>;
  if (!tree) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-stone-800">Universo</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            madre · piezas · resultado ·
            <span className="ml-1">
              {conteo.publicada || 0} publicada{(conteo.publicada || 0) === 1 ? '' : 's'} · {conteo.propuesta || 0} propuestas · {conteo.descartada || 0} descartadas
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SegmentedFilter value={filter} onChange={setFilter} conteo={conteo} />
          <button
            onClick={() => setOpenModal(true)}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 flex items-center gap-2"
            style={{ background: O }}
          >
            <Plus size={14} /> agregar pieza a este episodio
          </button>
        </div>
      </div>

      {/* Árbol */}
      <div className="rounded-2xl bg-white border p-5" style={{ borderColor: BORDER }}>
        <div className="grid gap-6" style={{ gridTemplateColumns: 'minmax(220px, 260px) 1fr' }}>
          {/* Madre — card oscuro (único dark permitido, spec §1) */}
          <div className="rounded-xl p-4" style={{ background: DARK, color: '#FAFAF9' }}>
            <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-1">Madre · episodio</p>
            <p className="text-[15px] font-semibold leading-snug">{tree.madre?.label || episode?.name}</p>
            <div className="mt-4 space-y-2 text-[12px] text-stone-300">
              {madreYT ? (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Youtube size={12} /> YouTube</span>
                  <span>{fmt(madreYT.reach)} · {madreYT.engagement_rate ? madreYT.engagement_rate.toFixed(1) + '%' : '—'}</span>
                </div>
              ) : null}
              {madreSP ? (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Music size={12} /> Spotify</span>
                  <span>{fmt(madreSP.reach)}</span>
                </div>
              ) : null}
              {!madreYT && !madreSP && (
                <p className="text-[11px] text-stone-400 italic">Sin métricas propias aún. Registra el episodio como pieza (tipo <em>episodio</em>) para verlas.</p>
              )}
            </div>
          </div>

          {/* Piezas con tronco */}
          <div className="relative pl-8">
            {filasVisibles.length > 0 && (
              <div className="absolute top-4 bottom-4 left-2 w-px" style={{ background: BORDER }} />
            )}
            {filasVisibles.length === 0 ? (
              <div className="text-sm text-stone-400 italic py-4">
                {filasRaw.length === 0
                  ? 'Aún no hay piezas registradas. Registra la primera con "+ agregar pieza a este episodio".'
                  : 'Sin piezas en este filtro.'}
              </div>
            ) : (
              <div className="space-y-3">
                {filasVisibles.map(f => (
                  f.kind === 'grupo'
                    ? <GrupoRow key={f.group_id} g={f} onClick={() => onClickFila(f)} onOpenAngulo={setOpenAngulo} onOpenPieza={(p) => setOpenPiezaId(p.id)} />
                    : <PiezaRow key={f.id} p={f} onClick={() => onClickFila(f)} onOpenAngulo={setOpenAngulo} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Leyenda de estados + strength */}
        {piezas.length > 0 && (
          <div className="mt-6 pt-4 border-t space-y-2" style={{ borderColor: BORDER }}>
            <div className="flex items-center gap-4 flex-wrap text-[11px] text-stone-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: GR }} /> publicada
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: O }} /> propuesta
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#D6D3D1' }} /> descartada
              </span>
            </div>
            <div className="flex items-center gap-4 flex-wrap text-[11px] text-stone-500">
              <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-[3px] rounded" style={{ background: GR }} /> fuerte · trajo suscriptores</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-[2px] rounded" style={{ background: AMBER }} /> medio · alcance alto</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-[1px] rounded" style={{ background: GRAY_STRENGTH }} /> débil</span>
            </div>
          </div>
        )}
      </div>

      {/* Resultado del universo */}
      <div className="rounded-2xl p-5 border" style={{ background: OL, borderColor: OB }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-stone-500">Resultado del universo</p>
            <p className="text-lg font-semibold text-stone-800 mt-1">
              {fmt(tree.resultado?.alcance_total || 0)} de alcance total · {tree.resultado?.subs_total || 0} suscriptor{(tree.resultado?.subs_total || 0) === 1 ? '' : 'es'}
            </p>
          </div>
          <p className="text-xs text-stone-500 max-w-sm">
            Suma de las piezas publicadas de este episodio (últimas métricas capturadas). Propuestas y descartes no cuentan.
          </p>
        </div>
      </div>

      {/* Modal registrar — Sprint Publicación §3 C, madre pre-cargada */}
      {openModal && (
        <ContenidoOriginalModal
          onClose={() => setOpenModal(false)}
          onCreated={() => { setOpenModal(false); load(); }}
          defaultEpisodeId={episode?.id}
        />
      )}

      {/* PiezaPanel al clickear una publicada */}
      {openPiezaId && (
        <PiezaPanel
          piezaId={openPiezaId}
          onClose={() => setOpenPiezaId(null)}
          onOpenMadre={() => setOpenPiezaId(null)}
          onOpenPieza={(h) => setOpenPiezaId(h.id)}
          onOpenAngulo={(a) => { setOpenPiezaId(null); setOpenAngulo(a); }}
        />
      )}

      {/* AnguloView cuando clickean un chip de ángulo */}
      {openAngulo && (
        <AnguloView
          angleType={openAngulo}
          onClose={() => setOpenAngulo(null)}
          onOpenPieza={(p) => { setOpenAngulo(null); setOpenPiezaId(p.id); }}
        />
      )}

      {/* Panel simple de descarte (razón + explicación) */}
      {descartada && (
        <DescartePanel pieza={descartada} onClose={() => setDescartada(null)} />
      )}
    </div>
  );
}

function SegmentedFilter({ value, onChange, conteo }) {
  const opts = [
    { key: 'todo', label: 'Todo' },
    { key: 'publicada', label: `Publicado (${conteo.publicada || 0})` },
    { key: 'propuesta', label: `Propuestas (${conteo.propuesta || 0})` },
    { key: 'descartada', label: `Descartadas (${conteo.descartada || 0})` },
  ];
  return (
    <div className="flex items-center gap-0.5 rounded-xl p-0.5 border" style={{ borderColor: BORDER, background: '#FAFAF9' }}>
      {opts.map(o => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className="text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors"
          style={{
            background: value === o.key ? 'white' : 'transparent',
            color: value === o.key ? O : MU,
            boxShadow: value === o.key ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Sprint Publicación §3 Módulo E — tarjeta de grupo (hermanas del mismo
// content_group_id). Reach combinado + desglose por plataforma dentro.
function GrupoRow({ g, onClick, onOpenAngulo, onOpenPieza }) {
  const [expanded, setExpanded] = useState(false);
  const { color, height } = strengthStyle(g.strength);
  return (
    <div className="relative">
      <span className="absolute rounded" style={{
        left: -24, top: '50%', transform: 'translateY(-50%)',
        width: 24, height, background: color,
      }} />
      <div className="rounded-xl border" style={{ borderColor: GR, background: 'white' }}>
        <button
          onClick={onClick}
          className="w-full text-left flex items-center gap-3 p-3 hover:bg-orange-50/40 transition-colors rounded-xl"
        >
          <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-stone-500">×{g.miembros?.length || 0}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-stone-800 truncate">{g.title}</p>
              <span className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded" style={{ background: GL, color: GR }}>
                {(g.platforms || []).length} redes
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5 flex-wrap">
              <span>{CONTENT_TYPE_LABEL[g.content_type] || g.content_type}</span>
              <span>·</span>
              <span>{fmt(g.reach)} alcance combinado</span>
              {typeof g.engagement_rate === 'number' && (<><span>·</span><span>{g.engagement_rate.toFixed(1)}% eng.</span></>)}
              {g.angle_type && (
                <button
                  onClick={(e) => { e.stopPropagation(); onOpenAngulo?.(g.angle_type); }}
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded hover:opacity-80"
                  style={{ background: LILA_L, color: LILA }}
                >
                  {ANGLE_TYPE_LABEL[g.angle_type] || g.angle_type}
                </button>
              )}
            </div>
          </div>
          {g.subs_atribuidos > 0 && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: GL, color: GR }}>
              +{g.subs_atribuidos} sub{g.subs_atribuidos === 1 ? '' : 's'}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
            className="p-1 rounded hover:bg-stone-100 shrink-0"
            title={expanded ? 'ocultar redes' : 'ver redes'}
          >
            <span className="text-[10px] text-stone-500">{expanded ? '▲' : '▼'}</span>
          </button>
        </button>
        {expanded && (
          <div className="border-t px-3 py-2 space-y-1" style={{ borderColor: BORDER }}>
            {(g.miembros || []).map(m => (
              <button
                key={m.id}
                onClick={(e) => { e.stopPropagation(); onOpenPieza?.(m); }}
                className="w-full text-left flex items-center gap-2 py-1.5 px-2 rounded hover:bg-stone-50"
              >
                <PlatformIcon platform={m.platform} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-stone-700">{PLATFORM_LABEL[m.platform] || m.platform}</p>
                </div>
                <span className="text-[11px] text-stone-500">{fmt(m.reach)} alcance</span>
                {typeof m.engagement_rate === 'number' && (
                  <span className="text-[11px] text-stone-400">{m.engagement_rate.toFixed(1)}%</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PiezaRow({ p, onClick, onOpenAngulo }) {
  const status = p.status || 'publicada';
  const isPublicada = status === 'publicada';
  const isPropuesta = status === 'propuesta';
  const isDescartada = status === 'descartada';
  const { color, height } = strengthStyle(p.strength);
  return (
    <div className="relative">
      <span className="absolute rounded" style={{
        left: -24, top: '50%', transform: 'translateY(-50%)',
        width: 24, height, background: color,
      }} />
      <button
        onClick={onClick}
        className="w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-colors hover:border-orange-300"
        style={{
          borderColor: isPublicada ? GR : isPropuesta ? '#D6D3D1' : BORDER,
          borderStyle: isPropuesta ? 'dashed' : 'solid',
          background: isDescartada ? '#FAFAF9' : 'white',
          opacity: isDescartada ? 0.75 : 1,
        }}
      >
        <PlatformIcon platform={p.platform} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className="text-sm font-medium text-stone-800 truncate"
              style={{ textDecoration: isDescartada ? 'line-through' : 'none' }}
            >
              {p.title}
            </p>
            {isPropuesta && (
              <span className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded" style={{ background: OL, color: O }}>PROPUESTA</span>
            )}
            {isDescartada && (
              <span className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded" style={{ background: '#F5F5F4', color: MU }}>DESCARTADA</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5 flex-wrap">
            <span>{CONTENT_TYPE_LABEL[p.content_type] || p.content_type}</span>
            {isPublicada && (<><span>·</span><span>{fmt(p.reach)} de alcance</span></>)}
            {isPublicada && typeof p.engagement_rate === 'number' && (<><span>·</span><span>{p.engagement_rate.toFixed(1)}% eng.</span></>)}
            {p.angle_type && (
              <button
                onClick={(e) => { e.stopPropagation(); onOpenAngulo?.(p.angle_type); }}
                className="text-[10px] font-medium px-1.5 py-0.5 rounded hover:opacity-80"
                style={{ background: LILA_L, color: LILA }}
              >
                {ANGLE_TYPE_LABEL[p.angle_type] || p.angle_type}
              </button>
            )}
          </div>
        </div>
        {isPublicada && p.subs_atribuidos > 0 && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{ background: GL, color: GR }}>
            +{p.subs_atribuidos} sub{p.subs_atribuidos === 1 ? '' : 's'}
          </span>
        )}
        {isPropuesta && (
          <span className="text-[11px] font-medium flex items-center gap-1 shrink-0" style={{ color: O }}>
            <Sparkles size={11} /> producir <ArrowRight size={11} />
          </span>
        )}
        {isDescartada && (
          <span className="text-[11px] font-medium flex items-center gap-1 shrink-0 text-stone-500">
            <Ban size={11} /> no publicado · aprendizaje
          </span>
        )}
      </button>
    </div>
  );
}

// Panel simple para mostrar razón de descarte (createPortal light).
function DescartePanel({ pieza, onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[95] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-3"
      >
        <div className="flex items-center gap-2">
          <Ban size={16} color={MU} />
          <span className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded" style={{ background: '#F5F5F4', color: MU }}>DESCARTADA</span>
        </div>
        <p className="text-[15px] font-semibold text-stone-800" style={{ textDecoration: 'line-through' }}>{pieza.title}</p>
        <div className="rounded-lg p-3 border border-stone-200 bg-stone-50">
          <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-1">Razón del descarte</p>
          <p className="text-[13px] text-stone-700 leading-relaxed">
            {pieza.discard_reason || 'Sin razón registrada.'}
          </p>
        </div>
        <p className="text-[11px] text-stone-500 italic">
          Se guardó como aprendizaje draft (revísalo en la vista Aprendizajes).
        </p>
        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function strengthStyle(s) {
  if (s === 'fuerte') return { color: GR, height: 3 };
  if (s === 'medio') return { color: AMBER, height: 2 };
  return { color: GRAY_STRENGTH, height: 1 };
}

function tabForContentType(ct) {
  // Mapea el tipo de pieza a la tab de producción correspondiente en el
  // workspace del episodio. spec universo §4.
  const map = {
    reel: 'reels',
    linkedin: 'reels',       // los posts de LinkedIn viven en Reels/Intros
    intros: 'intros',
    minado: 'minado',
    corto: 'minado',
    carrusel: 'reels',
    mediano: 'medianos',
    episodio: 'episodio',
    newsletter: null,
  };
  return map[ct] || null;
}

function PlatformIcon({ platform }) {
  const s = 16, c = MU;
  const map = {
    youtube: <Youtube size={s} color={c} />,
    instagram: <Instagram size={s} color={c} />,
    linkedin: <Linkedin size={s} color={c} />,
    spotify: <Music size={s} color={c} />,
    tiktok: <Play size={s} color={c} />,
  };
  return (
    <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
      {map[platform] || <ExternalLink size={s} color={c} />}
    </div>
  );
}

function fmt(n) {
  const v = Number(n) || 0;
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return `${v}`;
}
