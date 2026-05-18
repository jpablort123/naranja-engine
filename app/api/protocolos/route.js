import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// GET all protocols with their approved learnings count
export async function GET() {
  try {
    const { data: protocolos, error } = await supabase
      .from('protocolos')
      .select('*')
      .order('slug');

    if (error) throw error;

    // For each protocol, count approved learnings
    const enriched = await Promise.all(
      protocolos.map(async (p) => {
        const { count: approvedCount } = await supabase
          .from('learnings')
          .select('*', { count: 'exact', head: true })
          .eq('target_protocol_id', p.id)
          .eq('status', 'approved');

        const { count: draftCount } = await supabase
          .from('learnings')
          .select('*', { count: 'exact', head: true })
          .eq('target_protocol_id', p.id)
          .eq('status', 'draft');

        // Get approved learnings text for display
        const { data: approvedLearnings } = await supabase
          .from('learnings')
          .select('id, feedback, proposed_change, created_at')
          .eq('target_protocol_id', p.id)
          .eq('status', 'approved')
          .order('created_at', { ascending: true });

        return {
          ...p,
          approved_learnings_count: approvedCount || 0,
          draft_learnings_count: draftCount || 0,
          approved_learnings: approvedLearnings || [],
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
