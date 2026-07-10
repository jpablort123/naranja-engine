"use client";
import { useEffect, useState } from "react";
import { Loader2, Plus, Youtube, Instagram, Linkedin, Music, Play, ExternalLink } from "lucide-react";
import { api } from "@/components/ui";
import {
  O, OL, OB, GR, GL, MU, BORDER, DARK, AMBER, GRAY_STRENGTH,
  CONTENT_TYPE_LABEL, PLATFORM_LABEL,
} from "@/components/estrategia/theme";
import RegistrarPublicacionModal from "@/components/estrategia/RegistrarPublicacionModal";

// spec §9 — pestaña Linaje dentro del workspace del episodio.
// Layout: madre a la izquierda (card oscuro #18181B) + tronco vertical +
// filas de piezas a la derecha con stub coloreado por strength.
// Abajo: franja "Resultado del universo".
export default function LineageTab({ episode }) {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [openModal, setOpenModal] = useState(false);

  const load = async () => {
    if (!episode?.id) return;
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`/api/episodes/${episode.id}/linaje`, { cache: 'no-store' });
      const j = await r.json();
      if (j?.error) throw new Error(j.error);
      setTree(j);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [episode?.id]);

  if (loading) return <div className="flex items-center gap-2 text-sm text-stone-400 py-6"><Loader2 size={14} className="animate-spin" /> Cargando linaje…</div>;
  if (err) return <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">{err}</div>;
  if (!tree) return null;

  const piezas = tree.piezas || [];
  const madreYT = tree.madre?.metrics?.youtube;
  const madreSP = tree.madre?.metrics?.spotify;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-stone-800">Linaje</h2>
          <p className="text-xs text-stone-500 mt-0.5">madre · piezas · resultado</p>
        </div>
        <button
          onClick={() => setOpenModal(true)}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 flex items-center gap-2"
          style={{ background: O }}
        >
          <Plus size={14} /> agregar pieza a este episodio
        </button>
      </div>

      {/* Árbol */}
      <div className="rounded-2xl bg-white border p-5" style={{ borderColor: BORDER }}>
        <div className="grid gap-6" style={{ gridTemplateColumns: 'minmax(220px, 260px) 1fr' }}>
          {/* Madre — card oscuro */}
          <div className="rounded-xl p-4" style={{ background: DARK, color: '#FAFAF9' }}>
            <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-1">Madre · episodio</p>
            <p className="text-[15px] font-semibold leading-snug">{tree.madre?.label || episode?.name}</p>
            <div className="mt-4 space-y-2 text-[12px] text-stone-300">
              {madreYT ? (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Youtube size={12} /> YouTube</span>
                  <span>{fmt(madreYT.reach)} · {madreYT.engagement_rate ? madreYT.engagement_rate.toFixed(1) + '%' : '—'}</span>
                </div>
              ) : null}
              {madreSP ? (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Music size={12} /> Spotify</span>
                  <span>{fmt(madreSP.reach)}</span>
                </div>
              ) : null}
              {!madreYT && !madreSP && (
                <p className="text-[11px] text-stone-400 italic">Sin métricas propias aún. Registra el episodio como pieza (tipo <em>episodio</em>) para verlas.</p>
              )}
            </div>
          </div>

          {/* Piezas con tronco */}
          <div className="relative pl-8">
            {/* Tronco vertical */}
            {piezas.length > 0 && (
              <div className="absolute top-4 bottom-4 left-2 w-px" style={{ background: BORDER }} />
            )}
            {piezas.length === 0 ? (
              <div className="text-sm text-stone-400 italic py-4">
                Aún no hay piezas registradas para este episodio. Registra la primera con “+ agregar pieza a este episodio”.
              </div>
            ) : (
              <div className="space-y-3">
                {piezas.map((p, i) => (
                  <PiezaRow key={p.id || i} p={p} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Leyenda */}
        {piezas.length > 0 && (
          <div className="mt-6 pt-4 border-t flex items-center gap-4 flex-wrap text-[11px] text-stone-500" style={{ borderColor: BORDER }}>
            <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-[3px] rounded" style={{ background: GR }} /> fuerte · trajo suscriptores</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-[2px] rounded" style={{ background: AMBER }} /> medio · alcance alto</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-[1px] rounded" style={{ background: GRAY_STRENGTH }} /> débil</span>
          </div>
        )}
      </div>

      {/* Resultado del universo */}
      <div className="rounded-2xl p-5 border" style={{ background: OL, borderColor: OB }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-stone-500">Resultado del universo</p>
            <p className="text-lg font-semibold text-stone-800 mt-1">
              {fmt(tree.resultado?.alcance_total || 0)} de alcance total · {tree.resultado?.subs_total || 0} suscriptor{(tree.resultado?.subs_total || 0) === 1 ? '' : 'es'}
            </p>
          </div>
          <p className="text-xs text-stone-500 max-w-sm">
            Suma de todas las piezas que colgaron de este episodio (últimas métricas capturadas).
          </p>
        </div>
      </div>

      {/* Tabla de detalle (opcional, si hay piezas) */}
      {piezas.length > 0 && (
        <div className="rounded-2xl bg-white border overflow-hidden" style={{ borderColor: BORDER }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: BORDER }}>
            <p className="text-[13px] font-medium text-stone-700">Detalle</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-widest text-stone-400">
                  <th className="px-5 py-2">Título</th>
                  <th className="px-3 py-2">Formato</th>
                  <th className="px-3 py-2">Plataforma</th>
                  <th className="px-3 py-2 text-right">Alcance</th>
                  <th className="px-3 py-2 text-right">Eng.</th>
                  <th className="px-3 py-2 text-right">Subs</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: BORDER }}>
                {piezas.map(p => (
                  <tr key={p.id} className="text-stone-700">
                    <td className="px-5 py-2 max-w-[280px] truncate">{p.title}</td>
                    <td className="px-3 py-2 text-stone-500">{CONTENT_TYPE_LABEL[p.content_type] || p.content_type}</td>
                    <td className="px-3 py-2 text-stone-500">{PLATFORM_LABEL[p.platform] || p.platform}</td>
                    <td className="px-3 py-2 text-right">{fmt(p.reach)}</td>
                    <td className="px-3 py-2 text-right">{typeof p.engagement_rate === 'number' ? p.engagement_rate.toFixed(1) + '%' : '—'}</td>
                    <td className="px-3 py-2 text-right">{p.subs_atribuidos || 0}</td>
                    <td className="px-3 py-2 text-right">
                      {p.published_url ? (
                        <a href={p.published_url} target="_blank" rel="noreferrer" className="text-orange-600 hover:underline inline-flex items-center gap-0.5 text-[11px]">
                          abrir <ExternalLink size={10} />
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <RegistrarPublicacionModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onCreated={() => { setOpenModal(false); load(); }}
        defaultMadre={{ origin_type: 'episode', origin_id: episode?.id, origin_label: episode?.name }}
      />
    </div>
  );
}

function PiezaRow({ p }) {
  const { color, height } = strengthStyle(p.strength);
  return (
    <div className="relative">
      {/* Stub horizontal desde el tronco */}
      <span className="absolute rounded" style={{
        left: -24, top: '50%', transform: 'translateY(-50%)',
        width: 24, height: height, background: color,
      }} />
      <div className="flex items-center gap-3 p-3 rounded-xl border bg-white" style={{ borderColor: BORDER }}>
        <PlatformIcon platform={p.platform} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-800 truncate">{p.title}</p>
          <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5 flex-wrap">
            <span>{CONTENT_TYPE_LABEL[p.content_type] || p.content_type}</span>
            <span>·</span>
            <span>{fmt(p.reach)} de alcance</span>
            {typeof p.engagement_rate === 'number' && (<><span>·</span><span>{p.engagement_rate.toFixed(1)}% eng.</span></>)}
          </div>
        </div>
        {p.subs_atribuidos > 0 && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{ background: GL, color: GR }}>
            +{p.subs_atribuidos} sub{p.subs_atribuidos === 1 ? '' : 's'}
          </span>
        )}
      </div>
    </div>
  );
}

function strengthStyle(s) {
  if (s === 'fuerte') return { color: GR, height: 3 };
  if (s === 'medio') return { color: AMBER, height: 2 };
  return { color: GRAY_STRENGTH, height: 1 };
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
