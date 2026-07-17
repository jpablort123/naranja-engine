import { NextResponse } from 'next/server';
import { callClaude, buildSystem } from '@/lib/generation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ═══ POST /api/publicaciones/sugerir-angulo ═══
// Toma un libreto (texto original que la copy hizo por fuera del sistema) y
// pide a Claude que sugiera un `angle_type` de la lista fija que usa el
// Universo (spec §3 Módulo C).
//
// Body: { libreto: string }
// Devuelve: { angle_type, confianza, razon }
//
// No procesamos el libreto más allá de sugerir el ángulo — el spec §3 lo
// llama "capturar lo irreemplazable barato". El libreto se guarda como
// semilla; el aprendizaje real es futuro.
const ANGULOS = [
  'errores_mitos',
  'tras_la_decision',
  'datos_duros',
  'historia_personal',
  'otro',
];

export async function POST(req) {
  try {
    const { libreto } = await req.json();
    const texto = (libreto || '').toString().trim();
    if (!texto || texto.length < 20) {
      return NextResponse.json({ error: 'libreto muy corto para sugerir ángulo' }, { status: 400 });
    }

    // Reutilizar el mismo system prompt del ADN de CMO (protocolo `adn`)
    // para que la sugerencia respete el estilo editorial. Si no está, seguimos
    // con un system prompt liviano.
    let system = '';
    try {
      system = await buildSystem(['adn']);
    } catch (_) {
      system = 'Eres un editor de contenido de podcast que clasifica libretos por su tipo de ángulo editorial.';
    }

    const prompt = `Un integrante del equipo escribió un libreto para publicar en redes. Clasifica el ángulo editorial en UNO de los siguientes tipos (elige el que mejor calce, aunque no sea perfecto):

- errores_mitos: derriba una creencia común, señala un error frecuente, "todo el mundo dice X pero…"
- tras_la_decision: cuenta el detrás de escena de una decisión concreta, un dilema que enfrentó alguien y qué eligió
- datos_duros: cifras, estudios, mediciones — el ángulo es "los números dicen esto"
- historia_personal: anécdota íntima, un episodio de la vida de alguien, contada en primera persona
- otro: no encaja bien en ninguna

Devuelve SOLO JSON (sin markdown ni backticks):
{
  "angle_type": "errores_mitos" | "tras_la_decision" | "datos_duros" | "historia_personal" | "otro",
  "confianza": "alta" | "media" | "baja",
  "razon": "una oración corta explicando la elección"
}

LIBRETO:
"""
${texto.slice(0, 4000)}
"""`;

    const r = await callClaude(prompt, system, 512);
    const angle_type = ANGULOS.includes(r?.angle_type) ? r.angle_type : 'otro';
    return NextResponse.json({
      angle_type,
      confianza: r?.confianza || 'media',
      razon: (r?.razon || '').toString().slice(0, 300),
    });
  } catch (e) {
    console.error('publicaciones/sugerir-angulo error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
