import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { buildSystem, callClaude } from '@/lib/generation';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// POST /api/newsletters/generate
//   body: { newsletter_id, phase: 'ideas' }
//   body: { newsletter_id, phase: 'repurpose', selected_ideas: [...] }
export async function POST(req) {
  try {
    const body = await req.json();
    const { newsletter_id, phase, selected_ideas } = body;

    if (!newsletter_id) return NextResponse.json({ error: 'newsletter_id requerido' }, { status: 400 });
    if (!phase) return NextResponse.json({ error: 'phase requerido' }, { status: 400 });

    const { data: nl, error: fetchErr } = await db
      .from('newsletters')
      .select('articulo, resumen')
      .eq('id', newsletter_id)
      .single();
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    if (!nl?.articulo) return NextResponse.json({ error: 'Newsletter sin artículo' }, { status: 400 });

    let result;
    const updates = {};

    // ═══ PHASE: IDEAS ═══
    // Artículo → resumen estructurado (plomería silenciosa) + lista de ideas validables.
    // System: adn + mapa-angulos. Mismo mecanismo de protocolos que el podcast.
    if (phase === 'ideas') {
      const system = await buildSystem(['adn', 'mapa-angulos']);
      const articulo = nl.articulo.substring(0, 30000);

      result = await callClaude(
        `Tenés un artículo de newsletter YA ESCRITO por el autor. Tu trabajo NO es reescribirlo. Tu trabajo es:
(1) Producir un "resumen optimizado para IA": un mapa estructurado del artículo que sirva de plomería para llamadas posteriores (no se muestra al usuario).
(2) Extraer una lista de ideas validables que puedan funcionar como pieza independiente (carrusel, reel o LinkedIn).

Responde SOLO con JSON válido:
{
  "resumen": {
    "tesis": "la tesis principal del artículo en 2-3 oraciones",
    "datos_duros": ["todas las cifras, datos y referencias mencionadas"],
    "ideas_clave": ["cada idea distinta del artículo, una oración por idea"],
    "tensiones": ["tensiones, contradicciones o frentes abiertos del argumento"],
    "frases": ["citas textuales memorables del artículo"],
    "conexiones": ["conexiones con tendencias o debates de marketing"]
  },
  "ideas": [
    {
      "titulo": "máximo 10 palabras, captura la tensión",
      "descripcion": "una oración explicando por qué funciona como pieza independiente",
      "tipo": "contraste|dato_absurdo|secreto|cliche_no_practicado|contrarian|mecanismo_invisible|cambio_paradigma|tension_real|barrera_emocional|historia_personal"
    }
  ]
}

ARTÍCULO:
${articulo}`,
        system
      );

      updates.resumen = result.resumen;
      updates.ideas = result.ideas;
      updates.status = 'ideas_ready';
    }

    // ═══ PHASE: REPURPOSE ═══
    // Ideas seleccionadas → 3 llamadas en paralelo (reels, carrusel, linkedin).
    // Cada protocolo se inyecta junto al ADN, igual que en el flujo del podcast.
    else if (phase === 'repurpose') {
      if (!Array.isArray(selected_ideas) || selected_ideas.length === 0) {
        return NextResponse.json({ error: 'selected_ideas vacío' }, { status: 400 });
      }

      const ideasCtx = selected_ideas.map((idea, i) => `${i + 1}. ${idea.titulo}: ${idea.descripcion}`).join('\n');
      const r = nl.resumen || {};
      const resumenCtx = `TESIS: ${r.tesis || '—'}
DATOS: ${(r.datos_duros || []).join(', ') || '—'}
TENSIONES: ${(r.tensiones || []).join(' | ') || '—'}
CONEXIONES: ${(r.conexiones || []).join(' | ') || '—'}`;

      const basePrompt = `IDEAS SELECCIONADAS POR JP (cada una es una pieza independiente):
${ideasCtx}

RESUMEN DEL ARTÍCULO (contexto silencioso):
${resumenCtx}`;

      const [sysReels, sysCarrusel, sysLinkedin] = await Promise.all([
        buildSystem(['adn', 'reels']),
        buildSystem(['adn', 'carrusel']),
        buildSystem(['adn', 'linkedin']),
      ]);

      const [rReels, rCarrusel, rLinkedin] = await Promise.all([
        callClaude(
          `${basePrompt}\n\nGenerá UN guión de reel por cada idea seleccionada. Variar tipo_gancho cuando se pueda.\nJSON: { "reels": [{ "titulo": "título del reel", "guion": "guión de 200-230 palabras", "tipo_gancho": "dato|afirmacion|escena|pregunta", "formato": "deep_dive|round_up|serie" }] }`,
          sysReels
        ),
        callClaude(
          `${basePrompt}\n\nGenerá UN carrusel de Instagram por cada idea seleccionada, de 8 a 10 slides, siguiendo el protocolo de carrusel.

Reglas de salida ESTRICTAS:
- slides[0] siempre es la portada (tipo: "portada").
- La última slide siempre es el CTA (tipo: "cta").
- Las slides intermedias son tipo "desarrollo".
- Numerar las slides en orden con "n": 1, 2, 3, ... N.
- Cada slide es texto autosuficiente (una sola idea por slide).
- Slide 1 y slide 2 tienen que enganchar por separado (el algoritmo reinjecta desde slide 2).

JSON: { "carruseles": [{ "titulo": "referencia interna", "patron_gancho": "dato_contundente|contraintuitivo|dolor_directo|promesa_lista|error_senalado", "slides": [{ "n": 1, "tipo": "portada|desarrollo|cta", "texto": "..." }] }] }`,
          sysCarrusel
        ),
        callClaude(
          `${basePrompt}\n\nGenerá UN post de LinkedIn por cada idea seleccionada.\nJSON: { "posts": [{ "hook": "primeras 2 líneas antes del 'ver más'", "cuerpo": "desarrollo completo 800-1200 chars", "patron_hook": "reframe|metafora|tension|imperativo|pregunta" }] }`,
          sysLinkedin
        ),
      ]);

      result = {
        reels: rReels.reels || [],
        carrusel: rCarrusel.carruseles || [],
        linkedin: rLinkedin.posts || [],
      };
      updates.repurpose_content = result;
      updates.status = 'complete';
    }

    else {
      return NextResponse.json({ error: `phase desconocido: ${phase}` }, { status: 400 });
    }

    // Persistir resultados en la fila del newsletter
    if (Object.keys(updates).length > 0) {
      const { error: updErr } = await db
        .from('newsletters')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', newsletter_id);
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    return NextResponse.json({ result });
  } catch (e) {
    console.error('Newsletter generate error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
