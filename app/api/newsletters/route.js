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
