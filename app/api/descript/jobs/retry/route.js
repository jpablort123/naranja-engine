import { NextResponse } from 'next/server';
import { retryJob } from '@/lib/descript-queue';
import { processNext } from '@/lib/descript-queue';

// POST /api/descript/jobs/retry — body: { job_id }
// Vuelve el job a queued y dispara el procesador.
export async function POST(req) {
  try {
    const { job_id } = await req.json();
    if (!job_id) return NextResponse.json({ error: 'job_id requerido' }, { status: 400 });
    const row = await retryJob(job_id);
    if (row?.descript_project_id) {
      processNext(row.descript_project_id).catch(err =>
        console.error('post-retry processNext:', err?.message || err)
      );
    }
    return NextResponse.json({ ok: true, job: row });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
