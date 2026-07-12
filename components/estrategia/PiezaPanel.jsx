"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X, Loader2, ExternalLink, ArrowRight,
  Youtube, Instagram, Linkedin, Music, Play, Ban, Sparkles, AlertCircle, CheckCircle2,
} from "lucide-react";
import { api } from "@/components/ui";
import {
  O, OL, OB, GR, GL, MU, BORDER, LILA, LILA_L, LILA_B,
  CONTENT_TYPE_LABEL, PLATFORM_LABEL, ANGLE_TYPE_LABEL,
} from "@/components/estrategia/theme";

// ═══ PiezaPanel — panel lateral de detalle de una pieza (spec universo §5).
// Portal, cierre X/overlay/Escape (biblia §15 #11). Muestra la pieza + sus
// vecinos (madre, hermanas, ángulo). Cada vecino es clickeable → navega.
//
// props:
//   piezaId               — id de published_items
//   onClose               — cerrar el panel
//   onOpenMadre(madre)    — navegar al Universo de la madre
//   onOpenPieza(pieza)    — abrir otra pieza (hermana)
//   onOpenAngulo(angle)   — abrir la vista de ángulo
export default function PiezaPanel({ piezaId, onClose, onOpenMadre, onOpenPieza, onOpenAngulo }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!piezaId) return;
    setLoading(true); setErr(null);
    fetch(`/api/published/${piezaId}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(j => {
        if (j?.error) throw new Error(j.error);
        setData(j);
      })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [piezaId]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  if (!mounted || !piezaId) return null;

  const pieza = data?.pieza;
  const status = pieza?.status || 'publicada';
  const isPropuesta = status === 'propuesta';
  const isDescartada = status === 'descartada';

  return createPortal(
    <>
      <div onClick={onClose} className="fixed inset-0 z-[95]" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }} />
      <div
        className="fixed right-0 top-0 h-full bg-white z-[100] shadow-2xl flex flex-col"
        style={{ width: 'min(520px, 96vw)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-2 min-w-0">
            <StatusPill status={status} />
            <p className="text-[13px] font-semibold text-stone-800 truncate">
              {pieza?.title || '…'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100 shrink-0"><X size={18} color={MU} /></button>
        </div>

        {loading ? (
          <div className="p-6 flex items-center gap-2 text-sm text-stone-400">
            <Loader2 size={14} className="animate-spin" /> Cargando…
          </div>
        ) : err ? (
          <div className="p-6 text-sm text-red-600 bg-red-50">{err}</div>
        ) : pieza ? (
          <div className="flex-1 overflow-y-auto">
            {/* Meta principal */}
            <div className="px-5 py-4 border-b" style={{ borderColor: BORDER }}>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <PlatformIcon platform={pieza.platform} />
                <span className="text-[12px] text-stone-500">
                  {CONTENT_TYPE_LABEL[pieza.content_type] || pieza.content_type} · {PLATFORM_LABEL[pieza.platform] || pieza.platform}
                </span>
                {pieza.angle_type && (
                  <button
                    onClick={() => onOpenAngulo?.(pieza.angle_type)}
                    className="text-[11px] font-medium px-2 py-0.5 rounded-full hover:opacity-80 transition-opacity"
                    style={{ background: LILA_L, color: LILA, border: `1px solid ${LILA_B}` }}
                    title="Ver todas las piezas de este ángulo"
                  >
                    {ANGLE_TYPE_LABEL[pieza.angle_type] || pieza.angle_type}
                  </button>
                )}
              </div>

              {pieza.published_url && (
                <a
                  href={pieza.published_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[12px] font-medium hover:underline flex items-center gap-1 mb-2"
                  style={{ color: O }}
                >
                  abrir en {PLATFORM_LABEL[pieza.platform] || pieza.platform} <ExternalLink size={12} />
                </a>
              )}

              {isDescartada && pieza.discard_reason && (
                <div className="mt-2 rounded-lg p-3 border border-stone-200 bg-stone-50">
                  <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-1">Razón del descarte</p>
                  <p className="text-[13px] text-stone-700 leading-relaxed">{pieza.discard_reason}</p>
                  <p className="text-[11px] text-stone-500 italic mt-2">
                    Se guardó como aprendizaje draft — revísalo en la vista Aprendizajes.
                  </p>
                </div>
              )}
              {isPropuesta && (
                <div className="mt-2 rounded-lg p-3 border" style={{ borderColor: OB, background: OL }}>
                  <p className="text-[11px] text-stone-700">
                    Propuesta del sistema. Aún no la produjiste. Marca “Publicada” cuando le pegues al post y sepas el URL.
                  </p>
                </div>
              )}
            </div>

            {/* Métricas */}
            {status === 'publicada' && (
              <div className="px-5 py-4 border-b" style={{ borderColor: BORDER }}>
                <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-2">Métricas</p>
                <MetricsGrid metrics={data?.metrics || {}} />
                {data?.subs_atribuidos > 0 && (
                  <div className="mt-3 rounded-lg px-3 py-2 flex items-center gap-2" style={{ background: GL }}>
                    <CheckCircle2 size={13} color={GR} />
                    <span className="text-[12px]" style={{ color: GR }}>
                      +{data.subs_atribuidos} suscriptor{data.subs_atribuidos === 1 ? '' : 'es'} atribuido{data.subs_atribuidos === 1 ? '' : 's'}
                    </span>
                  </div>
                )}
                {Array.isArray(data?.history) && data.history.length >= 2 && (
                  <MiniHistory history={data.history} />
                )}
              </div>
            )}

            {/* Vecinos */}
            <div className="px-5 py-4 space-y-4">
              {data?.madre && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-2">Madre</p>
                  <button
                    onClick={() => onOpenMadre?.(data.madre)}
                    disabled={!data.madre.id}
                    className="w-full text-left flex items-center gap-3 p-3 rounded-xl border hover:border-orange-300 transition-colors"
                    style={{ borderColor: BORDER, opacity: data.madre.id ? 1 : 0.6 }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#18181B' }}>
                      <span className="text-[11px] text-white">{data.madre.type === 'newsletter' ? '📧' : '🎙️'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-stone-800 truncate">{data.madre.label}</p>
                      <p className="text-[11px] text-stone-500">{data.madre.type === 'newsletter' ? 'Newsletter' : 'Episodio'}</p>
                    </div>
                    {data.madre.id && <ArrowRight size={14} color={MU} />}
                  </button>
                </div>
              )}

              {Array.isArray(data?.hermanas) && data.hermanas.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-2">
                    Hermanas ({data.hermanas.length})
                  </p>
                  <div className="space-y-1.5">
                    {data.hermanas.slice(0, 6).map(h => (
                      <button
                        key={h.id}
                        onClick={() => onOpenPieza?.(h)}
                        className="w-full text-left flex items-center gap-3 p-2.5 rounded-lg border hover:border-orange-300 transition-colors"
                        style={{ borderColor: BORDER }}
                      >
                        <StatusDot status={h.status} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-stone-700 truncate">{h.title}</p>
                          <p className="text-[10px] text-stone-500">
                            {CONTENT_TYPE_LABEL[h.content_type] || h.content_type} · {PLATFORM_LABEL[h.platform] || h.platform}
                          </p>
                        </div>
                        <ArrowRight size={12} color={MU} />
                      </button>
                    ))}
                    {data.hermanas.length > 6 && (
                      <p className="text-[11px] text-stone-400 italic px-2">
                        y {data.hermanas.length - 6} más…
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t text-[11px] text-stone-400 flex items-center gap-3 flex-wrap" style={{ borderColor: BORDER }}>
              {pieza.published_at && <span>publicada: {fmtDate(pieza.published_at)}</span>}
              {pieza.created_at && <span>creada: {fmtDate(pieza.created_at)}</span>}
            </div>
          </div>
        ) : null}
      </div>
    </>,
    document.body
  );
}

// ═══ Sub-componentes ═══

function StatusPill({ status }) {
  const map = {
    publicada: { bg: GL, color: GR, label: 'PUBLICADA' },
    propuesta: { bg: OL, color: O, label: 'PROPUESTA' },
    descartada: { bg: '#F5F5F4', color: MU, label: 'DESCARTADA' },
  };
  const s = map[status] || map.publicada;
  return (
    <span className="text-[9px] font-bold tracking-widest px-2 py-0.5 rounded" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function StatusDot({ status }) {
  const map = { publicada: GR, propuesta: O, descartada: '#D6D3D1' };
  return <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: map[status] || GR }} />;
}

function PlatformIcon({ platform }) {
  const s = 14, c = MU;
  const map = {
    youtube: <Youtube size={s} color={c} />,
    instagram: <Instagram size={s} color={c} />,
    linkedin: <Linkedin size={s} color={c} />,
    spotify: <Music size={s} color={c} />,
    tiktok: <Play size={s} color={c} />,
  };
  return (
    <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
      {map[platform] || <ExternalLink size={s} color={c} />}
    </div>
  );
}

function MetricsGrid({ metrics }) {
  const items = [];
  const reach = metrics.reach ?? metrics.views ?? metrics.impressions;
  if (typeof reach === 'number') items.push({ label: 'Alcance', value: fmt(reach) });
  if (typeof metrics.engagement_rate === 'number') items.push({ label: 'Engagement', value: `${metrics.engagement_rate.toFixed(1)}%` });
  if (typeof metrics.likes === 'number') items.push({ label: 'Likes', value: fmt(metrics.likes) });
  if (typeof metrics.comments === 'number') items.push({ label: 'Comentarios', value: fmt(metrics.comments) });
  if (typeof metrics.shares === 'number') items.push({ label: 'Shares', value: fmt(metrics.shares) });
  if (typeof metrics.saves === 'number') items.push({ label: 'Saves', value: fmt(metrics.saves) });
  if (items.length === 0) return <p className="text-[12px] text-stone-400 italic">Aún sin métricas.</p>;
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((it, i) => (
        <div key={i} className="rounded-lg p-2.5" style={{ background: '#F5F5F4' }}>
          <p className="text-[10px] uppercase tracking-widest text-stone-500">{it.label}</p>
          <p className="text-[15px] font-semibold text-stone-800 mt-0.5">{it.value}</p>
        </div>
      ))}
    </div>
  );
}

// Serie mini de reach en el tiempo (una linea simple SVG, sin lib).
function MiniHistory({ history }) {
  // Agrupar reach/views/impressions como "alcance"; ordenar por fecha.
  const points = history
    .filter(h => ['reach', 'views', 'impressions'].includes(h.metric))
    .map(h => ({ t: new Date(h.captured_at).getTime(), v: Number(h.value) }))
    .sort((a, b) => a.t - b.t);
  if (points.length < 2) return null;
  const w = 320, hgt = 40, pad = 4;
  const min = 0;
  const max = Math.max(...points.map(p => p.v));
  const path = points.map((p, i) => {
    const x = pad + ((points.length > 1 ? i / (points.length - 1) : 0) * (w - 2 * pad));
    const y = hgt - pad - ((p.v - min) / Math.max(1, max - min)) * (hgt - 2 * pad);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <div className="mt-3">
      <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-1">Alcance en el tiempo</p>
      <svg width="100%" height={hgt} viewBox={`0 0 ${w} ${hgt}`} preserveAspectRatio="none">
        <path d={path} stroke={O} strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function fmt(n) {
  const v = Number(n) || 0;
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return `${v}`;
}
function fmtDate(iso) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
}
