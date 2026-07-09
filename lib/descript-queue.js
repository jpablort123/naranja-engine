import { createClient } from '@supabase/supabase-js';
import { createAgentJob, getJob, buildCutPrompt } from './descript';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// ═══ COLA DE CORTES DE DESCRIPT ═══
// Regla dura (SPEC §3.5, §9): un job por proyecto de Descript a la vez. La cola
// vive en la tabla `descript_jobs` y se procesa secuencialmente por project_id.
// Todo persiste en Supabase → JP puede cerrar el navegador y volver.

// URL pública del servidor (para el webhook de Descript). En Vercel viene del env.
function siteURL() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` ||
    process.env.SITE_URL ||
    ''
  );
}

// Trae los jobs "activos" (running) para un project_id. Descript sólo permite uno.
async function runningForProject(project_id) {
  const { data } = await db
    .from('descript_jobs')
    .select('id, descript_job_id, updated_at')
    .eq('descript_project_id', project_id)
    .eq('status', 'running');
  return data || [];
}

// Trae el próximo queued para un project_id (FIFO por created_at).
async function nextQueued(project_id) {
  const { data } = await db
    .from('descript_jobs')
    .select('*')
    .eq('descript_project_id', project_id)
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1);
  return data?.[0] || null;
}

// ── Inserta una tanda de jobs en estado queued. `items` es array de:
//   { episode_id, project_id, clip_type, clip_ref, composition_name, prompt, meta }
// Devuelve los rows insertados.
export async function enqueueJobs(items) {
  if (!items || items.length === 0) return [];
  const now = new Date().toISOString();
  const rows = items.map(it => ({
    episode_id: it.episode_id,
    descript_project_id: it.project_id,
    clip_type: it.clip_type,
    clip_ref: it.clip_ref || null,
    composition_name: it.composition_name,
    prompt: it.prompt,
    status: 'queued',
    meta: it.meta || null,
    created_at: now,
    updated_at: now,
  }));
  const { data, error } = await db.from('descript_jobs').insert(rows).select();
  if (error) throw new Error(`descript_jobs insert: ${error.message}`);
  return data || [];
}

// ── Procesa el siguiente queued para un project_id. Idempotente:
//   - si ya hay uno running, no hace nada
//   - si no hay queued, no hace nada
//   - si el disparo a Descript falla por "job already running", vuelve a queued
// Devuelve { started: <row> | null, skipped: <reason> | null }.
export async function processNext(project_id) {
  if (!project_id) return { started: null, skipped: 'no_project_id' };

  const running = await runningForProject(project_id);
  if (running.length > 0) {
    return { started: null, skipped: 'already_running' };
  }

  const row = await nextQueued(project_id);
  if (!row) return { started: null, skipped: 'no_queued' };

  // Marcar running ANTES de disparar (evita doble disparo si el processor
  // se corre en paralelo). Si hay carrera, quien pierde vuelve a queued.
  const nowStart = new Date().toISOString();
  const { data: claimed, error: claimErr } = await db
    .from('descript_jobs')
    .update({ status: 'running', updated_at: nowStart, started_at: nowStart })
    .eq('id', row.id)
    .eq('status', 'queued')
    .select()
    .single();
  if (claimErr || !claimed) {
    return { started: null, skipped: 'claim_lost' };
  }

  try {
    const callback = siteURL() ? `${siteURL()}/api/descript/jobs/webhook` : undefined;
    const resp = await createAgentJob({
      project_id,
      prompt: row.prompt,
      callback_url: callback,
    });
    const descript_job_id = resp?.job_id || resp?.id || resp?.data?.job_id || null;

    await db
      .from('descript_jobs')
      .update({
        descript_job_id,
        updated_at: new Date().toISOString(),
        descript_response: resp || null,
      })
      .eq('id', claimed.id);

    return { started: { ...claimed, descript_job_id }, skipped: null };
  } catch (e) {
    // Si Descript rechaza porque ya hay un job corriendo en el proyecto,
    // esto no es un error del clip: es carrera. Vuelve a queued para reintento.
    const msg = (e?.message || '').toLowerCase();
    const conflictJob = msg.includes('already running') || e?.status === 409;
    if (conflictJob) {
      await db
        .from('descript_jobs')
        .update({
          status: 'queued',
          started_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', claimed.id);
      return { started: null, skipped: 'descript_busy' };
    }
    await db
      .from('descript_jobs')
      .update({
        status: 'error',
        error_message: e?.message || String(e),
        updated_at: new Date().toISOString(),
      })
      .eq('id', claimed.id);
    return { started: null, skipped: 'error', error: e?.message || String(e) };
  }
}

// ── Marca un job como done / error y desencadena el siguiente.
// data: { status: 'done'|'error', descript_composition_id?, ai_credits_used?, error_message? }
export async function completeJob(job_id, data) {
  const patch = {
    status: data.status || 'done',
    updated_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  };
  if (data.descript_composition_id) patch.descript_composition_id = data.descript_composition_id;
  if (typeof data.ai_credits_used === 'number') patch.ai_credits_used = data.ai_credits_used;
  if (data.error_message) patch.error_message = data.error_message;
  if (data.descript_response) patch.descript_response = data.descript_response;

  const { data: row, error } = await db
    .from('descript_jobs')
    .update(patch)
    .eq('id', job_id)
    .select()
    .single();
  if (error) throw new Error(`descript_jobs update: ${error.message}`);
  return row;
}

// ── Reintento manual (fila que quedó en error): la vuelve a queued.
export async function retryJob(job_id) {
  const { data, error } = await db
    .from('descript_jobs')
    .update({
      status: 'queued',
      error_message: null,
      descript_job_id: null,
      started_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', job_id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ── Poll de respaldo: si un job lleva demasiado tiempo running sin webhook,
// consultar el estado a Descript directamente. Devuelve el status observado.
export async function pollRunningJob(row) {
  if (!row?.descript_job_id) return null;
  try {
    const j = await getJob(row.descript_job_id);
    const state = (j?.status || j?.state || '').toLowerCase();
    if (state === 'succeeded' || state === 'done' || state === 'completed') {
      const compId = j?.result?.composition_id || j?.composition_id || null;
      const credits = j?.ai_credits_used ?? j?.credits ?? null;
      await completeJob(row.id, {
        status: 'done',
        descript_composition_id: compId,
        ai_credits_used: credits,
        descript_response: j,
      });
      return 'done';
    }
    if (state === 'failed' || state === 'error' || state === 'cancelled') {
      await completeJob(row.id, {
        status: 'error',
        error_message: j?.error?.message || j?.message || 'Descript job failed',
        descript_response: j,
      });
      return 'error';
    }
    return state || 'running';
  } catch (e) {
    return null;
  }
}

export { buildCutPrompt };
