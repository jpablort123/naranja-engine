import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { buildCutPrompt, composicionName } from '@/lib/descript';
import { enqueueJobs, processNext } from '@/lib/descript-queue';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// ═══ POST /api/descript/jobs/enqueue ═══
// Body:
//   {
//     episode_id: <uuid>,
//     clips: [
//       { clip_type: 'micro'|'mediano', clip_ref: 'minado-0' | 'mediano-m1',
//         titulo_trabajo: string,
//         frase_inicio: string, frase_cierre: string,
//         rango_inicio?: 'MM:SS', rango_fin?: 'MM:SS' }
//     ]
//   }
//
// Encola una fila por clip en `descript_jobs` con status queued, luego dispara
// el procesador (asincrónico — responde de inmediato). El procesador serializa
// por project_id (SPEC §3.5).
export async function POST(req) {
  try {
    const body = await req.json();
    const { episode_id, clips } = body || {};
    if (!episode_id || !Array.isArray(clips) || clips.length === 0) {
      return NextResponse.json({ error: 'episode_id y clips requeridos' }, { status: 400 });
    }

    const { data: ep, error: epErr } = await db
      .from('episodes')
      .select('id, name, descript_project_id, descript_composition_id, descript_composition_name')
      .eq('id', episode_id)
      .single();
    if (epErr || !ep) return NextResponse.json({ error: 'episodio no encontrado' }, { status: 404 });
    if (!ep.descript_project_id) {
      return NextResponse.json({ error: 'episodio sin descript_project_id — importa por link primero' }, { status: 400 });
    }

    // Deducir número de episodio (opcional, para la convención de nombres).
    // Buscar primero en ep.name; si no, en el nombre de la composición madre
    // (los proyectos de Descript suelen llamarse "CMO Latam - Episodio4").
    const episode_number =
      extractEpisodeNumber(ep.name) ||
      extractEpisodeNumber(ep.descript_composition_name) ||
      'X';

    // Dedupe: cargar los clip_ref ya encolados/corriendo/hechos para este episodio.
    // Cortes 'cancelled' o 'error' SÍ se pueden reencolar.
    const { data: existing } = await db
      .from('descript_jobs')
      .select('clip_ref, status')
      .eq('episode_id', episode_id)
      .in('status', ['queued', 'running', 'done']);
    const alreadyRefs = new Set((existing || []).map(r => r.clip_ref).filter(Boolean));
    const skipped = [];

    const items = clips.map((c, i) => {
      const inicio = (c.frase_inicio || '').trim();
      const cierre = (c.frase_cierre || '').trim();
      if (!inicio || !cierre) {
        throw new Error(`clip ${i}: frase_inicio y frase_cierre son requeridas`);
      }
      const clip_ref = c.clip_ref || `clip-${i}`;
      const nombre_clip = c.composition_name || composicionName({
        clip_type: c.clip_type,
        episode_number,
        slug: c.titulo_trabajo || clip_ref || `clip-${i + 1}`,
      });
      const prompt = buildCutPrompt({
        nombre_composicion_madre: ep.descript_composition_name || 'Full Episode',
        nombre_clip,
        frase_inicio_verbatim: inicio,
        frase_cierre_verbatim: cierre,
        rango_inicio: c.rango_inicio,
        rango_fin: c.rango_fin,
      });
      return {
        episode_id,
        project_id: ep.descript_project_id,
        clip_type: c.clip_type || 'micro',
        clip_ref,
        composition_name: nombre_clip,
        prompt,
        meta: {
          titulo_trabajo: c.titulo_trabajo || null,
          rango_inicio: c.rango_inicio || null,
          rango_fin: c.rango_fin || null,
        },
      };
    }).filter(it => {
      if (alreadyRefs.has(it.clip_ref)) {
        skipped.push({ clip_ref: it.clip_ref, reason: 'duplicate' });
        return false;
      }
      return true;
    });

    const inserted = items.length > 0 ? await enqueueJobs(items) : [];

    // Disparar el procesador — no esperamos a que termine (fire-and-forget).
    // El procesador retorna cuando el POST a Descript arrancó el primer job;
    // el resto se dispara por el webhook (o el fallback poll).
    if (inserted.length > 0) {
      processNext(ep.descript_project_id).catch(err =>
        console.error('processNext error:', err?.message || err)
      );
    }

    return NextResponse.json({ enqueued: inserted.length, jobs: inserted, skipped });
  } catch (e) {
    console.error('enqueue error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// EP{n} — intenta encontrar un número. Busca "EP1", "EP_1", "EP 1", "Episodio 4"
// y como último recurso un número corto suelto.
function extractEpisodeNumber(name) {
  if (!name) return null;
  const s = String(name);
  const m =
    s.match(/EP[\s_-]?(\d{1,3})/i) ||
    s.match(/Episodio[\s_-]?(\d{1,3})/i) ||
    s.match(/Episode[\s_-]?(\d{1,3})/i) ||
    s.match(/\b(\d{1,3})\b/);
  return m ? m[1] : null;
}
