"use client";
import { useState } from "react";
import { X, Upload, Loader2, FileText, Link as LinkIcon, Sparkles } from "lucide-react";
import { O, OL, OB, GR, GL, MU, api, apiRetry } from "@/components/ui";

// ═══ Modal unificado de "Nuevo episodio" con dos vías:
//   (a) Link de Descript (auto-import transcript SRT + txt)
//   (b) Archivo .txt (respaldo, comportamiento previo)
//
// Al hacer submit, avisa al padre con { name, transcript, descript? } y el padre
// arma el episodio y arranca el flujo (fase angles → contenido → minado).
export default function DescriptImportModal({ onClose, onSubmit }) {
  const [mode, setMode] = useState("descript"); // 'descript' | 'file'
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [tx, setTx] = useState("");
  const [fn, setFn] = useState("");
  const [importing, setImporting] = useState(false);
  const [err, setErr] = useState(null);

  const readFile = (f) => {
    if (!f) return;
    setFn(f.name);
    const r = new FileReader();
    r.onload = (e) => setTx(e.target.result);
    r.readAsText(f);
  };

  const importDescript = async () => {
    if (!link.trim()) return;
    setImporting(true); setErr(null);
    try {
      const body = { descript_link: link.trim() };
      if (name.trim()) body.name = name.trim();
      // apiRetry: cold-start del server tumba el primer fetch a Descript en
      // frío bastante seguido; 3 intentos con backoff 500ms → 1s → 2s.
      const r = await apiRetry(
        "/api/descript/import",
        { method: "POST", body: JSON.stringify(body) },
        { tries: 3, baseDelay: 500 }
      );
      if (r.error) throw new Error(r.error);
      // El endpoint ya creó el episodio en Supabase. Le devolvemos al padre
      // el episode ya creado para que arranque angles.
      onSubmit({ mode: "descript", episode: r.episode, project: r.project });
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setImporting(false);
    }
  };

  const submitFile = () => {
    if (!name.trim() || !tx.trim()) return;
    onSubmit({ mode: "file", name: name.trim(), transcript: tx.trim() });
  };

  const disabledFile = !(name.trim() && tx.trim());
  const disabledDescript = !link.trim() || importing;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h3 className="font-semibold text-stone-800">Nuevo episodio</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100"><X size={18} color={MU} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode("descript")}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all"
              style={{
                borderColor: mode === "descript" ? O : "#E7E5E4",
                background: mode === "descript" ? OL : "white",
                color: mode === "descript" ? O : MU,
              }}
            >
              <LinkIcon size={20} />
              <span className="text-xs font-medium">Link de Descript</span>
            </button>
            <button
              onClick={() => setMode("file")}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all"
              style={{
                borderColor: mode === "file" ? O : "#E7E5E4",
                background: mode === "file" ? OL : "white",
                color: mode === "file" ? O : MU,
              }}
            >
              <Upload size={20} />
              <span className="text-xs font-medium">Archivo .txt</span>
            </button>
          </div>

          {mode === "descript" ? (
            <>
              <div>
                <label className="text-sm font-medium text-stone-600 block mb-1.5">Link del episodio en Descript</label>
                <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://web.descript.com/{project_id}/{short_id}"
                  className="w-full px-4 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-orange-300"
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  Pega el link del proyecto donde ya cargaste el episodio. Traemos el transcript automáticamente.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-stone-600 block mb-1.5">Nombre (opcional)</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Silvi — Rappi Retail Media (queda el del proyecto de Descript si dejas vacío)"
                  className="w-full px-4 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-orange-300"
                />
              </div>
              {err && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {err}
                </div>
              )}
              <button
                onClick={importDescript}
                disabled={disabledDescript}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 flex items-center justify-center gap-2"
                style={{ background: disabledDescript ? "#D6D3D1" : O, cursor: disabledDescript ? "not-allowed" : "pointer" }}
              >
                {importing ? <><Loader2 size={16} className="animate-spin" /> Importando transcript...</> : <><Sparkles size={16} /> Importar y procesar</>}
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium text-stone-600 block mb-1.5">Nombre del episodio</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Silvi — Rappi Retail Media"
                  className="w-full px-4 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-orange-300"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-600 block mb-1.5">Transcripción (.txt)</label>
                <FileInput fn={fn} setFn={setFn} setTx={setTx} readFile={readFile} />
              </div>
              <button
                onClick={submitFile}
                disabled={disabledFile}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90"
                style={{ background: disabledFile ? "#D6D3D1" : O, cursor: disabledFile ? "not-allowed" : "pointer" }}
              >
                Procesar episodio
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FileInput({ fn, setFn, setTx, readFile }) {
  return (
    <>
      {fn ? (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200">
          <FileText size={16} color={GR} />
          <span className="text-sm text-green-700 font-medium flex-1 truncate">{fn}</span>
          <button onClick={() => { setFn(""); setTx(""); }} className="p-1 rounded hover:bg-green-100">
            <X size={14} color={GR} />
          </button>
        </div>
      ) : (
        <label className="border-2 border-dashed border-stone-200 rounded-xl p-8 text-center cursor-pointer hover:border-orange-300 hover:bg-orange-50/30 transition-all block">
          <Upload size={28} color={MU} className="mx-auto mb-2" />
          <p className="text-sm text-stone-500">Arrastra tu archivo .txt aquí</p>
          <p className="text-xs text-stone-400 mt-1">o haz click para seleccionar</p>
          <input
            type="file"
            accept=".txt,.srt,.vtt"
            onChange={(e) => readFile(e.target.files?.[0])}
            className="hidden"
          />
        </label>
      )}
    </>
  );
}
