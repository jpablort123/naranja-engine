import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// GET - list ideas (optionally filtered by category)
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  let q = db.from('ideas').select('*').order('position', { ascending: true }).order('created_at', { ascending: false });
  if (category) q = q.eq('category', category);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST - create a new idea
export async function POST(req) {
  const body = await req.json();
  const { data, error } = await db.from('ideas').insert({
    title: body.title || 'Nueva idea',
    description: body.description || null,
    notes: body.notes || null,
    category: body.category || 'undecided',
    temperature: body.temperature || 'cold',
    formats: body.formats || null,
    angle: body.angle || null,
    origin_url: body.origin_url || null,
    origin_type: body.origin_type || null,
    origin_id: body.origin_id || null,
    status: body.status || 'draft',
    generated_content: body.generated_content || null,
    prompt_notes: body.prompt_notes || null,
    parent_id: body.parent_id || null,
    position: body.position ?? 0,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PUT - update an idea
export async function PUT(req) {
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { data, error } = await db.from('ideas').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE - remove an idea
export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { error } = await db.from('ideas').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
