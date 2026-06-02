"use client";
import { useState, useRef } from "react";
import { X, Upload, FileText, Mail } from "lucide-react";
import { O, OL, MU, GR } from "@/components/ui";

export default function NewsletterUploadModal({ onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [articulo, setArticulo] = useState("");
  const [fn, setFn] = useState("");
  const fr = useRef(null);

  const readFile = (f) => {
    if (!f) return;
    setFn(f.name);
    const r = new FileReader();
    r.onload = (e) => setArticulo(e.target.result);
    r.readAsText(f);
  };

  const canSubmit = name.trim() && articulo.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h3 className="font-semibold text-stone-800 flex items-center gap-2">
            <Mail size={16} color={O} /> Nueva edición de newsletter
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100">
            <X size={18} color={MU} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-stone-600 block mb-1.5">Nombre de la edición</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: NL #14 — Retail media y el final de los KPIs vanidosos"
              className="w-full px-4 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-orange-300"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-stone-600 block mb-1.5">Artículo</label>
            <p className="text-xs text-stone-400 mb-3">Pegá el texto del artículo ya escrito o subí un archivo .txt. El Engine NO redacta el newsletter.</p>

            <input ref={fr} type="file" accept=".txt,.md" onChange={(e) => readFile(e.target.files?.[0])} className="hidden" />

            {fn ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 mb-3">
                <FileText size={16} color={GR} />
                <span className="text-sm text-green-700 font-medium flex-1 truncate">{fn}</span>
                <button onClick={() => { setFn(""); setArticulo(""); }} className="p-1 rounded hover:bg-green-100">
                  <X size={14} color={GR} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fr.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); readFile(e.dataTransfer.files?.[0]); }}
                className="border-2 border-dashed border-stone-200 rounded-xl p-5 text-center cursor-pointer hover:border-orange-300 hover:bg-orange-50/30 transition-all mb-3"
              >
                <Upload size={20} color={MU} className="mx-auto mb-1.5" />
                <p className="text-xs text-stone-500">Arrastra tu archivo .txt aquí o haz click para seleccionar</p>
              </div>
            )}

            <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-1.5">O pegá el texto</p>
            <textarea
              value={articulo}
              onChange={(e) => { setArticulo(e.target.value); setFn(""); }}
              placeholder="Pegá acá el artículo final del newsletter..."
              rows={8}
              className="w-full px-4 py-3 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-orange-300 resize-y leading-relaxed"
            />
            <p className="text-[11px] text-stone-400 mt-1.5">{articulo.length} caracteres</p>
          </div>

          <button
            onClick={() => canSubmit && onSubmit(name.trim(), articulo)}
            disabled={!canSubmit}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90"
            style={{ background: canSubmit ? O : "#D6D3D1", cursor: canSubmit ? "pointer" : "not-allowed" }}
          >
            Crear edición
          </button>
        </div>
      </div>
    </div>
  );
}
