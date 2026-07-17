import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createLearningForDiscard } from '@/lib/publicaciones';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const dynamic = 'force-dynamic';

// ═══ POST /api/publicaciones/descartar ═══
// Marca una propuesta como descartada + crea learning draft (spec §3 Módulo B/D).
//
// Body:
//   { proposal_id: <uuid>, discard_reason?: string }
export async function POST(req) {
  try {
    const { proposal_id, discard_reason } = await req.json();
    if (!proposal_id) return NextResponse.json({ error: 'proposal_id requerido' }, { status: 400 });

    const { data, error } = await db
      .from('published_items')
      .update({
        status: 'descartada',
        discard_reason: (discard_reason || '').trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', proposal_id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (data.discard_reason) await createLearningForDiscard(data).catch(err => console.error(err));

    return NextResponse.json({ item: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
