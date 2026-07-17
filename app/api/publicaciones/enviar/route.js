import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { CURRENT_PRODUCT_ID } from '@/lib/product';
import { originRefFor, contentTypeFromSource, defaultPlatformFor } from '@/lib/publicaciones';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const dynamic = 'force-dynamic';

// ═══ POST /api/publicaciones/enviar ═══
// Puente producción → propuesta (spec §3, Módulo A).
// Crea 1..N filas en `published_items` con status='propuesta' heredando la
// madre + ángulo + creation_source='sistema'. Idempotente por `origin_ref`.
//
// Body:
//   {
//     episode_id: <uuid>,
//     items: [
//       {
//         source: 'mediano'|'minado'|'reel'|'linkedin'|'carrusel'|'intro',
//         ref: string,                // id local del ítem (ej. 'm3' del mediano, '7' del minado)
//         title: string,              // gancho / título editorial
//         angle_type: string|null,    // heredado del ítem si existe
//         status: 'propuesta'|'descartada'   // (Módulo D: descartar directo)
//         discard_reason?: string,
//         platform_hint?: string,     // opcional, para adivinar plataforma default
//       }, ...
//     ]
//   }
//
// Devuelve:
//   { creadas: [{ id, origin_ref }], saltadas: [{ origin_ref, existing_id }] }
export async function POST(req) {
  try {
    const body = await req.json();
    const { episode_id, items } = body || {};
    if (!episode_id || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'episode_id + items requeridos' }, { status: 400 });
    }

    const { data: ep, error: epErr } = await db
      .from('episodes')
      .select('id, name')
      .eq('id', episode_id)
      .single();
    if (epErr || !ep) return NextResponse.json({ error: 'episodio no encontrado' }, { status: 404 });

    // Dedupe por origin_ref: consulta primero los que ya existen para no
    // insertar duplicados si la PM re-envía el mismo ítem desde producción.
    const refs = items.map(it => originRefFor({ episode_id, source: it.source, ref: it.ref }));
    const { data: existing = [] } = await db
      .from('published_items')
      .select('id, origin_ref')
      .in('origin_ref', refs)
      .eq('product_id', CURRENT_PRODUCT_ID);
    const existingByRef = new Map((existing || []).map(x => [x.origin_ref, x.id]));

    const creadas = [];
    const saltadas = [];
    const rows = [];
    for (const it of items) {
      const origin_ref = originRefFor({ episode_id, source: it.source, ref: it.ref });
      if (existingByRef.has(origin_ref)) {
        saltadas.push({ origin_ref, existing_id: existingByRef.get(origin_ref), reason: 'duplicate' });
        continue;
      }
      const status = it.status === 'descartada' ? 'descartada' : 'propuesta';
      const content_type = contentTypeFromSource(it.source);
      const platform = it.platform_hint || defaultPlatformFor(it.source);
      rows.push({
        title: (it.title || '').toString().trim() || '(sin título)',
        content_type,
        platform,
        origin_type: 'episode',
        origin_id: episode_id,
        origin_label: ep.name,
        angle_type: it.angle_type || null,
        creation_source: 'sistema',
        status,
        discard_reason: status === 'descartada' ? (it.discard_reason || null) : null,
        origin_ref,
        product_id: CURRENT_PRODUCT_ID,
      });
    }

    if (rows.length > 0) {
      const { data, error } = await db.from('published_items').insert(rows).select('id, origin_ref');
      if (error) return NextResponse.json({ error: error.message, saltadas }, { status: 500 });
      (data || []).forEach(r => creadas.push({ id: r.id, origin_ref: r.origin_ref }));
    }

    return NextResponse.json({ creadas, saltadas });
  } catch (e) {
    console.error('publicaciones/enviar error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
