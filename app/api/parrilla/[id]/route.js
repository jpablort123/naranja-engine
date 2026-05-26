import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function deriveStatus({ scheduled_date, checklist, currentStatus }) {
  // 'discarded' es siempre explícito; no se deriva
  if (currentStatus === 'discarded') return 'discarded';

  // Si todos los checks están en true → 'complete'
  if (checklist && typeof checklist === 'object') {
    const keys = Object.keys(checklist);
    if (keys.length > 0 && keys.every(k => checklist[k] === true)) {
      return 'complete';
    }
  }

  // Si tiene fecha → 'scheduled', si no → 'inbox'
  if (scheduled_date) return 'scheduled';
  return 'inbox';
}

// PATCH — actualizar item
//   Body: { scheduled_date?, checklist?, status?, position?, title?, content? }
export async function PATCH(req, { params }) {
  const { id } = params;
  const body = await req.json();

  // Cargar estado actual para derivar status correctamente
  const { data: current, error: fetchErr } = await db
    .from('parrilla_items').select('*').eq('id', id).single();
  if (fetchErr || !current) {
    return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 });
  }

  const updates = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) updates.title = body.title;
  if (body.content !== undefined) updates.content = body.content;
  if (body.position !== undefined) updates.position = body.position;
  if (body.scheduled_date !== undefined) updates.scheduled_date = body.scheduled_date;
  if (body.checklist !== undefined) updates.checklist = body.checklist;

  // Status: si el cliente lo envía explícito (ej: 'discarded'), respetarlo.
  // Si no, derivar del nuevo estado de scheduled_date + checklist.
  if (body.status !== undefined) {
    updates.status = body.status;
  } else {
    const nextScheduled = body.scheduled_date !== undefined ? body.scheduled_date : current.scheduled_date;
    const nextChecklist = body.checklist !== undefined ? body.checklist : current.checklist;
    updates.status = deriveStatus({
      scheduled_date: nextScheduled,
      checklist: nextChecklist,
      currentStatus: current.status,
    });
  }

  const { data, error } = await db
    .from('parrilla_items').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE — eliminar permanentemente (solo items manuales)
export async function DELETE(req, { params }) {
  const { id } = params;
  const { data: current } = await db
    .from('parrilla_items').select('origin_type').eq('id', id).single();
  if (!current) return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 });
  if (current.origin_type !== 'manual') {
    return NextResponse.json(
      { error: 'Solo items manuales pueden eliminarse. Usá status=discarded para descartar.' },
      { status: 400 }
    );
  }
  const { error } = await db.from('parrilla_items').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
