import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const DEFAULT_CHECKLISTS = {
  episodio:   { "Editado": false, "Títulos y descripciones": false, "Thumbnails": false },
  linkedin:   { "Aprobado": false },
  reel:       { "Libreto aprobado": false, "Grabado": false, "Editado": false },
  tiktok:     { "Libreto aprobado": false, "Grabado": false, "Editado": false },
  newsletter: { "Aprobado": false, "Imagen portada": false },
  carrousel:  { "Copy": false, "Diseñado": false },
};

function initialChecklist(content_type, existing) {
  if (existing && typeof existing === 'object' && Object.keys(existing).length > 0) return existing;
  return DEFAULT_CHECKLISTS[content_type] || {};
}

function addDaysISO(iso, days) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// GET — listar items
//   ?status=inbox|scheduled|complete|discarded|all
//   ?week_start=YYYY-MM-DD  (filtra scheduled_date dentro de [week_start, week_start+7))
//   ?content_type=...
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'all';
  const week_start = searchParams.get('week_start');
  const content_type = searchParams.get('content_type');

  let q = db.from('parrilla_items').select('*');

  if (status !== 'all') q = q.eq('status', status);
  if (content_type) q = q.eq('content_type', content_type);
  if (week_start) {
    const week_end = addDaysISO(week_start, 7);
    q = q.gte('scheduled_date', week_start).lt('scheduled_date', week_end);
  }

  q = q.order('scheduled_date', { ascending: true, nullsFirst: true })
       .order('position', { ascending: true })
       .order('created_at', { ascending: true });

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — crear nuevo item
export async function POST(req) {
  const body = await req.json();
  if (!body.title || !body.content_type) {
    return NextResponse.json({ error: 'title y content_type son requeridos' }, { status: 400 });
  }
  const status = body.scheduled_date ? 'scheduled' : 'inbox';
  const checklist = initialChecklist(body.content_type, body.checklist);

  const { data, error } = await db.from('parrilla_items').insert({
    title: body.title,
    content: body.content || null,
    content_type: body.content_type,
    origin_type: body.origin_type || 'manual',
    origin_id: body.origin_id || null,
    origin_label: body.origin_label || null,
    idea_group_id: body.idea_group_id || null,
    idea_group_title: body.idea_group_title || null,
    scheduled_date: body.scheduled_date || null,
    position: body.position ?? 0,
    checklist,
    status,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
