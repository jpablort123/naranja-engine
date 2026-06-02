import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { buildSystem, callClaude } from '@/lib/generation';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// ═══ MAIN HANDLER ═══
export async function POST(req) {
  try {
    const body = await req.json();
    const { episode_id, phase, prompt, selected_angles, mapa } = body;

    // Simple prompt call (for feedback/regeneration and fixture generation)
    if (prompt && !phase) {
      const system = await buildSystem(body.protocols || ['adn']);
      const result = await callClaude(prompt, system + '\n\nREGLA: Responde SOLO con JSON válido. Sin markdown, sin backticks, sin texto adicional.');
      return NextResponse.json({ result });
    }

    // Load transcript
    const { data: ep } = await db.from('episodes').select('transcript, mapa').eq('id', episode_id).single();
    if (!ep?.transcript) return NextResponse.json({ error: "No transcript" }, { status: 400 });

    let result;
    const updates = {};

    // ═══ PHASE: ANGLES ═══
    // Upload transcript → mapa + 20 ángulos
    if (phase === 'angles') {
      const system = await buildSystem(['adn', 'mapa-angulos']);
      const tx = ep.transcript.substring(0, 30000);
      result = await callClaude(
        `Analiza esta transcripción y genera el mapa del episodio + 20 ángulos interesantes.

Responde SOLO con JSON válido:
{
  "mapa": {
    "tesis": "tesis principal en 2-3 oraciones",
    "datos_duros": ["lista de todas las cifras y datos mencionados"],
    "ideas": ["cada idea distinta del invitado, una oración por idea"],
    "tensiones": ["tensiones y contradicciones"],
    "frases": ["citas textuales memorables"],
    "historia_personal": "trayectoria y momentos formativos del invitado (si los hay)",
    "conexiones": ["conexiones con tendencias o debates de marketing"]
  },
  "angulos": [
    {
      "titulo": "máximo 10 palabras, captura la tensión",
      "descripcion": "una oración explicando por qué es interesante",
      "tipo": "contraste|dato_absurdo|secreto|cliche_no_practicado|contrarian|mecanismo_invisible|cambio_paradigma|tension_real|barrera_emocional|historia_personal"
    }
  ]
}

TRANSCRIPCIÓN:
${tx}`,
        system
      );
      updates.mapa = result.mapa;
      updates.ideas = result.angulos;
    }

    // ═══ PHASE: CONTENIDO ═══
    // Selected angles → títulos + descripciones + thumbnails
    else if (phase === 'contenido') {
      const system = await buildSystem(['adn', 'titulos']);
      const anglesCtx = (selected_angles || []).map((a, i) => `${i + 1}. ${a.titulo}: ${a.descripcion}`).join('\n');
      const mapaCtx = mapa ? `TESIS: ${mapa.tesis}\nDATOS: ${(mapa.datos_duros || []).join(', ')}` : '';

      result = await callClaude(
        `Genera títulos y descripciones para este episodio, AFILADOS alrededor de los ángulos seleccionados.

ÁNGULOS SELECCIONADOS POR JP:
${anglesCtx}

MAPA DEL EPISODIO:
${mapaCtx}

Responde SOLO con JSON válido:
{
  "titulos": ["10 títulos, formato: Nombre de Empresa: verbo + resultado, máx 60 chars para Spotify"],
  "descripcion_spotify": "250-300 caracteres",
  "descripcion_youtube": "500-800 caracteres con timestamps y hashtags",
  "thumbnails": ["3 sugerencias de thumbnail: composición + texto sobreimpreso"]
}`,
        system
      );
      updates.titulos = result.titulos;
      updates.descripcion_spotify = result.descripcion_spotify;
      updates.descripcion_youtube = result.descripcion_youtube;
      updates.thumbnails = result.thumbnails;
    }

    // ═══ PHASE: MINADO ═══
    // Transcript → micro-content clips + voz en off
    else if (phase === 'minado') {
      const system = await buildSystem(['adn', 'minado']);
      const tx = ep.transcript.substring(0, 30000);
      const anglesCtx = (selected_angles || []).map(a => `- ${a.titulo}`).join('\n');

      result = await callClaude(
        `Lee esta transcripción y extrae 15-20 fragmentos para micro-contenido en redes sociales + 5-10 opciones de voz en off.

ÁNGULOS EDITORIALES SELECCIONADOS (para la voz en off):
${anglesCtx}

Responde SOLO con JSON válido:
{
  "momentos": [
    {
      "cita": "texto EXACTO de la transcripción para buscar en Descript",
      "timestamp": "MM:SS estimado",
      "duracion_seg": 30,
      "categoria": "DATO ABSURDO|INSIGHT ACCIONABLE|CONFESIÓN|IDEA CONTRARIAN|HISTORIA CON REMATE|TENSIÓN SIN RESOLVER",
      "dani": false,
      "por_que_funciona": "una oración",
      "sugerencia_caption": "una línea para redes"
    }
  ],
  "voz_en_off": [
    {
      "texto": "presentación de 8-15 segundos",
      "formula": "escala|contraste|gancho_narrativo|trayectoria_con_twist"
    }
  ]
}

Mínimo 3-5 momentos deben incluir a Daniela (dani: true).

TRANSCRIPCIÓN:
${tx}`,
        system
      );
      updates.minado = result;
    }

    // ═══ PHASE: REPURPOSE ═══
    // Selected angles → intros + reels + linkedin
    else if (phase === 'repurpose') {
      const anglesCtx = (selected_angles || []).map((a, i) => `${i + 1}. ${a.titulo}: ${a.descripcion}`).join('\n');
      const mapaCtx = mapa ? `TESIS: ${mapa.tesis}\nDATOS: ${(mapa.datos_duros || []).join(', ')}\nHISTORIA PERSONAL: ${mapa.historia_personal || 'No disponible'}` : '';

      // Call intros, reels, and linkedin in parallel
      const [sysIntros, sysReels, sysLinkedin] = await Promise.all([
        buildSystem(['adn', 'intros']),
        buildSystem(['adn', 'reels']),
        buildSystem(['adn', 'linkedin']),
      ]);

      const basePrompt = `ÁNGULOS SELECCIONADOS:\n${anglesCtx}\n\nMAPA:\n${mapaCtx}`;

      const [r1, r2, r3] = await Promise.all([
        callClaude(
          `${basePrompt}\n\nGenera 10 intros leídos para Daniela.\nJSON: { "intros": [{ "titulo": "nombre del intro", "texto": "intro 150-300 palabras listo para leer", "formula": "dato_absurdo|escena_personal|premisa_contrarian|pregunta_provocadora" }] }`,
          sysIntros
        ),
        callClaude(
          `${basePrompt}\n\nGenera 3 versiones de guión de reel, cada una con un tipo de gancho diferente.\nJSON: { "reels": [{ "titulo": "título del reel", "guion": "guión de 200-230 palabras", "tipo_gancho": "dato|afirmacion|escena|pregunta", "formato": "deep_dive|round_up|serie" }] }`,
          sysReels
        ),
        callClaude(
          `${basePrompt}\n\nGenera 2 versiones de post de LinkedIn.\nJSON: { "posts": [{ "hook": "primeras 2 líneas antes del ver más", "cuerpo": "desarrollo completo del post 800-1200 chars", "patron_hook": "reframe|metafora|tension|imperativo|pregunta" }] }`,
          sysLinkedin
        ),
      ]);

      result = { intros: r1.intros, reels: r2.reels, linkedin: r3.posts };
      updates.repurpose_content = result;
    }

    // Save to Supabase
    if (episode_id && Object.keys(updates).length > 0) {
      await db.from('episodes').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', episode_id);
    }

    return NextResponse.json({ result: result || updates });
  } catch (e) {
    console.error("Generate error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
