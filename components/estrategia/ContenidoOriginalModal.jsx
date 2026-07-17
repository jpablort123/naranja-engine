"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Loader2, Sparkles, Check, Wand2 } from "lucide-react";
import { api } from "@/components/ui";
import { O, OL, OB, GR, GL, MU, BORDER, ANGLE_TYPE_OPTIONS, CONTENT_TYPE_LABEL } from "@/components/estrategia/theme";

// spec §3 Módulo C — "+ contenido original".
// creation_source='idea_propia'. Libreto opcional. Si viene, endpoint
// /api/publicaciones/sugerir-angulo llama a Claude para proponer angle_type.
// Hermanas por plataforma (mismo content_group_id).
export default function ContenidoOriginalModal({ onClose, onCreated, defaultEpisodeId }) {
  const [episodes, setEpisodes] = useState([]);
  const [originType, setOriginType] = useState(defaultEpisodeId ? 'episode' : 'episode');
  const [originId, setOriginId] = useState(defaultEpisodeId || '');
  const [contentType, setContentType] = useState('reel');
  const [angleType, setAngleType] = useState('otro');
  const [title, setTitle] = useState('');
  const [libreto, setLibreto] = useState('');
  const [links, setLinks] = useState([{ platform: 'instagram', url: '' }]);
  const [suggestion, setSuggestion] = useState(null);
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    api('/api/episodes').then(d => setEpisodes(Array.isArray(d) ? d : []));
  }, []);
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const sugerir = async () => {
    if (!libreto || libreto.trim().length < 20) {
      setErr('El libreto necesita al menos 20 caracteres para sugerir un ángulo.');
      return;
    }
    setSuggesting(true); setErr(null);
    try {
      const r = await api('/api/publicaciones/sugerir-angulo', {
        method: 'POST',
        body: JSON.stringify({ libreto }),
      });
      if (r?.error) throw new Error(r.error);
      setSuggestion(r);
      setAngleType(r.angle_type || 'otro');
    } catch (e) { setErr(e.message); }
    finally { setSuggesting(false); }
  };

  const submit = async () => {
    if (!title.trim()) return setErr('Falta el título');
    const clean = links.map(l => ({ platform: (l.platform || '').toLowerCase(), url: (l.url || '').trim() })).filter(l => l.platform && l.url);
    if (clean.length === 0) return setErr('Al menos un link');
    setSaving(true); setErr(null);
    try {
      const r = await api('/api/publicaciones/original', {
        method: 'POST',
        body: JSON.stringify({
          origin_type: originType,
          origin_id: originType === 'episode' ? originId || null : null,
          content_type: contentType,
          angle_type: angleType,
          title: title.trim(),
          libreto: libreto?.trim() || null,
          links: clean,
        }),
      });
      if (r?.error) throw new Error(r.error);
      onCreated?.(r);
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  if (!mounted) return null;
  return createPortal(
    <div onClick={onClose} className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: BORDER }}>
          <h3 className="font-semibold text-stone-800">+ Contenido original</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100"><X size={18} color={MU} /></button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <p className="text-[11px] text-stone-500 italic">
            Para lo que la copy hace por fuera del sistema (frecuente en reels). Se guarda con <code>creation_source='idea_propia'</code>. El libreto es opcional; si lo pegás, Claude sugiere el ángulo.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Madre">
              <div className="flex gap-2 mb-2">
                {['episode', 'manual'].map(t => (
                  <button
                    key={t}
                    onClick={() => { setOriginType(t); if (t !== 'episode') setOriginId(''); }}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                    style={{
                      borderColor: originType === t ? O : BORDER,
                      background: originType === t ? OL : 'white',
                      color: originType === t ? O : '#57534E',
                    }}
                  >
                    {t === 'episode' ? 'Episodio' : 'Manual'}
                  </button>
                ))}
              </div>
              {originType === 'episode' && (
                <select
                  value={originId}
                  onChange={e => setOriginId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-orange-300"
                  style={{ borderColor: BORDER }}
                >
                  <option value="">— seleccionar —</option>
                  {episodes.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              )}
            </Field>
            <Field label="Tipo">
              <select
                value={contentType}
                onChange={e => setContentType(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-orange-300"
                style={{ borderColor: BORDER }}
              >
                {Object.entries(CONTENT_TYPE_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Título">
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Reel — La trampa del ROAS"
              className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-orange-300"
              style={{ borderColor: BORDER }}
            />
          </Field>

          <Field label="Libreto (opcional, sirve para sugerir el ángulo)">
            <textarea
              value={libreto}
              onChange={e => setLibreto(e.target.value)}
              rows={4}
              placeholder="Pega el guión aquí. Se guarda como semilla; no lo procesamos más allá de sugerir el ángulo."
              className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-orange-300 resize-y"
              style={{ borderColor: BORDER }}
            />
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={sugerir}
                disabled={suggesting}
                className="text-[11px] font-medium px-2 py-1 rounded border hover:bg-orange-50 flex items-center gap-1"
                style={{ borderColor: OB, color: O }}
              >
                {suggesting ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
                sugerir ángulo
              </button>
              {suggestion && (
                <span className="text-[11px] text-stone-500">
                  <span className="font-medium" style={{ color: O }}>{ANGLE_TYPE_OPTIONS.find(a => a.value === suggestion.angle_type)?.label || suggestion.angle_type}</span>
                  {' · '}
                  <span className="italic">{suggestion.razon}</span>
                </span>
              )}
            </div>
          </Field>

          <Field label="Ángulo">
            <select
              value={angleType}
              onChange={e => setAngleType(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-orange-300"
              style={{ borderColor: BORDER }}
            >
              {ANGLE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>

          <Field label="Publicaciones (una o varias plataformas)">
            <div className="space-y-2">
              {links.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={l.platform}
                    onChange={e => setLinks(prev => prev.map((x, j) => j === i ? { ...x, platform: e.target.value } : x))}
                    className="text-xs border rounded-lg px-2 py-1.5 focus:outline-none"
                    style={{ borderColor: BORDER }}
                  >
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="spotify">Spotify</option>
                  </select>
                  <input
                    value={l.url}
                    onChange={e => setLinks(prev => prev.map((x, j) => j === i ? { ...x, url: e.target.value } : x))}
                    placeholder="https://…"
                    className="flex-1 text-xs border rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-300"
                    style={{ borderColor: BORDER }}
                  />
                  {links.length > 1 && (
                    <button onClick={() => setLinks(prev => prev.filter((_, j) => j !== i))}
                            className="p-1 rounded hover:bg-stone-100">
                      <X size={12} color={MU} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setLinks(prev => [...prev, { platform: 'tiktok', url: '' }])}
                className="text-[11px] text-stone-500 hover:text-orange-600 flex items-center gap-1"
              >
                <Plus size={10} /> otra plataforma
              </button>
            </div>
          </Field>

          {err && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
        </div>

        <div className="px-6 py-4 border-t flex items-center gap-2 justify-end" style={{ borderColor: BORDER }}>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-stone-600 hover:bg-stone-100">Cancelar</button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 flex items-center gap-2"
            style={{ background: saving ? '#D6D3D1' : O }}
          >
            {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando…</> : <><Sparkles size={14} /> Crear publicación</>}
          </button>
        </div>
      </div>
    </div>,
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
