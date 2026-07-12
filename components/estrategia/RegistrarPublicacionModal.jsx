"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Sparkles, Check, Copy } from "lucide-react";
import { api } from "@/components/ui";
import {
  O, OL, OB, MU, BORDER,
  CONTENT_TYPE_LABEL, PLATFORM_LABEL,
  ANGLE_TYPE_OPTIONS, CREATION_SOURCE_OPTIONS,
} from "@/components/estrategia/theme";

// spec §6 — Modal accesible desde Radar (+ Registrar publicación) y desde
// Linaje (+ agregar pieza a este episodio). Usa createPortal (biblia §15 #11)
// y cierra con X, click en overlay y Escape.
export default function RegistrarPublicacionModal({
  open,
  onClose,
  onCreated,
  defaultMadre,           // { origin_type, origin_id, origin_label }
  defaultStatus,          // 'publicada' | 'propuesta' | 'descartada'
  runSyncAfterCreate = true,
}) {
  const [origin_type, setOriginType] = useState(defaultMadre?.origin_type || 'episode');
  const [origin_id, setOriginId] = useState(defaultMadre?.origin_id || '');
  const [origin_label, setOriginLabel] = useState(defaultMadre?.origin_label || '');
  const [title, setTitle] = useState('');
  const [content_type, setContentType] = useState('reel');
  const [platform, setPlatform] = useState('instagram');
  const [angle_type, setAngleType] = useState('otro');
  const [creation_source, setCreationSource] = useState('sistema');
  const [published_url, setPublishedUrl] = useState('');
  const [platform_post_id, setPlatformPostId] = useState('');
  // spec universo §4: selector de status (default publicada).
  const [status, setStatus] = useState(defaultStatus || 'publicada');
  const [discard_reason, setDiscardReason] = useState('');

  const [episodes, setEpisodes] = useState([]);
  const [newsletters, setNewsletters] = useState([]);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState(null);
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Cargar madres cuando abre.
  useEffect(() => {
    if (!open) return;
    Promise.all([
      api('/api/episodes'),
      api('/api/newsletters'),
    ]).then(([eps, nls]) => {
      setEpisodes(Array.isArray(eps) ? eps : []);
      setNewsletters(Array.isArray(nls) ? nls : []);
    });
  }, [open]);

  // Sincronizar defaults si cambian (padre puede pre-seleccionar la madre / status).
  useEffect(() => {
    if (!open) return;
    setOriginType(defaultMadre?.origin_type || 'episode');
    setOriginId(defaultMadre?.origin_id || '');
    setOriginLabel(defaultMadre?.origin_label || '');
    setStatus(defaultStatus || 'publicada');
    setDiscardReason('');
    setTitle(''); setPublishedUrl(''); setPlatformPostId(''); setErr(null); setCreated(null);
  }, [open, defaultMadre, defaultStatus]);

  // Cerrar con Escape.
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const madresList = origin_type === 'episode' ? episodes : origin_type === 'newsletter' ? newsletters : [];

  const submit = async () => {
    if (!title.trim() || !content_type || !platform) {
      setErr('Título, tipo de contenido y plataforma son requeridos');
      return;
    }
    if (status === 'descartada' && !discard_reason.trim()) {
      setErr('Contame la razón del descarte (aunque sea una línea).');
      return;
    }
    setCreating(true); setErr(null);
    try {
      const body = {
        title: title.trim(),
        content_type,
        platform,
        published_url: status === 'publicada' ? (published_url.trim() || null) : null,
        platform_post_id: platform_post_id.trim() || null,
        origin_type,
        origin_id: origin_type === 'manual' ? null : (origin_id || null),
        origin_label: origin_label || (madresList.find(x => x.id === origin_id)?.name || null),
        angle_type,
        creation_source,
        status,
        discard_reason: status === 'descartada' ? discard_reason.trim() : null,
      };
      const r = await api('/api/published', { method: 'POST', body: JSON.stringify(body) });
      if (r?.error) throw new Error(r.error);
      setCreated(r.item);
      if (runSyncAfterCreate && r?.item?.id && r.item.status === 'publicada') {
        // Solo sembramos métricas cuando la pieza YA está publicada (las
        // propuestas/descartes no tienen datos que capturar).
        api('/api/metrics/sync', { method: 'POST', body: JSON.stringify({ published_item_ids: [r.item.id] }) }).catch(() => {});
      }
      onCreated?.(r.item);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setCreating(false);
    }
  };

  const utmValue = created?.utm_campaign || '';
  const copyUtm = () => {
    if (!utmValue) return;
    navigator.clipboard.writeText(utmValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const content = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: BORDER }}>
          <h3 className="font-semibold text-stone-800">
            {created ? '✅ Publicación registrada' : '+ Registrar publicación'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100">
            <X size={18} color={MU} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {created ? (
            <>
              <p className="text-sm text-stone-600">
                Se creó la pieza <strong>{created.title}</strong>. La UTM está lista para pegar en el
                link cuando publiques.
              </p>
              <div className="rounded-xl border p-3 flex items-center gap-2" style={{ borderColor: OB, background: OL }}>
                <code className="text-xs flex-1 break-all font-mono text-stone-700">
                  {utmValue || '(sin UTM — faltaba madre o plataforma)'}
                </code>
                {utmValue && (
                  <button onClick={copyUtm} className="p-2 rounded-lg hover:bg-white transition-colors" title="Copiar">
                    {copied ? <Check size={14} color="#16A34A" /> : <Copy size={14} color={O} />}
                  </button>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setCreated(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-stone-600 border hover:bg-stone-50"
                  style={{ borderColor: BORDER }}
                >
                  Registrar otra
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90"
                  style={{ background: O }}
                >
                  Cerrar
                </button>
              </div>
            </>
          ) : (
            <>
              <Field label="Estado">
                <div className="flex gap-2">
                  {[
                    { key: 'publicada', label: 'Publicada', bg: GL, color: GR },
                    { key: 'propuesta', label: 'Propuesta', bg: OL, color: O },
                    { key: 'descartada', label: 'Descartada', bg: '#F5F5F4', color: MU },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setStatus(opt.key)}
                      className="flex-1 py-2 rounded-lg text-xs font-medium border transition-colors"
                      style={{
                        borderColor: status === opt.key ? opt.color : BORDER,
                        background: status === opt.key ? opt.bg : 'white',
                        color: status === opt.key ? opt.color : '#57534E',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-stone-400 mt-1.5">
                  {status === 'publicada' && 'Ya la publicaste, con URL y todo.'}
                  {status === 'propuesta' && 'Idea del sistema para producir después. Sin URL.'}
                  {status === 'descartada' && 'Decidiste no publicarla; guardamos la razón como aprendizaje.'}
                </p>
              </Field>

              <Field label="De qué madre viene">
                <div className="flex gap-2 mb-2">
                  {['episode', 'newsletter', 'manual'].map(t => (
                    <button
                      key={t}
                      onClick={() => { setOriginType(t); setOriginId(''); setOriginLabel(''); }}
                      className="flex-1 py-2 rounded-lg text-xs font-medium border transition-colors"
                      style={{
                        borderColor: origin_type === t ? O : BORDER,
                        background: origin_type === t ? OL : 'white',
                        color: origin_type === t ? O : '#57534E',
                      }}
                    >
                      {t === 'episode' ? 'Episodio' : t === 'newsletter' ? 'Newsletter' : 'Manual'}
                    </button>
                  ))}
                </div>
                {origin_type !== 'manual' ? (
                  <select
                    value={origin_id}
                    onChange={e => {
                      const id = e.target.value;
                      setOriginId(id);
                      const hit = madresList.find(x => x.id === id);
                      setOriginLabel(hit?.name || '');
                    }}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-orange-300"
                    style={{ borderColor: BORDER }}
                  >
                    <option value="">— Seleccionar {origin_type === 'episode' ? 'episodio' : 'newsletter'} —</option>
                    {madresList.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={origin_label}
                    onChange={e => setOriginLabel(e.target.value)}
                    placeholder="Etiqueta libre para atribuir (opcional)"
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-orange-300"
                    style={{ borderColor: BORDER }}
                  />
                )}
              </Field>

              <Field label="Título de la pieza">
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ej: Reel — La trampa del ROAS"
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-orange-300"
                  style={{ borderColor: BORDER }}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipo">
                  <select
                    value={content_type}
                    onChange={e => setContentType(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-orange-300"
                    style={{ borderColor: BORDER }}
                  >
                    {Object.entries(CONTENT_TYPE_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Plataforma">
                  <select
                    value={platform}
                    onChange={e => setPlatform(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-orange-300"
                    style={{ borderColor: BORDER }}
                  >
                    {Object.entries(PLATFORM_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipo de ángulo">
                  <select
                    value={angle_type}
                    onChange={e => setAngleType(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-orange-300"
                    style={{ borderColor: BORDER }}
                  >
                    {ANGLE_TYPE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Cómo nació">
                  <select
                    value={creation_source}
                    onChange={e => setCreationSource(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-orange-300"
                    style={{ borderColor: BORDER }}
                  >
                    {CREATION_SOURCE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </Field>
              </div>

              {status === 'publicada' && (
                <Field label="Link publicado (opcional)">
                  <input
                    value={published_url}
                    onChange={e => setPublishedUrl(e.target.value)}
                    placeholder="https://…"
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-orange-300"
                    style={{ borderColor: BORDER }}
                  />
                </Field>
              )}
              {status === 'descartada' && (
                <Field label="Razón del descarte">
                  <textarea
                    value={discard_reason}
                    onChange={e => setDiscardReason(e.target.value)}
                    placeholder="¿Por qué decidiste no publicarla? Se guarda como aprendizaje draft."
                    rows={3}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-orange-300 resize-y"
                    style={{ borderColor: BORDER }}
                  />
                </Field>
              )}

              <Field label="ID de plataforma (opcional)">
                <input
                  value={platform_post_id}
                  onChange={e => setPlatformPostId(e.target.value)}
                  placeholder="videoId / media_id / activity_id"
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-orange-300"
                  style={{ borderColor: BORDER }}
                />
              </Field>

              {err && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {err}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-stone-600 border hover:bg-stone-50"
                  style={{ borderColor: BORDER }}
                >
                  Cancelar
                </button>
                <button
                  onClick={submit}
                  disabled={creating}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 flex items-center justify-center gap-2"
                  style={{ background: creating ? '#D6D3D1' : O }}
                >
                  {creating ? <><Loader2 size={14} className="animate-spin" /> Guardando…</> : <><Sparkles size={14} /> Registrar</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-[10px] font-medium text-stone-400 uppercase tracking-widest block mb-1.5">{label}</label>
      {children}
    </div>
  );
}
