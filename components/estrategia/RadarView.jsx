"use client";
import { useEffect, useState } from "react";
import {
  Loader2, Sparkles, TrendingUp, TrendingDown, ArrowRight,
  Youtube, Instagram, Linkedin, Music, Play, ExternalLink,
} from "lucide-react";
import {
  O, OL, OB, GR, GL, MU, BORDER, CARD_ORANGE, CARD_SUCCESS, CARD_NEUTRAL,
  LILA, LILA_L, LILA_B,
  CONTENT_TYPE_LABEL, PLATFORM_LABEL, ANGLE_TYPE_LABEL,
} from "@/components/estrategia/theme";
import RegistrarPublicacionModal from "@/components/estrategia/RegistrarPublicacionModal";

// spec §7 — Radar (home fusionado). Consume /api/radar con cache:'no-store'
// (biblia §15 error #15).
export default function RadarView({ onVerLinaje }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [openModal, setOpenModal] = useState(false);

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const r = await fetch('/api/radar', { cache: 'no-store' });
      const j = await r.json();
      if (j?.error) throw new Error(j.error);
      setData(j);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const pulso = data?.pulso;
  const patrones = data?.patrones;
  const delta7 = (pulso?.subs_nuevos_7d || 0) - (pulso?.subs_prev_7d || 0);
  const deltaPct = pulso?.subs_prev_7d ? Math.round((delta7 / pulso.subs_prev_7d) * 100) : (pulso?.subs_nuevos_7d ? 100 : 0);

  return (
    <div className="p-6 md:p-8 mx-auto max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Radar</h1>
          <p className="text-sm text-stone-500 mt-0.5">últimos 7 días</p>
        </div>
        <button
          onClick={() => setOpenModal(true)}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 flex items-center gap-2"
          style={{ background: O }}
        >
          <Sparkles size={14} /> Registrar publicación
        </button>
      </div>

      {loading && (
        <div className="text-sm text-stone-400 flex items-center gap-2 py-8">
          <Loader2 size={14} className="animate-spin" /> Cargando pulso…
        </div>
      )}
      {err && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">{err}</div>
      )}

      {pulso && (
        <>
          {/* ─── Zona A: Pulso ─── */}
          <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <MetricCard
              label="Suscriptores nuevos"
              value={pulso.subs_nuevos_7d}
              hint={`vs ${pulso.subs_prev_7d || 0} semana previa`}
              delta={delta7}
              deltaPct={deltaPct}
              bg={CARD_ORANGE}
            />
            <MetricCard
              label="Alcance total"
              value={fmt(pulso.alcance_total_7d)}
              hint="reach · impressions · views"
              bg={CARD_NEUTRAL}
            />
            <MetricCard
              label="Engagement promedio"
              value={`${(pulso.engagement_promedio_7d ?? 0).toFixed(1)}%`}
              hint="últimas piezas"
              bg={CARD_SUCCESS}
            />
            <MetricCard
              label="Piezas publicadas"
              value={pulso.piezas_publicadas_7d}
              hint={`de ${pulso.madres_activas} madre${pulso.madres_activas === 1 ? '' : 's'}`}
              bg={CARD_NEUTRAL}
            />
          </div>

          {/* Qué está funcionando (top piezas) */}
          <div className="rounded-2xl bg-white border p-5 mb-4" style={{ borderColor: BORDER }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-semibold text-stone-800">Qué está funcionando</h2>
              <p className="text-xs text-stone-400">top piezas de la semana</p>
            </div>
            {pulso.top_piezas?.length === 0 ? (
              <EmptyRow>Aún no hay piezas publicadas esta semana. Registra la primera con “+ Registrar publicación”.</EmptyRow>
            ) : (
              <div className="space-y-2">
                {pulso.top_piezas.map((p, i) => (
                  <div key={p.id || i} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: BORDER }}>
                    <PlatformIcon platform={p.platform} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800 truncate">{p.title}</p>
                      <div className="flex items-center gap-2 text-[11px] text-stone-500">
                        <span>{CONTENT_TYPE_LABEL[p.content_type] || p.content_type}</span>
                        <span>·</span>
                        <span>{fmt(p.reach)} de alcance</span>
                        {typeof p.engagement_rate === 'number' && (<><span>·</span><span>{p.engagement_rate.toFixed(1)}% eng.</span></>)}
                      </div>
                    </div>
                    {p.subs > 0 && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
                            style={{ background: GL, color: GR }}>
                        +{p.subs} sub{p.subs === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Último episodio */}
          {pulso.ultimo_episodio && (
            <div className="rounded-2xl bg-white border p-5 mb-8" style={{ borderColor: BORDER }}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-1">Último episodio</p>
                  <p className="text-[15px] font-semibold text-stone-800 truncate">{pulso.ultimo_episodio.label || '—'}</p>
                  <div className="flex items-center gap-3 text-[11px] text-stone-500 mt-1 flex-wrap">
                    <span>{pulso.ultimo_episodio.piezas} pieza{pulso.ultimo_episodio.piezas === 1 ? '' : 's'}</span>
                    <span>·</span>
                    <span>{fmt(pulso.ultimo_episodio.alcance)} alcance total</span>
                    {pulso.ultimo_episodio.subs > 0 && (<><span>·</span><span>+{pulso.ultimo_episodio.subs} subs</span></>)}
                  </div>
                </div>
                <button
                  onClick={() => onVerLinaje?.(pulso.ultimo_episodio.origin_id)}
                  className="text-sm font-medium hover:underline flex items-center gap-1"
                  style={{ color: O }}
                >
                  Ver linaje <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Divisor sutil entre zonas */}
          <div className="h-px w-full mb-8" style={{ background: BORDER }} />

          {/* ─── Zona B: Qué funciona (patrones) ─── */}
          <div className="mb-2">
            <h2 className="text-lg font-semibold text-stone-800">Qué funciona</h2>
            <p className="text-xs text-stone-500 mt-0.5">sobre todos los episodios</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <PatternCard
              title="Qué gusta más"
              subtitle="engagement por formato"
              rows={patrones?.engagement_por_formato || []}
              color={O}
              bg={OL}
              labelFor={r => CONTENT_TYPE_LABEL[r.key] || r.key}
            />
            <PatternCard
              title="Qué engancha por ángulo"
              subtitle="engagement por tipo de ángulo"
              rows={patrones?.engagement_por_angulo || []}
              color={LILA}
              bg={LILA_L}
              labelFor={r => ANGLE_TYPE_LABEL[r.key] || r.key}
            />
          </div>

          {/* Insight callout */}
          {insightFrom(patrones) && (
            <div className="mt-4 rounded-xl p-4 border" style={{ background: OL, borderColor: OB }}>
              <p className="text-sm text-stone-700"><strong>Insight:</strong> {insightFrom(patrones)}</p>
            </div>
          )}
        </>
      )}

      <RegistrarPublicacionModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onCreated={() => { setOpenModal(false); load(); }}
      />
    </div>
  );
}

// ═══ Sub-componentes ═══

function MetricCard({ label, value, hint, delta, deltaPct, bg }) {
  const up = typeof delta === 'number' && delta > 0;
  const down = typeof delta === 'number' && delta < 0;
  return (
    <div className="rounded-2xl p-4" style={{ background: bg }}>
      <p className="text-[10px] uppercase tracking-widest text-stone-500 font-medium">{label}</p>
      <p className="text-3xl font-semibold text-stone-800 mt-1">{value ?? '—'}</p>
      <div className="flex items-center gap-1 mt-1">
        {(up || down) && (
          <span className="flex items-center gap-0.5 text-[11px] font-medium" style={{ color: up ? GR : '#DC2626' }}>
            {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {deltaPct ? `${Math.abs(deltaPct)}%` : ''}
          </span>
        )}
        {hint && <span className="text-[11px] text-stone-400">{hint}</span>}
      </div>
    </div>
  );
}

// Barras horizontales que animan del 0 al ancho final al montar.
function PatternCard({ title, subtitle, rows, color, bg, labelFor }) {
  const [progress, setProgress] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setProgress(true), 60);
    return () => clearTimeout(t);
  }, [rows]);
  const max = Math.max(1, ...rows.map(r => r.engagement_rate || 0));
  return (
    <div className="rounded-2xl bg-white border p-5" style={{ borderColor: BORDER }}>
      <div className="mb-3">
        <h3 className="text-[14px] font-semibold text-stone-800">{title}</h3>
        <p className="text-[11px] text-stone-400 mt-0.5">{subtitle}</p>
      </div>
      {rows.length < 3 ? (
        <EmptyRow>Aún no hay suficientes publicaciones para ver patrones.</EmptyRow>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r, i) => {
            const width = Math.max(6, Math.round(((r.engagement_rate || 0) / max) * 100));
            return (
              <div key={r.key || i}>
                <div className="flex items-center justify-between text-[12px] mb-1">
                  <span className="text-stone-600">{labelFor(r)}</span>
                  <span className="text-stone-500">{r.engagement_rate?.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: bg }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: progress ? `${width}%` : '0%',
                      background: color,
                      transitionDuration: '500ms',
                      transitionTimingFunction: 'ease-out',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyRow({ children }) {
  return <div className="text-sm text-stone-400 italic py-2">{children}</div>;
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

function insightFrom(patrones) {
  if (!patrones) return null;
  const f = patrones.engagement_por_formato || [];
  const a = patrones.engagement_por_angulo || [];
  if (f.length < 2 && a.length < 2) return null;
  const topFormato = f[0];
  const topAngulo = a[0];
  const parts = [];
  if (topFormato) parts.push(`los ${topFormato.key === 'reel' ? 'reels' : (CONTENT_TYPE_LABEL[topFormato.key] || topFormato.key).toLowerCase() + 's'} lideran engagement (${topFormato.engagement_rate.toFixed(1)}%)`);
  if (topAngulo) parts.push(`entre ángulos, ${(ANGLE_TYPE_LABEL[topAngulo.key] || topAngulo.key).toLowerCase()} es el que más engancha (${topAngulo.engagement_rate.toFixed(1)}%)`);
  if (parts.length === 0) return null;
  return parts.join('; ') + '.';
}
