"use client";
import { useState, useRef } from "react";
import { X, Upload, FileText, Mail, Loader2 } from "lucide-react";
import { O, OL, MU, GR } from "@/components/ui";

export default function NewsletterUploadModal({ onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [articulo, setArticulo] = useState("");
  const [fn, setFn] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [fileErr, setFileErr] = useState("");
  const fr = useRef(null);

  const readFile = async (f) => {
    if (!f) return;
    setFileErr("");
    const isDocx = /\.docx$/i.test(f.name);
    if (isDocx) {
      setFn(f.name);
      setExtracting(true);
      try {
        const fd = new FormData();
        fd.append("file", f);
        const r = await fetch("/api/newsletters/extract", { method: "POST", body: fd });
        const data = await r.json();
        if (!r.ok) {
          setFileErr(data.error || "No se pudo extraer texto del .docx");
          setFn("");
        } else {
          setArticulo(data.text);
        }
      } catch (err) {
        setFileErr(err.message || "Error subiendo el archivo");
        setFn("");
      } finally {
        setExtracting(false);
      }
      return;
    }
    setFn(f.name);
    const r = new FileReader();
    r.onload = (e) => setArticulo(e.target.result);
    r.readAsText(f);
  };

  const canSubmit = name.trim() && articulo.trim() && !extracting;

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
            <p className="text-xs text-stone-400 mb-3">Pegá el texto del artículo ya escrito o subí un archivo .docx o .txt. El Engine NO redacta el newsletter.</p>

            <input ref={fr} type="file" accept=".docx,.txt,.md" onChange={(e) => readFile(e.target.files?.[0])} className="hidden" />

            {extracting ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-50 border border-orange-200 mb-3">
                <Loader2 size={16} color={O} className="animate-spin" />
                <span className="text-sm text-orange-700 font-medium flex-1 truncate">Extrayendo texto de {fn}...</span>
              </div>
            ) : fn ? (
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
                <p className="text-xs text-stone-500">Arrastra tu archivo .docx o .txt aquí o haz click para seleccionar</p>
              </div>
            )}

            {fileErr && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{fileErr}</div>
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
