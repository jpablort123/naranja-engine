import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { completeJob } from '@/lib/descript-queue';
import { interpretJob } from '@/lib/descript';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// ═══ POST /api/descript/jobs/webhook ═══
// Callback de Descript cuando un /jobs/agent termina.
// Descript no documenta un secret por webhook, así que aceptamos el body y
// validamos que el descript_job_id exista en nuestra tabla antes de actualizar.
//
// Después de marcar el job actual, disparamos el próximo queued del mismo project.
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));

    // El webhook comparte formato con GET /jobs/{id}. Interpretamos con el mismo
    // helper que el poll de respaldo (job_state 'stopped' + result.status, etc.).
    const jobId = body?.job_id || body?.id || body?.data?.job_id || body?.data?.id;
    const { outcome, compositionId, credits, errorMessage: errorMsg } = interpretJob(body);

    if (!jobId) {
      return NextResponse.json({ ok: false, error: 'sin job_id' }, { status: 400 });
    }

    // Encontrar la fila por descript_job_id
    const { data: row } = await db
      .from('descript_jobs')
      .select('*')
      .eq('descript_job_id', jobId)
      .single();
    if (!row) {
      return NextResponse.json({ ok: false, error: 'job desconocido' }, { status: 404 });
    }

    const isDone = outcome === 'done';
    const isErr = outcome === 'error';

    if (!isDone && !isErr) {
      // Estado intermedio (queued/running en Descript) — solo tocar updated_at.
      await db
        .from('descript_jobs')
        .update({ updated_at: new Date().toISOString(), descript_response: body })
        .eq('id', row.id);
      return NextResponse.json({ ok: true, note: 'intermediate' });
    }

    await completeJob(row.id, {
      status: isDone ? 'done' : 'error',
      descript_composition_id: compositionId,
      ai_credits_used: typeof credits === 'number' ? credits : null,
      error_message: isErr ? (errorMsg || 'Descript job failed') : null,
      descript_response: body,
    });

    // Disparar el próximo — fire-and-forget para no bloquear el ACK del webhook.
    try {
      const { processNext } = await import('@/lib/descript-queue');
      processNext(row.descript_project_id).catch(err =>
        console.error('post-webhook processNext:', err?.message || err)
      );
    } catch (e) {
      console.error('cannot chain next job:', e?.message || e);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('webhook error:', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// Descript podría hacer HEAD/GET de verificación — respondemos 200.
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'descript-webhook' });
}
