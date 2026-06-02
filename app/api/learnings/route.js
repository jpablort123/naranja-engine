import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// GET - fetch draft learnings for an episode
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const episode_id = searchParams.get('episode_id');
  const q = db.from('learnings').select('*').order('created_at', { ascending: true });
  if (episode_id) q.eq('episode_id', episode_id);
  else q.eq('status', 'draft');
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST - save a draft learning (episode_id O newsletter_id; nunca ambos)
export async function POST(req) {
  const body = await req.json();
  const { data, error } = await db.from('learnings').insert({
    episode_id: body.episode_id || null,
    newsletter_id: body.newsletter_id || null,
    section: body.section,
    original_content: body.original_content,
    feedback: body.feedback,
    proposed_change: body.proposed_change || null,
    target_protocol_name: body.target_protocol_name || body.section,
    status: 'draft',
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PUT - update learning status (approve/reject/circumstantial)
export async function PUT(req) {
  const { id, status } = await req.json();
  const { data, error } = await db.from('learnings').update({ status }).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
