import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// GET /api/newsletters         → lista
// GET /api/newsletters?id=...  → individual
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (id) {
    const { data, error } = await db.from('newsletters').select('*').eq('id', id).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }
  const { data, error } = await db.from('newsletters').select('*').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/newsletters  body: { name, articulo }
export async function POST(req) {
  const { name, articulo } = await req.json();
  if (!name?.trim() || !articulo?.trim()) {
    return NextResponse.json({ error: 'name y articulo son requeridos' }, { status: 400 });
  }
  const { data, error } = await db.from('newsletters')
    .insert({ name: name.trim(), articulo, status: 'draft' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PUT /api/newsletters  body: { id, ...updates }
export async function PUT(req) {
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  updates.updated_at = new Date().toISOString();
  const { data, error } = await db.from('newsletters').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/newsletters?id=...
export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  // Borrar registros relacionados antes que el newsletter (learnings tiene FK real;
  // parrilla_items e ideas son FK lógicas — limpieza para evitar huérfanos).
  const learnDel = await db.from('learnings').delete().eq('newsletter_id', id);
  if (learnDel.error) return NextResponse.json({ error: `learnings: ${learnDel.error.message}` }, { status: 500 });

  const parrDel = await db.from('parrilla_items').delete().eq('origin_type', 'newsletter').eq('origin_id', id);
  if (parrDel.error) return NextResponse.json({ error: `parrilla_items: ${parrDel.error.message}` }, { status: 500 });

  const ideasDel = await db.from('ideas').delete().eq('origin_type', 'newsletter').eq('origin_id', id);
  if (ideasDel.error) return NextResponse.json({ error: `ideas: ${ideasDel.error.message}` }, { status: 500 });

  const { error } = await db.from('newsletters').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
