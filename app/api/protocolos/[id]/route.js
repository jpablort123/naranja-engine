import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(req, { params }) {
  try {
    const { id } = params;
    const { data, error } = await supabase
      .from('protocolos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    // Get approved learnings for this protocol
    const { data: learnings } = await supabase
      .from('learnings')
      .select('*')
      .eq('target_protocol_id', id)
      .eq('status', 'approved')
      .order('created_at');

    return NextResponse.json({ ...data, approved_learnings: learnings || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const { content, reason } = await req.json();

    // Get current content for history
    const { data: current } = await supabase
      .from('protocolos')
      .select('content, version, name')
      .eq('id', id)
      .single();

    if (!current) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
    }

    // Save to protocol_history
    await supabase.from('protocol_history').insert({
      protocol_id: id,
      previous_content: current.content,
      new_content: content,
      learning_ids: [],
      summary: reason || `Edición manual del protocolo "${current.name}"`,
    });

    // Update protocol
    const { data, error } = await supabase
      .from('protocolos')
      .update({
        content,
        version: (current.version || 1) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
