import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(req) {
  try {
    const { actions } = await req.json();
    // actions = [{ learning_ids: [...], status: 'approved' | 'rejected' | 'circumstantial', synthesis_text: '...' }]

    if (!actions || !Array.isArray(actions)) {
      return NextResponse.json({ error: 'actions array required' }, { status: 400 });
    }

    const results = { approved: 0, rejected: 0, circumstantial: 0, history_entries: 0 };

    // Group approved learnings by protocol for history snapshots
    const approvedByProtocol = {};

    for (const action of actions) {
      const { learning_ids, status, synthesis_text } = action;
      if (!learning_ids?.length || !status) continue;

      // Update learnings status
      const { error: updateErr } = await supabase
        .from('learnings')
        .update({ status })
        .in('id', learning_ids);

      if (updateErr) {
        console.error('Update error:', updateErr);
        continue;
      }

      results[status] = (results[status] || 0) + learning_ids.length;

      // If approved, collect for protocol_history
      if (status === 'approved') {
        // Get the protocol info from the first learning
        const { data: learnings } = await supabase
          .from('learnings')
          .select('target_protocol_id, target_protocol_name')
          .in('id', learning_ids)
          .limit(1);

        if (learnings?.[0]?.target_protocol_id) {
          const pid = learnings[0].target_protocol_id;
          if (!approvedByProtocol[pid]) {
            approvedByProtocol[pid] = {
              protocol_id: pid,
              protocol_name: learnings[0].target_protocol_name,
              learning_ids: [],
              summaries: [],
            };
          }
          approvedByProtocol[pid].learning_ids.push(...learning_ids);
          if (synthesis_text) {
            approvedByProtocol[pid].summaries.push(synthesis_text);
          }
        }
      }
    }

    // Create protocol_history entries for approved batches
    for (const [pid, info] of Object.entries(approvedByProtocol)) {
      // Get current protocol content
      const { data: protocol } = await supabase
        .from('protocolos')
        .select('content, version')
        .eq('id', pid)
        .single();

      if (protocol) {
        const { error: histErr } = await supabase
          .from('protocol_history')
          .insert({
            protocol_id: pid,
            previous_content: protocol.content,
            new_content: protocol.content, // Content doesn't change — learnings are injected at runtime
            learning_ids: info.learning_ids,
            summary: info.summaries.join(' | ') || `${info.learning_ids.length} aprendizajes aprobados para ${info.protocol_name}`,
          });

        if (!histErr) results.history_entries++;
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    console.error('Batch update error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
