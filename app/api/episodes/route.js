import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { CURRENT_PRODUCT_ID, withProduct, withProductPayload } from '@/lib/product';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const dynamic = 'force-dynamic';

export async function GET() {
  // Filtra por producto (spec universo §7). Compat: filas viejas backfilleadas
  // vía la migración de sprint-universo.sql.
  const q = withProduct(db.from('episodes').select('*').order('created_at', { ascending: false }));
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req) {
  const { name, transcript } = await req.json();
  const { data, error } = await db
    .from('episodes')
    .insert(withProductPayload({ name, transcript, status: 'draft' }))
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(req) {
  const body = await req.json();
  const { id, ...updates } = body;
  const { data, error } = await db.from('episodes').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  // Borrar registros relacionados antes que el episodio (learnings tiene FK real;
  // parrilla_items e ideas son FK lógicas — limpieza para evitar huérfanos).
  const learnDel = await db.from('learnings').delete().eq('episode_id', id);
  if (learnDel.error) return NextResponse.json({ error: `learnings: ${learnDel.error.message}` }, { status: 500 });

  const parrDel = await db.from('parrilla_items').delete().eq('origin_type', 'episode').eq('origin_id', id);
  if (parrDel.error) return NextResponse.json({ error: `parrilla_items: ${parrDel.error.message}` }, { status: 500 });

  const ideasDel = await db.from('ideas').delete().eq('origin_type', 'episode').eq('origin_id', id);
  if (ideasDel.error) return NextResponse.json({ error: `ideas: ${ideasDel.error.message}` }, { status: 500 });

  const { error } = await db.from('episodes').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
