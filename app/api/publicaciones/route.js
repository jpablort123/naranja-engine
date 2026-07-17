import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { withProduct, CURRENT_PRODUCT_ID } from '@/lib/product';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const dynamic = 'force-dynamic';

// ═══ GET /api/publicaciones ═══
// Lista lo que la PM necesita para reconciliar publicaciones (spec §3, Módulo B):
//   - Propuestas abiertas del producto (status='propuesta'), ordenadas por fecha
//     del episodio origen (más nuevos arriba).
//   - Episodios "al aire" sin registrar: existen en `episodes` pero NO tienen
//     una `published_items` con content_type='episodio' publicada → la card
//     madre está vacía (spec §3 Módulo F).
//
// Query opcional:
//   ?episode_id=<uuid>  → filtra a un solo episodio.
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const episodeFilter = searchParams.get('episode_id');

    // 1) Propuestas abiertas
    let q = withProduct(
      db.from('published_items').select('*').eq('status', 'propuesta').order('created_at', { ascending: false })
    );
    if (episodeFilter) q = q.eq('origin_id', episodeFilter);
    const { data: propuestas = [], error: err1 } = await q;
    if (err1) return NextResponse.json({ error: err1.message }, { status: 500 });

    // 2) Episodios sin registrar (spec Módulo F).
    // "Sin registrar" = no hay un published_items con content_type='episodio'
    // status='publicada' que apunte a ese episodio.
    let epsQ = withProduct(db.from('episodes').select('id, name, created_at').order('created_at', { ascending: false }));
    if (episodeFilter) epsQ = epsQ.eq('id', episodeFilter);
    const { data: eps = [] } = await epsQ;

    const { data: epPieces = [] } = await withProduct(
      db
        .from('published_items')
        .select('origin_id, platform')
        .eq('content_type', 'episodio')
        .eq('status', 'publicada')
    );
    const registrados = new Set((epPieces || []).map(p => `${p.origin_id}|${p.platform}`));
    const episodiosSinRegistrar = (eps || [])
      .map(e => {
        const enYoutube = registrados.has(`${e.id}|youtube`);
        const enSpotify = registrados.has(`${e.id}|spotify`);
        return {
          id: e.id,
          label: e.name,
          created_at: e.created_at,
          youtube_registrado: enYoutube,
          spotify_registrado: enSpotify,
        };
      })
      // Al menos una plataforma sin registrar. Si ambas ya están, se oculta.
      .filter(e => !(e.youtube_registrado && e.spotify_registrado));

    // 3) Contexto de nombres de episodios (para mostrar la madre de cada propuesta).
    const epsByIdRaw = (eps || []).reduce((acc, e) => (acc[e.id] = e, acc), {});

    return NextResponse.json({
      propuestas,
      episodios_sin_registrar: episodiosSinRegistrar,
      episodios_index: epsByIdRaw,
    });
  } catch (e) {
    console.error('publicaciones GET error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
