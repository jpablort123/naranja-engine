"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { O, OL, OB, GR, GL, MU, BORDER, LILA, LILA_L, LILA_B } from "@/components/estrategia/theme";
import { APRENDIZAJES_DEMO, APRENDIZAJES_DEMO_MES } from "@/lib/aprendizajes-demo";

// ═══ Aprendizajes del mes (spec universo §6) — preview de "narrar".
// Todos los insights son DEMO (ver lib/aprendizajes-demo.js).
// Chrome mínimo, una idea por pantalla, navegación con flechas + clicks.
// Cierre con X y Escape. createPortal (biblia §15 #11).
export default function AprendizajesDelMes({ onClose }) {
  const [i, setI] = useState(0);
  const [showDemoChip, setShowDemoChip] = useState(true);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const total = APRENDIZAJES_DEMO.length;

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'ArrowRight') setI(x => Math.min(total - 1, x + 1));
      if (e.key === 'ArrowLeft') setI(x => Math.max(0, x - 1));
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, total]);

  if (!mounted) return null;
  const insight = APRENDIZAJES_DEMO[i];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: '#FAFAF9' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-3">
          <p className="text-[13px] font-medium text-stone-700">Aprendizajes del mes · {APRENDIZAJES_DEMO_MES}</p>
          <span className="text-[11px] text-stone-400">{i + 1} / {total}</span>
          {showDemoChip && (
            <button
              onClick={() => setShowDemoChip(false)}
              title="Ocultar (todos los insights son demo hasta activar el motor real)"
              className="flex items-center gap-1 text-[10px] font-medium tracking-wider px-2 py-0.5 rounded-full border hover:opacity-70 transition-opacity"
              style={{ borderColor: BORDER, color: MU, background: 'white' }}
            >
              DEMO
              <X size={10} />
            </button>
          )}
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100"><X size={18} color={MU} /></button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-2xl">
          <p className="text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: O }}>
            {insight.eyebrow}
          </p>
          <h1 className="text-[28px] md:text-[32px] font-medium text-stone-900 leading-tight tracking-tight mb-4">
            {insight.titular}
          </h1>
          <p className="text-[15px] text-stone-600 leading-relaxed mb-8 max-w-xl">
            {insight.subtexto}
          </p>

          {insight.viz?.type === 'bars' && (
            <BarsViz series={insight.viz.series} unit={insight.viz.unit} />
          )}

          {insight.recomendacion && (
            <div className="mt-8 rounded-2xl p-5 border" style={{ background: OL, borderColor: OB }}>
              <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: O }}>
                Qué haría con esto
              </p>
              <p className="text-[15px] text-stone-800 leading-relaxed">
                {insight.recomendacion}
              </p>
            </div>
          )}

          <p className="text-[10px] text-stone-400 mt-6 italic">
            Insight demo · el motor real que calcula insights se implementa en un sprint futuro.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-4 flex items-center justify-between" style={{ borderColor: BORDER, background: 'white' }}>
        <button
          onClick={() => setI(x => Math.max(0, x - 1))}
          disabled={i === 0}
          className="flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-orange-600 disabled:opacity-30"
        >
          <ChevronLeft size={16} /> Anterior
        </button>
        <div className="flex items-center gap-1.5">
          {APRENDIZAJES_DEMO.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              className="w-1.5 h-1.5 rounded-full transition-colors"
              style={{ background: idx === i ? O : '#D6D3D1' }}
            />
          ))}
        </div>
        <button
          onClick={() => setI(x => Math.min(total - 1, x + 1))}
          disabled={i === total - 1}
          className="flex items-center gap-1 text-sm font-semibold text-white px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-30"
          style={{ background: O }}
        >
          Siguiente <ChevronRight size={16} />
        </button>
      </div>
    </div>,
    document.body
  );
}

// Barras horizontales — animan al montar. Sin lib externa.
function BarsViz({ series, unit }) {
  const [progress, setProgress] = useState(false);
  useEffect(() => { const t = setTimeout(() => setProgress(true), 100); return () => clearTimeout(t); }, [series]);
  const max = Math.max(1, ...series.map(s => Number(s.value) || 0));
  return (
    <div className="rounded-2xl bg-white border p-5" style={{ borderColor: BORDER }}>
      {unit && <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-3">{unit}</p>}
      <div className="space-y-3">
        {series.map((s, i) => {
          const width = Math.max(6, Math.round(((Number(s.value) || 0) / max) * 100));
          return (
            <div key={i}>
              <div className="flex items-center justify-between text-[13px] mb-1.5">
                <span className="text-stone-700">{s.label}</span>
                <span className="text-stone-500 tabular-nums">{formatValue(s.value)}</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden bg-stone-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: progress ? `${width}%` : '0%',
                    background: s.color || O,
                    transition: 'width 700ms ease-out',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatValue(v) {
  const n = Number(v);
  if (!isFinite(n)) return String(v);
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`;
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}
