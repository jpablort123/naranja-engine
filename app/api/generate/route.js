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
    // Transcript → micro-content clips (con frase de inicio/cierre para Descript) + voz en off
    else if (phase === 'minado') {
      const system = await buildSystem(['adn', 'minado']);
      const tx = ep.transcript.substring(0, 30000);
      const anglesCtx = (selected_angles || []).map(a => `- ${a.titulo}`).join('\n');

      result = await callClaude(
        `Lee esta transcripción y extrae 15-20 fragmentos para micro-contenido en redes sociales + 5-10 opciones de voz en off.

ÁNGULOS EDITORIALES SELECCIONADOS (para la voz en off):
${anglesCtx}

REGLAS ESTRICTAS:
- frase_inicio y frase_cierre son CITAS TEXTUALES EXACTAS de la transcripción (para anclar cortes en Descript). No parafrasees. No limpies. Copia literal como aparezcan (muletillas, puntuación).
- Si el clip es una sola oración corta, frase_inicio == frase_cierre.
- gancho es el título/hook editorial del clip (máx 10 palabras, no textual).
- frase_iman es la línea más citable del clip (para usar como copy destacado).

Responde SOLO con JSON válido:
{
  "momentos": [
    {
      "gancho": "título editorial del clip (máx 10 palabras)",
      "cita": "texto EXACTO de la transcripción (fragmento representativo)",
      "frase_inicio": "cita textual exacta con la que arranca el corte",
      "frase_cierre": "cita textual exacta con la que termina el corte",
      "timestamp": "MM:SS estimado",
      "duracion_seg": 30,
      "categoria": "DATO ABSURDO|INSIGHT ACCIONABLE|CONFESIÓN|IDEA CONTRARIAN|HISTORIA CON REMATE|TENSIÓN SIN RESOLVER",
      "dani": false,
      "por_que_funciona": "una oración",
      "frase_iman": "la línea más citable del clip",
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

    // ═══ PHASE: REPURPOSE (legacy) ═══
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

    // ═══ PHASE: REELS_V2 ═══
    // Selected angles → per-angle card with a single propuesta { hooks, desarrollo, ctas }
    else if (phase === 'reels_v2') {
      const angles = selected_angles || [];
      const mapaCtx = mapa ? `TESIS: ${mapa.tesis}\nDATOS: ${(mapa.datos_duros || []).join(', ')}\nHISTORIA PERSONAL: ${mapa.historia_personal || 'No disponible'}` : '';
      const sysReels = await buildSystem(['adn', 'reels']);

      const cards = await Promise.all(angles.map(async (a) => {
        const angleCtx = `ÁNGULO: ${a.titulo}\nDESCRIPCIÓN: ${a.descripcion}\n\nMAPA:\n${mapaCtx}`;
        const r = await callClaude(
          `${angleCtx}\n\nGenera UNA propuesta de guión de reel para este ángulo, desglosada en 4 partes independientes y claramente etiquetadas:\n\n1. HOOKS — 4 opciones (cada una: 5-10 palabras que enganchan el swipe).\n2. DESARROLLO — 1 bloque (cuerpo del guión, 120-180 palabras).\n3. CIERRES EDITORIALES — 3 opciones (cada una: 1-2 frases que rematan el argumento, sin pedir acción).\n4. CTAs DE ACCIÓN — 3 opciones (cada una: 1-2 frases que invitan explícitamente a una acción concreta).\n\nJSON estricto: { "hooks": ["h1","h2","h3","h4"], "desarrollo": "cuerpo del guión", "cierres": ["c1","c2","c3"], "ctas": ["cta1","cta2","cta3"] }`,
          sysReels
        );
        return {
          angulo_titulo: a.titulo,
          angulo_descripcion: a.descripcion,
          angulo_tipo: a.tipo,
          propuestas: [{
            hooks: (r.hooks || []).map(h => ({ texto: h })),
            desarrollo: r.desarrollo || '',
            cierres: (r.cierres || []).map(c => ({ texto: c })),
            ctas: (r.ctas || []).map(c => ({ texto: c })),
          }],
        };
      }));

      result = { cards };
      // Merge into existing repurpose_content JSONB
      const { data: current } = await db.from('episodes').select('repurpose_content').eq('id', episode_id).single();
      const merged = { ...(current?.repurpose_content || {}), reels_v2: cards };
      updates.repurpose_content = merged;
    }

    // ═══ PHASE: REELS_VARIANT ═══
    // Generate a new propuesta for a single angle. Client is responsible for merging into card.propuestas.
    else if (phase === 'reels_variant') {
      const a = body.angulo;
      const mapaCtx = mapa ? `TESIS: ${mapa.tesis}\nDATOS: ${(mapa.datos_duros || []).join(', ')}\nHISTORIA PERSONAL: ${mapa.historia_personal || 'No disponible'}` : '';
      const sysReels = await buildSystem(['adn', 'reels']);
      const angleCtx = `ÁNGULO: ${a?.titulo || ''}\nDESCRIPCIÓN: ${a?.descripcion || ''}\n\nMAPA:\n${mapaCtx}`;
      const r = await callClaude(
        `${angleCtx}\n\nGenera OTRA propuesta distinta de guión de reel para el mismo ángulo, con un enfoque diferente al anterior. Devolvé 4 secciones claramente etiquetadas:\n\n1. HOOKS — 4 opciones (5-10 palabras).\n2. DESARROLLO — 1 bloque (120-180 palabras).\n3. CIERRES EDITORIALES — 3 opciones (1-2 frases que rematan el argumento sin pedir acción).\n4. CTAs DE ACCIÓN — 3 opciones (1-2 frases que invitan a la acción).\n\nJSON estricto: { "hooks": ["h1","h2","h3","h4"], "desarrollo": "cuerpo", "cierres": ["c1","c2","c3"], "ctas": ["cta1","cta2","cta3"] }`,
        sysReels
      );
      result = {
        propuesta: {
          hooks: (r.hooks || []).map(h => ({ texto: h })),
          desarrollo: r.desarrollo || '',
          cierres: (r.cierres || []).map(c => ({ texto: c })),
          ctas: (r.ctas || []).map(c => ({ texto: c })),
        },
      };
      // Do not persist here — client merges and calls PUT /api/episodes with the updated repurpose_content.
    }

    // ═══ PHASE: MEDIANOS-CANDIDATOS ═══
    // Transcript con timestamps + mapa + ángulos seleccionados (prioridad blanda) → array de candidatos.
    // Guardar en episodes.medianos_candidatos.
    else if (phase === 'medianos-candidatos') {
      const system = await buildSystem(['adn', 'medianos']);
      // Transcript completo con timestamps — el modelo necesita ver las marcas para proponer rangos.
      // Techo de 60k chars para dejar aire al system prompt sin exceder max context útil.
      const tx = ep.transcript.substring(0, 60000);
      const mapaCtx = mapa
        ? `TESIS: ${mapa.tesis || ''}\nDATOS: ${(mapa.datos_duros || []).join(', ')}\nIDEAS: ${(mapa.ideas || []).join(' | ')}\nTENSIONES: ${(mapa.tensiones || []).join(' | ')}`
        : '';
      const anglesCtx = (selected_angles || []).length > 0
        ? (selected_angles || []).map((a, i) => `${i + 1}. ${a?.titulo || ''}${a?.descripcion ? ` — ${a.descripcion}` : ''}`).join('\n')
        : '(sin ángulos seleccionados por el usuario)';

      result = await callClaude(
        `Analiza esta transcripción CON TIMESTAMPS y propone candidatos de contenido mediano: tramos de 4-12 minutos que pueden empaquetarse como mini-episodios centrados en un solo tema desarrollado dentro del episodio.

Prioridad blanda: prioriza tramos que toquen los ángulos que el usuario ya seleccionó, pero no te limites a ellos — si encontrás un tramo distinto que también merece ser mediano, incluílo.

REGLAS ESTRICTAS DE FORMATO:
- rango_inicio debe ser temporalmente ANTERIOR a rango_fin.
- duracion_estimada_min debe corresponder al rango real (minutos redondeados).
- Los timestamps deben venir de la transcripción, no inventados.

ÁNGULOS SELECCIONADOS (prioridad blanda):
${anglesCtx}

MAPA DEL EPISODIO:
${mapaCtx}

Responde SOLO con JSON válido:
{
  "candidatos": [
    {
      "id": "m1",
      "titulo_trabajo": "título corto de trabajo del mediano",
      "rango_inicio": "MM:SS o HH:MM:SS",
      "rango_fin": "MM:SS o HH:MM:SS",
      "duracion_estimada_min": 6,
      "tipo_angulo": "una etiqueta corta del ángulo o tensión que desarrolla el tramo",
      "razon": "por qué este tramo funciona solo como mediano — una oración",
      "angulos_relacionados": [3, 6]
    }
  ]
}

angulos_relacionados: array de índices (1-based) de los ángulos seleccionados que este candidato toca. Puede ir vacío.

TRANSCRIPCIÓN:
${tx}`,
        system
      );
      updates.medianos_candidatos = result.candidatos || [];
    }

    // ═══ PHASE: MEDIANOS-DESARROLLO ═══
    // Candidatos seleccionados + transcript con timestamps + mapa → piezas desarrolladas con paquete completo.
    // Guardar en episodes.medianos.
    else if (phase === 'medianos-desarrollo') {
      const system = await buildSystem(['adn', 'medianos']);
      const tx = ep.transcript.substring(0, 60000);
      const seleccionados = body.candidatos_seleccionados || [];
      const mapaCtx = mapa
        ? `TESIS: ${mapa.tesis || ''}\nDATOS: ${(mapa.datos_duros || []).join(', ')}\nIDEAS: ${(mapa.ideas || []).join(' | ')}`
        : '';
      const candCtx = seleccionados.map((c, i) => `${i + 1}. id=${c.id || `m${i + 1}`}
   titulo_trabajo: ${c.titulo_trabajo || ''}
   rango: ${c.rango_inicio || ''} → ${c.rango_fin || ''}
   duracion_estimada_min: ${c.duracion_estimada_min || ''}
   tipo_angulo: ${c.tipo_angulo || ''}
   razon: ${c.razon || ''}`).join('\n\n');

      result = await callClaude(
        `Desarrolla estos ${seleccionados.length} candidatos de contenido mediano en piezas listas para producir. Cada pieza es un mini-episodio de 4-12 minutos, empaquetado con título, descripción de YouTube y 3 conceptos de thumbnail.

REGLAS ESTRICTAS DE FORMATO:
- rango_inicio SIEMPRE temporalmente anterior a rango_fin.
- duracion_estimada_min corresponde al rango real.
- inicio_textual y cierre_textual deben ser CITAS TEXTUALES EXACTAS de la transcripción (dentro del rango del mediano). No parafrasees. No limpies. Copia literal, con muletillas y puntuación como aparezcan.
- Devolvé un objeto por candidato, manteniendo el mismo id.

MAPA DEL EPISODIO:
${mapaCtx}

CANDIDATOS A DESARROLLAR:
${candCtx}

Responde SOLO con JSON válido:
{
  "medianos": [
    {
      "id": "m1",
      "titulo_trabajo": "título corto de trabajo (mantener el del candidato)",
      "rango_inicio": "MM:SS o HH:MM:SS",
      "rango_fin": "MM:SS o HH:MM:SS",
      "duracion_estimada_min": 6,
      "tipo_angulo": "etiqueta del ángulo",
      "inicio_textual": "cita exacta con la que arranca el tramo, tal cual en la transcripción",
      "cierre_textual": "cita exacta con la que cierra el tramo, tal cual en la transcripción",
      "titulos": ["título 1", "título 2", "título 3", "título 4", "título 5"],
      "descripcion_youtube": "500-800 caracteres con timestamps y hashtags si corresponde",
      "thumbnails": [
        { "opcion": "A", "concepto": "composición + texto sobreimpreso" },
        { "opcion": "B", "concepto": "composición + texto sobreimpreso" },
        { "opcion": "C", "concepto": "composición + texto sobreimpreso" }
      ]
    }
  ]
}

TRANSCRIPCIÓN:
${tx}`,
        system
      );
      updates.medianos = result.medianos || [];
    }

    // ═══ PHASE: INTROS_ONLY ═══
    // Selected angles → just intros (same protocol as legacy repurpose intros)
    else if (phase === 'intros_only') {
      const anglesCtx = (selected_angles || []).map((a, i) => `${i + 1}. ${a.titulo}: ${a.descripcion}`).join('\n');
      const mapaCtx = mapa ? `TESIS: ${mapa.tesis}\nDATOS: ${(mapa.datos_duros || []).join(', ')}\nHISTORIA PERSONAL: ${mapa.historia_personal || 'No disponible'}` : '';
      const sysIntros = await buildSystem(['adn', 'intros']);
      const r = await callClaude(
        `ÁNGULOS SELECCIONADOS:\n${anglesCtx}\n\nMAPA:\n${mapaCtx}\n\nGenera 10 intros leídos para Daniela.\nJSON: { "intros": [{ "titulo": "nombre del intro", "texto": "intro 150-300 palabras listo para leer", "formula": "dato_absurdo|escena_personal|premisa_contrarian|pregunta_provocadora" }] }`,
        sysIntros
      );
      result = { intros: r.intros || [] };
      const { data: current } = await db.from('episodes').select('repurpose_content').eq('id', episode_id).single();
      const merged = { ...(current?.repurpose_content || {}), intros: r.intros || [] };
      updates.repurpose_content = merged;
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
