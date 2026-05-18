import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST() {
  try {
    // 1. Fetch all draft learnings
    const { data: drafts, error: draftErr } = await supabase
      .from('learnings')
      .select('*')
      .eq('status', 'draft')
      .order('created_at', { ascending: true });

    if (draftErr) throw draftErr;
    if (!drafts || drafts.length === 0) {
      return NextResponse.json({ groups: [], total: 0 });
    }

    // 2. Group by target_protocol_name
    const grouped = {};
    for (const l of drafts) {
      const key = l.target_protocol_name || 'general';
      if (!grouped[key]) {
        grouped[key] = {
          protocol_name: l.target_protocol_name,
          protocol_id: l.target_protocol_id,
          learnings: [],
        };
      }
      grouped[key].learnings.push(l);
    }

    // 3. For each group, call Claude to synthesize
    const groups = [];
    for (const [key, group] of Object.entries(grouped)) {
      const feedbackList = group.learnings.map((l, i) => 
        `[${i + 1}] Sección: ${l.section}\nContenido original: ${(l.original_content || '').substring(0, 200)}\nFeedback: ${l.feedback}\nCambio propuesto: ${l.proposed_change || 'No especificado'}`
      ).join('\n\n');

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: `Eres el asistente de síntesis de aprendizajes de CMO Engine, un sistema de postproducción de podcasts. Tu trabajo es analizar un grupo de feedbacks que JP (el usuario) dio sobre contenido generado por IA, e identificar PATRONES reales de preferencia — no repetir cada feedback individual.

REGLAS:
- Escribe en español, tuteo colombiano informal (usá "preferís", "tus ediciones")
- Sé específico y concreto. No digas "preferís títulos más directos" — decí "tres de tus ediciones eliminaron 'descubre' y 'aprende' y los reemplazaron con cifras concretas"
- Cada síntesis debe tener: el patrón identificado, ejemplos del feedback original, y el cambio propuesto para el protocolo
- Si hay feedbacks contradictorios, señalalo — puede ser circunstancial
- Agrupa feedbacks que apuntan al mismo patrón
- Respondé en JSON válido`,
        messages: [{
          role: 'user',
          content: `Estos son ${group.learnings.length} feedbacks del protocolo "${group.protocol_name}":\n\n${feedbackList}\n\nSintetizá los patrones encontrados. Respondé SOLO con JSON así:
{
  "syntheses": [
    {
      "pattern": "Descripción corta del patrón (máx 15 palabras)",
      "detail": "Explicación detallada con ejemplos concretos del feedback (2-3 oraciones)",
      "proposed_change": "Qué agregar o cambiar en el protocolo (redacción lista para inyectar)",
      "confidence": "high" | "medium" | "low",
      "source_indices": [1, 3, 5],
      "is_contradictory": false
    }
  ]
}`
        }]
      });

      let syntheses = [];
      try {
        const text = response.content[0].text;
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);
        syntheses = parsed.syntheses || [];
      } catch (e) {
        // If Claude didn't return valid JSON, create a simple synthesis
        syntheses = [{
          pattern: `${group.learnings.length} feedbacks en ${group.protocol_name}`,
          detail: 'No se pudo sintetizar automáticamente. Revisá los feedbacks individuales.',
          proposed_change: '',
          confidence: 'low',
          source_indices: group.learnings.map((_, i) => i + 1),
          is_contradictory: false,
        }];
      }

      // Map source_indices back to actual learning IDs
      for (const s of syntheses) {
        s.learning_ids = (s.source_indices || []).map(i => {
          const idx = i - 1;
          return idx >= 0 && idx < group.learnings.length ? group.learnings[idx].id : null;
        }).filter(Boolean);
      }

      groups.push({
        protocol_name: group.protocol_name,
        protocol_id: group.protocol_id,
        total_feedbacks: group.learnings.length,
        syntheses,
        raw_learnings: group.learnings,
      });
    }

    return NextResponse.json({ groups, total: drafts.length });
  } catch (err) {
    console.error('Synthesize error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
