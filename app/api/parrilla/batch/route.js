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

// POST — enviar múltiples piezas a la parrilla desde un episodio o idea
//   Body: { items: [{ title, content, content_type, origin_type, origin_id, origin_label }],
//           idea_group_id, idea_group_title }
export async function POST(req) {
  const body = await req.json();
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: 'items vacío' }, { status: 400 });
  }

  const rows = items.map(it => ({
    title: it.title || 'Sin título',
    content: it.content || null,
    content_type: it.content_type,
    origin_type: it.origin_type || body.origin_type || null,
    origin_id: it.origin_id || body.origin_id || null,
    origin_label: it.origin_label || body.origin_label || null,
    idea_group_id: body.idea_group_id || null,
    idea_group_title: body.idea_group_title || null,
    scheduled_date: null,
    position: 0,
    checklist: DEFAULT_CHECKLISTS[it.content_type] || {},
    status: 'inbox',
  }));

  const { data, error } = await db.from('parrilla_items').insert(rows).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
