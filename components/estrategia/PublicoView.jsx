"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Upload, TrendingUp, TrendingDown, X, Users, Save, Check } from "lucide-react";
import { api } from "@/components/ui";
import { O, OL, OB, GR, GL, MU, BORDER, CARD_ORANGE, CARD_SUCCESS, CARD_NEUTRAL } from "@/components/estrategia/theme";

// spec §8 — Público (foco: conteo y crecimiento).
// El enriquecimiento cargo/empresa/is_target existe pero NO protagoniza la UI:
// se muestra si viene poblado; se puede editar en un panel lateral (createPortal).
export default function PublicoView() {
  const [subs, setSubs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const r = await api('/api/subscribers');
      if (r?.error) throw new Error(r.error);
      setSubs(r.subscribers || []);
      setSummary(r.summary || null);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const delta7 = (summary?.nuevos_7d || 0) - (summary?.prev_7d || 0);

  return (
    <div className="p-6 md:p-8 mx-auto max-w-5xl">
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Público</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {summary ? <>{fmt(summary.total)} suscriptor{summary.total === 1 ? '' : 'es'} · +{summary.nuevos_7d} esta semana</> : 'cargando…'}
          </p>
        </div>
        <button
          onClick={() => setImportOpen(true)}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 flex items-center gap-2"
          style={{ background: O }}
        >
          <Upload size={14} /> Importar CSV de Substack
        </button>
      </div>

      {err && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{err}</div>}

      {/* Metric cards de crecimiento */}
      {summary && (
        <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          <MetricCard label="Total" value={fmt(summary.total)} hint="suscriptores" bg={CARD_NEUTRAL} />
          <MetricCard
            label="Nuevos (7d)"
            value={summary.nuevos_7d}
            hint={`vs ${summary.prev_7d} semana previa`}
            delta={delta7}
            bg={CARD_ORANGE}
          />
          <MetricCard label="Nuevos hoy" value={summary.nuevos_hoy} hint="hoy" bg={CARD_SUCCESS} />
        </div>
      )}

      {/* Lista */}
      <div className="rounded-2xl bg-white border" style={{ borderColor: BORDER }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
          <h2 className="text-[15px] font-semibold text-stone-800 flex items-center gap-2">
            <Users size={16} color={MU} /> Suscriptores
          </h2>
          {loading && <Loader2 size={14} className="animate-spin" color={MU} />}
        </div>
        {!loading && subs.length === 0 ? (
          <div className="p-8 text-center text-sm text-stone-400 italic">
            Aún no hay suscriptores. Importa el CSV de Substack para empezar.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: BORDER }}>
            {subs.slice(0, 200).map(s => (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                className="w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-stone-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{s.email}</p>
                  <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5 flex-wrap">
                    {s.subscribed_at && <span>{fmtDate(s.subscribed_at)}</span>}
                    {s.source_platform && <><span>·</span><span>{s.source_platform}</span></>}
                    {(s.cargo || s.empresa) && (
                      <><span>·</span><span className="truncate max-w-[240px]">{[s.cargo, s.empresa].filter(Boolean).join(' · ')}</span></>
                    )}
                  </div>
                </div>
              </button>
            ))}
            {subs.length > 200 && (
              <p className="px-5 py-3 text-[11px] text-stone-400 italic">Mostrando 200 de {subs.length}. Filtros pendientes para una versión futura.</p>
            )}
          </div>
        )}
      </div>

      {importOpen && (
        <ImportCsvModal
          onClose={() => setImportOpen(false)}
          onImported={() => { setImportOpen(false); load(); }}
        />
      )}
      {selected && (
        <EnrichPanel
          subscriber={selected}
          onClose={() => setSelected(null)}
          onSaved={(next) => {
            setSelected(null);
            setSubs(prev => prev.map(x => x.id === next.id ? next : x));
          }}
        />
      )}
    </div>
  );
}

function MetricCard({ label, value, hint, delta, bg }) {
  const up = typeof delta === 'number' && delta > 0;
  const down = typeof delta === 'number' && delta < 0;
  return (
    <div className="rounded-2xl p-4" style={{ background: bg }}>
      <p className="text-[10px] uppercase tracking-widest text-stone-500 font-medium">{label}</p>
      <p className="text-3xl font-semibold text-stone-800 mt-1">{value ?? '—'}</p>
      <div className="flex items-center gap-1 mt-1">
        {(up || down) && (
          <span className="flex items-center gap-0.5 text-[11px] font-medium" style={{ color: up ? GR : '#DC2626' }}>
            {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {Math.abs(delta)}
          </span>
        )}
        {hint && <span className="text-[11px] text-stone-400">{hint}</span>}
      </div>
    </div>
  );
}

// ═══ Modal de import CSV ═══
function ImportCsvModal({ onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const upload = async () => {
    if (!file) return;
    setUploading(true); setErr(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/subscribers/import', { method: 'POST', body: fd });
      const j = await r.json();
      if (j?.error) throw new Error(j.error);
      setResult(j);
    } catch (e) {
      setErr(e.message);
    } finally {
      setUploading(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: BORDER }}>
          <h3 className="font-semibold text-stone-800">Importar CSV de Substack</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100"><X size={18} color={MU} /></button>
        </div>
        <div className="p-6 space-y-4">
          {result ? (
            <>
              <div className="text-sm text-stone-600">
                <p><strong>{result.importados}</strong> filas procesadas.</p>
                <p><strong>{result.nuevos}</strong> nuevos suscriptores.</p>
                <p><strong>{result.actualizados}</strong> ya existían (upsert sin duplicar).</p>
              </div>
              <button onClick={onImported} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90" style={{ background: O }}>
                Ver lista
              </button>
            </>
          ) : (
            <>
              <label className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-orange-300 hover:bg-orange-50/30 transition-all block"
                     style={{ borderColor: BORDER }}>
                <Upload size={24} color={MU} className="mx-auto mb-2" />
                <p className="text-sm text-stone-600">
                  {file ? file.name : 'Arrastra el CSV o haz click para seleccionar'}
                </p>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              {err && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-stone-600 border hover:bg-stone-50"
                        style={{ borderColor: BORDER }}>
                  Cancelar
                </button>
                <button
                  onClick={upload}
                  disabled={!file || uploading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 flex items-center justify-center gap-2"
                  style={{ background: file && !uploading ? O : '#D6D3D1' }}
                >
                  {uploading ? <><Loader2 size={14} className="animate-spin" /> Importando…</> : 'Importar'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ═══ Panel lateral de enriquecimiento (latente) ═══
function EnrichPanel({ subscriber, onClose, onSaved }) {
  const [cargo, setCargo] = useState(subscriber.cargo || '');
  const [empresa, setEmpresa] = useState(subscriber.empresa || '');
  const [notes, setNotes] = useState(subscriber.notes || '');
  const [isTarget, setIsTarget] = useState(subscriber.is_target === true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const save = async () => {
    setSaving(true);
    try {
      const r = await api(`/api/subscribers?id=${subscriber.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          cargo: cargo.trim() || null,
          empresa: empresa.trim() || null,
          notes: notes.trim() || null,
          is_target: isTarget,
          status: (cargo || empresa) ? 'clasificado' : subscriber.status,
        }),
      });
      if (r?.error) throw new Error(r.error);
      setSaved(true);
      setTimeout(() => onSaved?.(r.subscriber), 400);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;
  return createPortal(
    <>
      <div onClick={onClose} className="fixed inset-0 z-[95]" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }} />
      <div
        className="fixed right-0 top-0 h-full bg-white z-[100] shadow-2xl flex flex-col"
        style={{ width: 'min(420px, 92vw)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: BORDER }}>
          <h3 className="font-semibold text-stone-800 truncate">{subscriber.email}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100"><X size={18} color={MU} /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <p className="text-[11px] text-stone-400 italic">
            Campos opcionales para ir sembrando datos. No cambian conteos ni entran en las vistas de esta versión.
          </p>
          <Field label="Cargo">
            <input value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Ej: CMO, Founder…"
                   className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-orange-300" style={{ borderColor: BORDER }} />
          </Field>
          <Field label="Empresa">
            <input value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Ej: Rappi"
                   className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-orange-300" style={{ borderColor: BORDER }} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
            <input type="checkbox" checked={isTarget} onChange={e => setIsTarget(e.target.checked)} className="w-4 h-4 accent-orange-600" />
            Marcar como target (opcional, latente)
          </label>
          <Field label="Notas">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Contexto libre"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-orange-300 resize-y" style={{ borderColor: BORDER }} />
          </Field>
        </div>
        <div className="px-5 py-4 border-t flex items-center justify-end gap-2" style={{ borderColor: BORDER }}>
          {saved ? (
            <span className="flex items-center gap-1 text-sm font-medium" style={{ color: GR }}>
              <Check size={14} /> Guardado
            </span>
          ) : (
            <>
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100">Cerrar</button>
              <button onClick={save} disabled={saving}
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 flex items-center gap-2"
                      style={{ background: saving ? '#D6D3D1' : O }}>
                {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando…</> : <><Save size={14} /> Guardar</>}
              </button>
            </>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-[10px] font-medium text-stone-400 uppercase tracking-widest block mb-1.5">{label}</label>
      {children}
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
