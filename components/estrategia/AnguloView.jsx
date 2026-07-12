"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, ExternalLink, ArrowRight, Youtube, Instagram, Linkedin, Music, Play } from "lucide-react";
import { O, OL, OB, GR, GL, MU, BORDER, LILA, LILA_L, LILA_B, CONTENT_TYPE_LABEL, PLATFORM_LABEL, ANGLE_TYPE_LABEL } from "@/components/estrategia/theme";

// ═══ AnguloView — panel/vista de ángulo cross-episodio (spec universo §5).
// Portal, cierre X/overlay/Escape. Muestra todas las piezas del producto con
// ese angle_type, con agregados de alcance/engagement/subs.
//
// props:
//   angleType             — string; ej 'errores_mitos'
//   onClose               — cerrar
//   onOpenPieza(pieza)    — abrir el PiezaPanel de una pieza clickeada
export default function AnguloView({ angleType, onClose, onOpenPieza }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!angleType) return;
    setLoading(true); setErr(null);
    fetch(`/api/angulos/${encodeURIComponent(angleType)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(j => {
        if (j?.error) throw new Error(j.error);
        setData(j);
      })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [angleType]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  if (!mounted || !angleType) return null;

  const resumen = data?.resumen;
  const piezas = data?.piezas || [];

  return createPortal(
    <>
      <div onClick={onClose} className="fixed inset-0 z-[95]" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }} />
      <div
        className="fixed right-0 top-0 h-full bg-white z-[100] shadow-2xl flex flex-col"
        style={{ width: 'min(680px, 96vw)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-stone-400">Ángulo</span>
            <p className="text-[15px] font-semibold text-stone-800">
              {ANGLE_TYPE_LABEL[angleType] || angleType}
            </p>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: LILA_L, color: LILA, border: `1px solid ${LILA_B}` }}>
              cross-episodios
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100 shrink-0"><X size={18} color={MU} /></button>
        </div>

        {loading ? (
          <div className="p-6 flex items-center gap-2 text-sm text-stone-400"><Loader2 size={14} className="animate-spin" /> Cargando…</div>
        ) : err ? (
          <div className="p-6 text-sm text-red-600 bg-red-50">{err}</div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {resumen && (
              <div className="px-5 py-4 border-b" style={{ borderColor: BORDER }}>
                <div className="grid grid-cols-4 gap-3">
                  <StatCard label="Publicadas" value={resumen.piezas} bg="#F5F5F4" />
                  <StatCard label="Alcance" value={fmt(resumen.alcance_total)} bg={OL} />
                  <StatCard label="Engagement" value={`${(resumen.engagement_promedio || 0).toFixed(1)}%`} bg={GL} />
                  <StatCard label="Subs" value={resumen.subs_total} bg={LILA_L} />
                </div>
                {(resumen.propuestas > 0 || resumen.descartadas > 0) && (
                  <p className="text-[11px] text-stone-400 mt-3">
                    {resumen.propuestas > 0 && <>{resumen.propuestas} propuestas · </>}
                    {resumen.descartadas > 0 && <>{resumen.descartadas} descartadas · </>}
                    <span>{resumen.piezas} publicadas</span>
                  </p>
                )}
              </div>
            )}

            <div className="px-5 py-4">
              {piezas.length === 0 ? (
                <p className="text-sm text-stone-400 italic py-6 text-center">
                  Sin piezas para este ángulo aún.
                </p>
              ) : (
                <div className="space-y-2">
                  {piezas.map(p => (
                    <button
                      key={p.id}
                      onClick={() => onOpenPieza?.(p)}
                      className="w-full text-left flex items-center gap-3 p-3 rounded-xl border hover:border-orange-300 transition-colors"
                      style={{ borderColor: BORDER, opacity: p.status === 'descartada' ? 0.7 : 1 }}
                    >
                      <PlatformIcon platform={p.platform} />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[13px] font-medium text-stone-800 truncate"
                          style={{ textDecoration: p.status === 'descartada' ? 'line-through' : 'none' }}
                        >
                          {p.title}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5 flex-wrap">
                          {p.origin_label && <span className="truncate">{p.origin_label}</span>}
                          <span>·</span>
                          <span>{CONTENT_TYPE_LABEL[p.content_type] || p.content_type}</span>
                          {p.status !== 'publicada' && (
                            <><span>·</span><StatusChip status={p.status} /></>
                          )}
                        </div>
                      </div>
                      {p.status === 'publicada' && (
                        <div className="text-right shrink-0">
                          <p className="text-[13px] font-medium text-stone-800">{fmt(p.reach)}</p>
                          {typeof p.engagement_rate === 'number' && (
                            <p className="text-[10px] text-stone-500">{p.engagement_rate.toFixed(1)}%</p>
                          )}
                        </div>
                      )}
                      <ArrowRight size={12} color={MU} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>,
    document.body
  );
}

function StatCard({ label, value, bg }) {
  return (
    <div className="rounded-xl p-3" style={{ background: bg }}>
      <p className="text-[10px] uppercase tracking-widest text-stone-500">{label}</p>
      <p className="text-[18px] font-semibold text-stone-800 mt-0.5">{value}</p>
    </div>
  );
}

function StatusChip({ status }) {
  const map = {
    propuesta: { bg: OL, color: O, label: 'propuesta' },
    descartada: { bg: '#F5F5F4', color: MU, label: 'descartada' },
  };
  const s = map[status]; if (!s) return null;
  return (
    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function PlatformIcon({ platform }) {
  const s = 14, c = MU;
  const map = {
    youtube: <Youtube size={s} color={c} />, instagram: <Instagram size={s} color={c} />,
    linkedin: <Linkedin size={s} color={c} />, spotify: <Music size={s} color={c} />, tiktok: <Play size={s} color={c} />,
  };
  return <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">{map[platform] || <ExternalLink size={s} color={c} />}</div>;
}

function fmt(n) {
  const v = Number(n) || 0;
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return `${v}`;
}
