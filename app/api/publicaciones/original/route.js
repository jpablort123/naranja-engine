import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { CURRENT_PRODUCT_ID } from '@/lib/product';
import { buildUtm } from '@/lib/utm';
import { findByUrl, deriveContentTypeForSibling } from '@/lib/publicaciones';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function newGroupId() {
  try { return require('node:crypto').randomUUID(); }
  catch { return `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
}

// ═══ POST /api/publicaciones/original ═══
// Contenido original (spec §3 Módulo C).
// creation_source='idea_propia', libreto opcional queda como semilla.
// Hermanas por plataforma con content_group_id común.
//
// Body:
//   {
//     origin_type: 'episode'|'manual',
//     origin_id?: <uuid>,       // si origin_type='episode'
//     content_type: 'reel'|'linkedin'|'carrusel'|'corto',
//     angle_type: string,
//     title: string,
//     libreto?: string,
//     links: [{ platform, url }]
//   }
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      origin_type = 'episode',
      origin_id = null,
      content_type = 'reel',
      angle_type,
      title,
      libreto,
      links = [],
    } = body || {};

    if (!title || !angle_type) return NextResponse.json({ error: 'title y angle_type requeridos' }, { status: 400 });
    if (!Array.isArray(links) || links.length === 0) {
      return NextResponse.json({ error: 'al menos un link' }, { status: 400 });
    }

    let origin_label = null;
    if (origin_type === 'episode' && origin_id) {
      const { data } = await db.from('episodes').select('name').eq('id', origin_id).single();
      origin_label = data?.name || null;
    }

    const groupId = newGroupId();
    const now = new Date().toISOString();

    const creadas = [];
    const saltadas = [];
    for (let i = 0; i < links.length; i++) {
      const l = links[i];
      const platform = (l.platform || '').toLowerCase();
      const rawUrl = (l.url || '').trim();
      if (!platform || !rawUrl) continue;

      const dup = await findByUrl(rawUrl, CURRENT_PRODUCT_ID);
      if (dup) {
        saltadas.push({ url: rawUrl, existing_id: dup.id, reason: 'duplicate_url' });
        continue;
      }
      const ct = deriveContentTypeForSibling(content_type, platform);
      const row = {
        title: title.toString().trim(),
        content_type: ct,
        platform,
        published_url: rawUrl,
        origin_type,
        origin_id,
        origin_label,
        angle_type,
        creation_source: 'idea_propia',
        libreto: libreto?.trim() || null,
        status: 'publicada',
        published_at: now,
        content_group_id: groupId,
        product_id: CURRENT_PRODUCT_ID,
        utm_campaign: buildUtm({ originLabel: origin_label || title, contentType: ct, platform }),
      };
      const { data, error } = await db.from('published_items').insert(row).select().single();
      if (error) return NextResponse.json({ error: error.message, creadas, saltadas }, { status: 500 });
      creadas.push(data);
    }

    // Fire-and-forget metrics sync
    const ids = creadas.map(c => c.id);
    if (ids.length > 0) {
      const base = process.env.NEXT_PUBLIC_SITE_URL || `http://localhost:${process.env.PORT || 3000}`;
      fetch(`${base}/api/metrics/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published_item_ids: ids }),
      }).catch(() => {});
    }

    return NextResponse.json({ creadas, saltadas, content_group_id: groupId });
  } catch (e) {
    console.error('publicaciones/original error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
