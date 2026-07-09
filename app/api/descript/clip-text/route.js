import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// ═══ GET /api/descript/clip-text ═══
// Query: episode_id, inicio, cierre
//
// Lee `episodes.transcript_srt`, lo convierte a texto plano (quita índices y
// timestamps) y devuelve el texto verbatim comprendido entre la frase de
// inicio y la de cierre (inclusive). Match laxo: case-insensitive, colapsando
// espacios y tolerando muletillas o signos de puntuación en el medio.
//
// Si no se encuentra alguna de las dos anclas, devuelve
//   inicio + " […] " + cierre
// (respuesta útil para la UI, no un error).
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const episode_id = searchParams.get('episode_id');
    const inicio = (searchParams.get('inicio') || '').trim();
    const cierre = (searchParams.get('cierre') || '').trim();
    if (!episode_id || !inicio || !cierre) {
      return NextResponse.json({ error: 'episode_id, inicio y cierre requeridos' }, { status: 400 });
    }

    const { data: ep, error } = await db
      .from('episodes')
      .select('transcript_srt, transcript')
      .eq('id', episode_id)
      .single();
    if (error || !ep) return NextResponse.json({ error: 'episodio no encontrado' }, { status: 404 });

    const srt = ep.transcript_srt || '';
    const plano = srt ? srtToPlain(srt) : (ep.transcript || '');
    if (!plano) return NextResponse.json({ text: fallback(inicio, cierre) });

    const text = findBetween(plano, inicio, cierre);
    if (text) return NextResponse.json({ text, matched: true });
    return NextResponse.json({ text: fallback(inicio, cierre), matched: false });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Convierte SRT en texto plano preservando el orden y respiración de párrafos:
// - descarta líneas de índice (solo dígitos)
// - descarta líneas de timestamps (contienen '-->')
// - une los bloques con un espacio; párrafos vacíos se convierten en salto
function srtToPlain(srt) {
  const lines = srt.split(/\r?\n/);
  const out = [];
  let buf = [];
  const flush = () => {
    if (buf.length > 0) {
      out.push(buf.join(' '));
      buf = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (/^\d+$/.test(line)) continue;
    if (/-->/.test(line)) continue;
    buf.push(line);
  }
  flush();
  return out.join('\n');
}

// Normaliza para el match: lowercase, sin puntuación, colapsando espacios.
// Guarda además una tabla de offsets para poder mapear el índice normalizado
// de vuelta al texto original.
function normalize(s) {
  const original = s || '';
  const map = []; // map[iNorm] = iOrig
  let norm = '';
  for (let i = 0; i < original.length; i++) {
    const ch = original[i];
    const low = ch.toLowerCase();
    if (/[\s\n\r]/.test(low)) {
      // Colapsar: sólo agregar un espacio si el último no fue espacio.
      if (norm.length > 0 && norm[norm.length - 1] !== ' ') {
        norm += ' ';
        map.push(i);
      }
    } else if (/[a-z0-9áéíóúñü]/.test(low)) {
      norm += low;
      map.push(i);
    } else {
      // Signos de puntuación: tratarlos como separadores, pero no duplicar espacio.
      if (norm.length > 0 && norm[norm.length - 1] !== ' ') {
        norm += ' ';
        map.push(i);
      }
    }
  }
  // Quitar espacio final para no romper indexOf con anclas exactas.
  if (norm.endsWith(' ')) {
    norm = norm.slice(0, -1);
    map.pop();
  }
  return { norm, map, original };
}

// Busca la frase en el texto normalizado y devuelve [start, end] del *original*.
// Si no encuentra la frase entera, intenta con las primeras N palabras
// (tolerante a muletillas al final). Devuelve null si tampoco así hay match.
function locate(plain, phrase, { fromIdx = 0, asEnd = false } = {}) {
  const P = normalize(phrase).norm;
  if (!P) return null;
  const T = plain.norm;
  const fromNorm = fromIdx > 0 ? mapOrigToNorm(plain, fromIdx) : 0;

  // 1) intento directo
  let hitNorm = T.indexOf(P, fromNorm);
  if (hitNorm === -1) {
    // 2) intento con las primeras N palabras (mín 4) — tolera muletillas.
    const words = P.split(' ');
    for (let n = words.length - 1; n >= Math.min(4, words.length); n--) {
      const shorter = words.slice(0, n).join(' ');
      hitNorm = T.indexOf(shorter, fromNorm);
      if (hitNorm !== -1) {
        // Ajustar el "fin" del match al largo de esa subcadena.
        const startOrig = plain.map[hitNorm];
        const endNorm = hitNorm + shorter.length - 1;
        const endOrig = plain.map[endNorm] ?? plain.original.length - 1;
        return { start: startOrig, end: endOrig };
      }
    }
    return null;
  }
  const startOrig = plain.map[hitNorm];
  const endNorm = hitNorm + P.length - 1;
  const endOrig = plain.map[endNorm] ?? plain.original.length - 1;
  return { start: startOrig, end: endOrig };
}

// Dado un índice en el original, encontrar el índice normalizado equivalente.
function mapOrigToNorm(plain, iOrig) {
  for (let iN = 0; iN < plain.map.length; iN++) {
    if (plain.map[iN] >= iOrig) return iN;
  }
  return plain.map.length;
}

function findBetween(plainText, inicio, cierre) {
  const plain = normalize(plainText);
  const startHit = locate(plain, inicio);
  if (!startHit) return null;
  // Buscar el cierre a partir del inicio del match (no del final, por si se solapan).
  const endHit = locate(plain, cierre, { fromIdx: startHit.start });
  if (!endHit) return null;
  const from = startHit.start;
  const to = Math.max(endHit.end + 1, startHit.end + 1);
  // Extraer del original y colapsar espacios múltiples para presentación.
  return plainText.slice(from, to).replace(/\s+/g, ' ').trim();
}

function fallback(inicio, cierre) {
  return `${inicio} […] ${cierre}`;
}
