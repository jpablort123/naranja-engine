"use client";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Loader2, Plus, X, Youtube, Instagram, Linkedin, Music, Play, ExternalLink,
  Check, Ban, Sparkles, ChevronRight, ChevronDown,
} from "lucide-react";
import { api } from "@/components/ui";
import {
  O, OL, OB, GR, GL, MU, BORDER, CARD_ORANGE, CARD_SUCCESS,
  CONTENT_TYPE_LABEL, PLATFORM_LABEL, ANGLE_TYPE_OPTIONS, ANGLE_TYPE_LABEL,
} from "@/components/estrategia/theme";
import ContenidoOriginalModal from "@/components/estrategia/ContenidoOriginalModal";

// spec §3 Módulo B — vista semanal "Publicaciones" (la reconciliación).
// Es la superficie donde la PM cierra el ciclo: episodios sin registrar +
// propuestas abiertas. Estilo checklist: solo pegar links o descartar. NO se
// re-escribe ángulo/madre/tipo (eso viaja heredado desde producción).
export default function PublicacionesView() {
  const [state, setState] = useState({ propuestas: [], episodios_sin_registrar: [], episodios_index: {}, loading: true, err: null });
  const [openOriginal, setOpenOriginal] = useState(false);

  const load = async () => {
    setState(s => ({ ...s, loading: true, err: null }));
    try {
      const r = await api('/api/publicaciones');
      if (r?.error) throw new Error(r.error);
      setState({ ...r, loading: false, err: null });
    } catch (e) {
      setState(s => ({ ...s, loading: false, err: e.message }));
    }
  };
  useEffect(() => { load(); }, []);

  // Agrupamos por episodio: primero el episodio-al-aire (si no está
  // registrado), luego sus propuestas abiertas.
  const grupos = useMemo(() => {
    const byEp = new Map();
    // Sembrar por episodios sin registrar (así aparecen aunque no tengan propuestas).
    (state.episodios_sin_registrar || []).forEach(e => {
      byEp.set(e.id, {
        episode_id: e.id,
        episode_label: e.label,
        alAireYT: !e.youtube_registrado,
        alAireSP: !e.spotify_registrado,
        propuestas: [],
      });
    });
    (state.propuestas || []).forEach(p => {
      const key = p.origin_type === 'episode' ? p.origin_id : `orphan:${p.id}`;
      if (!byEp.has(key)) {
        byEp.set(key, {
          episode_id: p.origin_id,
          episode_label: p.origin_label || '(sin madre)',
          alAireYT: false, alAireSP: false,
          propuestas: [],
        });
      }
      byEp.get(key).propuestas.push(p);
    });
    return [...byEp.values()];
  }, [state.propuestas, state.episodios_sin_registrar]);

  return (
    <div className="p-6 md:p-8 mx-auto max-w-4xl">
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Publicaciones</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Registra lo que salió esta semana. Marca publicado o descartado.
          </p>
        </div>
        <button
          onClick={() => setOpenOriginal(true)}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 flex items-center gap-2"
          style={{ background: O }}
        >
          <Plus size={14} /> contenido original
        </button>
      </div>

      {state.loading && (
        <div className="text-sm text-stone-400 flex items-center gap-2 py-4">
          <Loader2 size={14} className="animate-spin" /> Cargando publicaciones…
        </div>
      )}
      {state.err && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{state.err}</div>
      )}

      {!state.loading && grupos.length === 0 && (
        <div className="rounded-2xl bg-white border p-8 text-center" style={{ borderColor: BORDER }}>
          <p className="text-sm text-stone-500">
            No hay propuestas abiertas ni episodios sin registrar. Todo al día.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {grupos.map(g => (
          <EpisodioBloque
            key={g.episode_id || g.episode_label}
            grupo={g}
            onChanged={load}
          />
        ))}
      </div>

      {openOriginal && (
        <ContenidoOriginalModal
          onClose={() => setOpenOriginal(false)}
          onCreated={() => { setOpenOriginal(false); load(); }}
        />
      )}
    </div>
  );
}

// ═══ Bloque por episodio ═══════════════════════════════════════════════════

function EpisodioBloque({ grupo, onChanged }) {
  const alAireSomething = grupo.alAireYT || grupo.alAireSP;
  return (
    <div className="rounded-2xl bg-white border" style={{ borderColor: BORDER }}>
      <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-stone-400">Episodio</p>
          <p className="text-[15px] font-semibold text-stone-800 truncate">{grupo.episode_label}</p>
        </div>
        <p className="text-xs text-stone-500 shrink-0">
          {grupo.propuestas.length} propuesta{grupo.propuestas.length === 1 ? '' : 's'}
        </p>
      </div>

      {alAireSomething && (
        <EpisodioAlAire
          episode_id={grupo.episode_id}
          label={grupo.episode_label}
          missingYouTube={grupo.alAireYT}
          missingSpotify={grupo.alAireSP}
          onChanged={onChanged}
        />
      )}

      {grupo.propuestas.length > 0 && (
        <div className="divide-y" style={{ borderColor: BORDER }}>
          {grupo.propuestas.map(p => (
            <PropuestaFila key={p.id} propuesta={p} onChanged={onChanged} />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══ Módulo F — episodio al aire ═══════════════════════════════════════════

function EpisodioAlAire({ episode_id, label, missingYouTube, missingSpotify, onChanged }) {
  const [expanded, setExpanded] = useState(false);
  const [ytUrl, setYtUrl] = useState('');
  const [spUrl, setSpUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async () => {
    const links = [];
    if (missingYouTube && ytUrl.trim()) links.push({ platform: 'youtube', url: ytUrl.trim() });
    if (missingSpotify && spUrl.trim()) links.push({ platform: 'spotify', url: spUrl.trim() });
    if (links.length === 0) return;
    setSaving(true); setErr(null);
    try {
      const r = await api('/api/publicaciones/publicar', {
        method: 'POST',
        body: JSON.stringify({
          episode_id,
          content_type_override: 'episodio',
          title_override: label,
          links,
        }),
      });
      if (r?.error) throw new Error(r.error);
      onChanged?.();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="px-5 py-3 border-b flex flex-col gap-2" style={{ background: OL, borderColor: BORDER }}>
      <button onClick={() => setExpanded(v => !v)} className="w-full flex items-center gap-2 text-left">
        {expanded ? <ChevronDown size={14} color={O} /> : <ChevronRight size={14} color={O} />}
        <p className="text-[13px] font-medium" style={{ color: O }}>
          ¿este episodio ya salió? {missingYouTube ? 'pega YouTube' : ''}{missingYouTube && missingSpotify ? ' / ' : ''}{missingSpotify ? 'Spotify' : ''}
        </p>
      </button>
      {expanded && (
        <div className="grid gap-2 pt-1">
          {missingYouTube && (
            <input
              value={ytUrl}
              onChange={e => setYtUrl(e.target.value)}
              placeholder="https://youtu.be/… o https://www.youtube.com/watch?v=…"
              className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-orange-300"
              style={{ borderColor: OB, background: 'white' }}
            />
          )}
          {missingSpotify && (
            <input
              value={spUrl}
              onChange={e => setSpUrl(e.target.value)}
              placeholder="https://open.spotify.com/episode/…"
              className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-orange-300"
              style={{ borderColor: OB, background: 'white' }}
            />
          )}
          {err && <div className="text-xs text-red-600">{err}</div>}
          <div className="flex justify-end">
            <button
              onClick={submit}
              disabled={saving || (!ytUrl.trim() && !spUrl.trim())}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
              style={{ background: O }}
            >
              {saving ? <><Loader2 size={12} className="animate-spin" /> Guardando…</> : <><Check size={12} /> Registrar</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══ Fila de propuesta ═════════════════════════════════════════════════════

function PropuestaFila({ propuesta: p, onChanged }) {
  const [mode, setMode] = useState(null); // null | 'publish' | 'discard'
  const [links, setLinks] = useState([{ platform: 'instagram', url: '' }]);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const submitPublish = async () => {
    const clean = links.map(l => ({ platform: (l.platform || '').toLowerCase(), url: (l.url || '').trim() })).filter(l => l.platform && l.url);
    if (clean.length === 0) { setErr('Pega al menos un link'); return; }
    setSaving(true); setErr(null);
    try {
      const r = await api('/api/publicaciones/publicar', {
        method: 'POST',
        body: JSON.stringify({ proposal_id: p.id, links: clean }),
      });
      if (r?.error) throw new Error(r.error);
      onChanged?.();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };
  const submitDiscard = async () => {
    setSaving(true); setErr(null);
    try {
      const r = await api('/api/publicaciones/descartar', {
        method: 'POST',
        body: JSON.stringify({ proposal_id: p.id, discard_reason: reason.trim() || null }),
      });
      if (r?.error) throw new Error(r.error);
      onChanged?.();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="px-5 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 w-2 h-2 rounded-full shrink-0" style={{ background: O }} />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] text-stone-800 leading-snug">{p.title}</p>
          <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5 flex-wrap">
            <span>{CONTENT_TYPE_LABEL[p.content_type] || p.content_type}</span>
            {p.angle_type && <><span>·</span><span>{ANGLE_TYPE_LABEL[p.angle_type] || p.angle_type}</span></>}
            <span>·</span>
            <span className="text-stone-400">propuesta</span>
          </div>
        </div>
        {mode === null && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setMode('publish')}
              className="text-xs font-medium px-2.5 py-1 rounded-lg border hover:bg-orange-50"
              style={{ borderColor: OB, color: O }}
            >
              publicada ↗
            </button>
            <button
              onClick={() => setMode('discard')}
              className="text-xs font-medium px-2.5 py-1 rounded-lg text-stone-500 hover:bg-stone-100 flex items-center gap-1"
            >
              <Ban size={11} /> descartar
            </button>
          </div>
        )}
      </div>

      {mode === 'publish' && (
        <div className="mt-2 ml-5 space-y-2">
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
                        className="p-1 rounded hover:bg-stone-100" title="Quitar">
                  <X size={12} color={MU} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => setLinks(prev => [...prev, { platform: 'tiktok', url: '' }])}
            className="text-[11px] text-stone-500 hover:text-orange-600 flex items-center gap-1"
          >
            <Plus size={10} /> otra plataforma (hermanas del mismo video)
          </button>
          {err && <div className="text-xs text-red-600">{err}</div>}
          <div className="flex items-center gap-1.5 justify-end">
            <button onClick={() => setMode(null)} className="text-xs text-stone-500 px-2 py-1 hover:bg-stone-100 rounded">
              cancelar
            </button>
            <button
              onClick={submitPublish}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white hover:opacity-90 flex items-center gap-1.5"
              style={{ background: saving ? '#D6D3D1' : O }}
            >
              {saving ? <><Loader2 size={11} className="animate-spin" /> Guardando…</> : <><Check size={11} /> Marcar publicada</>}
            </button>
          </div>
        </div>
      )}

      {mode === 'discard' && (
        <div className="mt-2 ml-5 space-y-2">
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={2}
            placeholder="Razón opcional — se guarda como learning."
            className="w-full text-xs border rounded-lg px-3 py-2 focus:outline-none focus:border-orange-300 resize-y"
            style={{ borderColor: BORDER }}
          />
          {err && <div className="text-xs text-red-600">{err}</div>}
          <div className="flex items-center gap-1.5 justify-end">
            <button onClick={() => setMode(null)} className="text-xs text-stone-500 px-2 py-1 hover:bg-stone-100 rounded">
              cancelar
            </button>
            <button
              onClick={submitDiscard}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-stone-100 text-stone-700 border flex items-center gap-1.5"
              style={{ borderColor: BORDER }}
            >
              {saving ? <><Loader2 size={11} className="animate-spin" /> Guardando…</> : <><Ban size={11} /> Confirmar descarte</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
