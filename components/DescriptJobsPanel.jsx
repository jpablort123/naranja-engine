"use client";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, Clock, RefreshCw, ExternalLink } from "lucide-react";
import { O, OL, OB, GR, GL, MU, api } from "@/components/ui";

// ═══ Panel de estado de la cola de Descript para un episodio ═══
// Lee /api/descript/jobs?episode_id=... y refresca cada 4s mientras haya jobs
// queued/running. La cola vive server-side, así que este panel es sólo lectura
// (fuente de verdad: descript_jobs en Supabase).
export default function DescriptJobsPanel({ episodeId, projectId, filterClipType, onDone }) {
  const [state, setState] = useState({ jobs: [], summary: null, loading: true });

  const load = async () => {
    const r = await api(`/api/descript/jobs?episode_id=${episodeId}`);
    if (r?.jobs) setState({ jobs: r.jobs, summary: r.summary, loading: false });
    else setState(s => ({ ...s, loading: false }));
  };

  useEffect(() => {
    if (!episodeId) return;
    let alive = true;
    load();
    const tick = async () => {
      if (!alive) return;
      await load();
      const active = (state.summary?.queued || 0) + (state.summary?.running || 0);
      // Además de refrescar, empujar la cola (por si el webhook se perdió).
      if (projectId && active > 0) {
        api(`/api/descript/jobs/process`, {
          method: "POST",
          body: JSON.stringify({ project_id: projectId }),
        }).catch(() => {});
      }
    };
    const iv = setInterval(tick, 4000);
    return () => { alive = false; clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodeId, projectId]);

  useEffect(() => {
    if (!state.summary) return;
    const active = (state.summary.queued || 0) + (state.summary.running || 0);
    if (active === 0 && (state.summary.done || 0) > 0) onDone?.();
  }, [state.summary, onDone]);

  const shown = filterClipType
    ? state.jobs.filter(j => j.clip_type === filterClipType)
    : state.jobs;

  if (!episodeId) return null;
  if (state.loading) return <div className="text-xs text-stone-400 italic">Cargando cola...</div>;
  if (shown.length === 0) return null;

  const s = { queued: 0, running: 0, done: 0, error: 0 };
  shown.forEach(j => { s[j.status] = (s[j.status] || 0) + 1; });

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-[13px] text-stone-800">🎞️ Cola de Descript</span>
          {s.running > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: OL, color: O }}>
              <Loader2 size={10} className="animate-spin" /> {s.running} cortando
            </span>
          )}
          {s.queued > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 bg-stone-100 text-stone-600">
              <Clock size={10} /> {s.queued} en cola
            </span>
          )}
          {s.done > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: GL, color: GR }}>
              <CheckCircle2 size={10} /> {s.done} listo{s.done === 1 ? "" : "s"}
            </span>
          )}
          {s.error > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 bg-red-50 text-red-600">
              <AlertCircle size={10} /> {s.error} con error
            </span>
          )}
        </div>
        <button onClick={load} className="text-[11px] text-stone-400 hover:text-orange-600 flex items-center gap-1">
          <RefreshCw size={10} /> refrescar
        </button>
      </div>

      <div className="space-y-1.5">
        {shown.map(j => <JobRow key={j.id} job={j} projectId={projectId} onChange={load} />)}
      </div>
    </div>
  );
}

function JobRow({ job, projectId, onChange }) {
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    setRetrying(true);
    await api("/api/descript/jobs/retry", {
      method: "POST",
      body: JSON.stringify({ job_id: job.id }),
    });
    await onChange?.();
    setRetrying(false);
  };

  const statusEl = {
    queued: <span className="flex items-center gap-1 text-[11px] text-stone-500"><Clock size={11} /> en cola</span>,
    running: <span className="flex items-center gap-1 text-[11px]" style={{ color: O }}><Loader2 size={11} className="animate-spin" /> cortando</span>,
    done: <span className="flex items-center gap-1 text-[11px]" style={{ color: GR }}><CheckCircle2 size={11} /> listo</span>,
    error: <span className="flex items-center gap-1 text-[11px] text-red-600"><AlertCircle size={11} /> error</span>,
  }[job.status] || null;

  const linkComposicion = projectId && job.descript_composition_id
    ? `https://web.descript.com/${projectId}/${job.descript_composition_id}`
    : projectId
      ? `https://web.descript.com/${projectId}`
      : null;

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg border border-stone-100 bg-stone-50/50">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-stone-700 truncate">{job.composition_name}</p>
        {job.error_message && (
          <p className="text-[11px] text-red-500 truncate mt-0.5">{job.error_message}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {statusEl}
        {typeof job.ai_credits_used === "number" && job.status === "done" && (
          <span className="text-[10px] text-stone-400">{job.ai_credits_used} cr</span>
        )}
        {job.status === "done" && linkComposicion && (
          <a href={linkComposicion} target="_blank" rel="noreferrer"
             className="text-[11px] text-orange-600 hover:underline flex items-center gap-0.5">
            abrir <ExternalLink size={10} />
          </a>
        )}
        {job.status === "error" && (
          <button onClick={retry} disabled={retrying}
                  className="text-[11px] text-orange-600 hover:underline flex items-center gap-0.5">
            {retrying ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
            reintentar
          </button>
        )}
      </div>
    </div>
  );
}
