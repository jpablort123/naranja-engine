import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { CURRENT_PRODUCT_ID } from '@/lib/product';
import { buildUtm } from '@/lib/utm';
import { normalizeUrl, findByUrl, deriveContentTypeForSibling } from '@/lib/publicaciones';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// crypto.randomUUID en Node >= 19; fallback simple si no está.
function newGroupId() {
  try {
    return require('node:crypto').randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

// ═══ POST /api/publicaciones/publicar ═══
// Marca una propuesta como publicada y crea hermanas si vienen varios links
// (mismo video en varias redes, spec §3 Módulo B/E).
//
// Body:
//   {
//     proposal_id: <uuid>,          // opcional: si la publicación viene de una propuesta
//     episode_id?: <uuid>,          // para "episodio al aire" sin propuesta previa
//     links: [
//       { platform: 'instagram'|'linkedin'|'tiktok'|'youtube'|'spotify', url: '...' }
//     ],
//     content_type_override?: string, // solo para episodio-al-aire
//     title_override?: string,
//   }
//
// Reglas:
//   - Dedupe por URL: si ya existe una pieza publicada con esa URL normalizada,
//     NO crear duplicado; devolver la existente como skipped.
//   - Todas las piezas creadas comparten `content_group_id` (nuevo UUID si son
//     ≥2 links; si es 1 solo también se le asigna, para poder crecer luego).
//   - Se copia origin_type/origin_id/origin_label/angle_type/creation_source
//     de la propuesta (o del episodio si es episodio-al-aire).
//   - Se genera utm_campaign para cada pieza.
//   - Se dispara metrics/sync best-effort para levantar métricas al instante.
export async function POST(req) {
  try {
    const body = await req.json();
    const { proposal_id, episode_id, links = [], content_type_override, title_override } = body || {};
    if (!Array.isArray(links) || links.length === 0) {
      return NextResponse.json({ error: 'links requeridos' }, { status: 400 });
    }
    // Validar links mínimos
    const linkValid = links.every(l => l && l.platform && l.url && l.url.trim());
    if (!linkValid) return NextResponse.json({ error: 'cada link necesita platform y url' }, { status: 400 });

    let proposal = null;
    let hostEp = null;
    if (proposal_id) {
      const { data, error } = await db.from('published_items').select('*').eq('id', proposal_id).single();
      if (error || !data) return NextResponse.json({ error: 'propuesta no encontrada' }, { status: 404 });
      proposal = data;
    } else if (episode_id) {
      const { data } = await db.from('episodes').select('id, name').eq('id', episode_id).single();
      if (!data) return NextResponse.json({ error: 'episodio no encontrado' }, { status: 404 });
      hostEp = data;
    } else {
      return NextResponse.json({ error: 'proposal_id o episode_id requerido' }, { status: 400 });
    }

    const commonOrigin = proposal ? {
      origin_type: proposal.origin_type,
      origin_id: proposal.origin_id,
      origin_label: proposal.origin_label,
      angle_type: proposal.angle_type,
      creation_source: proposal.creation_source || 'sistema',
      title: title_override || proposal.title,
    } : {
      origin_type: 'episode',
      origin_id: hostEp.id,
      origin_label: hostEp.name,
      angle_type: null,
      creation_source: 'sistema',
      title: title_override || hostEp.name,
    };

    const baseContentType = content_type_override || proposal?.content_type || 'reel';
    const groupId = newGroupId();
    const now = new Date().toISOString();

    // Recorremos los links. Para el primero:
    //  - si hay propuesta, actualizamos la propuesta a status='publicada' con
    //    su URL, en lugar de crear una fila nueva (evita huérfanos).
    //  - si no hay propuesta (episodio-al-aire), creamos la primera fila.
    // Para los siguientes: hermanas nuevas, siempre INSERT con el mismo group_id.
    const creadas = [];
    const saltadas = [];

    for (let i = 0; i < links.length; i++) {
      const l = links[i];
      const platform = l.platform.toLowerCase();
      const rawUrl = l.url.trim();
      const contentType = deriveContentTypeForSibling(baseContentType, platform);

      // Dedupe por URL (spec §3 dedupe explícito).
      const exists = await findByUrl(rawUrl, CURRENT_PRODUCT_ID);
      if (exists) {
        saltadas.push({ url: rawUrl, existing_id: exists.id, reason: 'duplicate_url' });
        continue;
      }

      const utm = buildUtm({
        originLabel: commonOrigin.origin_label,
        contentType,
        platform,
      });
      const baseRow = {
        ...commonOrigin,
        content_type: contentType,
        platform,
        published_url: rawUrl,
        utm_campaign: utm,
        status: 'publicada',
        published_at: now,
        content_group_id: groupId,
        product_id: CURRENT_PRODUCT_ID,
      };

      // Primer link + hay propuesta → actualizar la propuesta.
      if (i === 0 && proposal && proposal.status === 'propuesta') {
        const { data, error } = await db
          .from('published_items')
          .update({
            ...baseRow,
            // no pisar el título de la propuesta si no vino override
            title: title_override || proposal.title,
            updated_at: now,
          })
          .eq('id', proposal.id)
          .select()
          .single();
        if (error) return NextResponse.json({ error: error.message, creadas, saltadas }, { status: 500 });
        creadas.push(data);
        continue;
      }

      // Resto: INSERT como hermanas.
      const { data, error } = await db
        .from('published_items')
        .insert({ ...baseRow, title: commonOrigin.title })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message, creadas, saltadas }, { status: 500 });
      creadas.push(data);
    }

    // Fire-and-forget: siembra métricas para las piezas nuevas.
    const ids = creadas.map(c => c.id);
    if (ids.length > 0) {
      const base = process.env.NEXT_PUBLIC_SITE_URL || `http://localhost:${process.env.PORT || 3000}`;
      fetch(`${base}/api/metrics/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published_item_ids: ids }),
      }).catch(() => {});
    }

    return NextResponse.json({
      creadas,
      saltadas,
      content_group_id: groupId,
    });
  } catch (e) {
    console.error('publicaciones/publicar error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
