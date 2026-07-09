"use client";
import { useState } from "react";
import { Loader2, Sparkles, X, AlertCircle } from "lucide-react";
import { O, OL, OB, GR, GL, MU, api } from "@/components/ui";

// ═══ Barra sticky "Generar en Descript" con modal de confirmación de créditos.
// props:
//   count       — nº de clips seleccionados
//   onDispatch  — async () => Promise<{ ok: boolean, error?: string }> del padre;
//                 el padre arma el payload y llama a /api/descript/jobs/enqueue
//   creditosPorClip (default 9) — costo estimado por clip (SPEC §3.4 ~7-10 c/u)
//   label       — leyenda del CTA principal (default "Generar en Descript")
//   disabledReason — string opcional; si viene, el botón queda deshabilitado con tooltip
export default function DescriptGenerateBar({
  count,
  onDispatch,
  creditosPorClip = 9,
  label = "Generar en Descript",
  disabledReason,
}) {
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  const estimado = count * creditosPorClip;

  const dispatch = async () => {
    setSending(true); setError(null);
    try {
      const r = await onDispatch?.();
      if (r?.ok === false) throw new Error(r.error || "No pude encolar");
      setSent(true);
      setTimeout(() => { setConfirm(false); setSent(false); }, 1500);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSending(false);
    }
  };

  const isDisabled = count === 0 || !!disabledReason;

  return (
    <>
      <div className="sticky bottom-0 left-0 right-0 -mx-4 sm:-mx-6 mt-4 border-t border-stone-200 bg-white/95 backdrop-blur px-4 sm:px-6 py-3 flex items-center gap-3">
        <p className="text-xs text-stone-500 flex-1">
          {count === 0
            ? "Selecciona clips para cortar en Descript."
            : <>{count} seleccionado{count === 1 ? "" : "s"} · ~{estimado} créditos estimados</>}
        </p>
        <button
          onClick={() => !isDisabled && setConfirm(true)}
          disabled={isDisabled}
          title={disabledReason || ""}
          className="py-2.5 px-5 rounded-xl text-sm font-semibold text-white flex items-center gap-2 hover:opacity-90"
          style={{
            background: isDisabled ? "#D6D3D1" : O,
            cursor: isDisabled ? "not-allowed" : "pointer",
          }}
        >
          <Sparkles size={14} /> {label}
        </button>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <h3 className="font-semibold text-stone-800">Confirmar cortes en Descript</h3>
              <button onClick={() => setConfirm(false)} className="p-1 rounded-lg hover:bg-stone-100">
                <X size={18} color={MU} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-sm text-stone-600 leading-relaxed">
                Vamos a encolar <strong>{count}</strong> corte{count === 1 ? "" : "s"} en Descript.
                Estimado: <strong>~{estimado} créditos</strong> ({creditosPorClip} cr/clip).
              </p>
              <p className="text-xs text-stone-400">
                Los cortes se procesan uno a uno (Descript sólo permite un job por proyecto a la vez).
                Puedes cerrar la pestaña y volver: la cola vive en el servidor.
              </p>
              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" /> <span>{error}</span>
                </div>
              )}
              {sent ? (
                <div className="text-sm px-4 py-2.5 rounded-xl font-medium" style={{ background: GL, color: GR }}>
                  Encolado ✓
                </div>
              ) : (
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setConfirm(false)}
                          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-stone-600 border border-stone-200 hover:bg-stone-50">
                    Cancelar
                  </button>
                  <button onClick={dispatch} disabled={sending}
                          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 flex items-center justify-center gap-2"
                          style={{ background: sending ? "#D6D3D1" : O, cursor: sending ? "wait" : "pointer" }}>
                    {sending ? <><Loader2 size={14} className="animate-spin" /> Encolando...</> : <><Sparkles size={14} /> Confirmar</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
