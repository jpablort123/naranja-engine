import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { buildUtm } from '@/lib/utm';

// Necesita runtime Node para parsear CSV/XLSX y trabajar con text/multipart cómodo.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// ═══ POST /api/published/import ═══
// Recibe el CSV/XLSX de reconstrucción de linaje (spec §5.1) y crea filas en
// published_items. Genera utm_campaign con lib/utm.js. Intenta resolver
// origin_id matcheando origin_label contra episodes/newsletters; si no
// matchea, deja origin_id null y conserva el label.
//
// Formatos aceptados en el body:
//   - JSON: { csv: "<texto CSV>" }
//   - multipart/form-data con file
//   - text/csv directo en el body
//
// Columnas esperadas del CSV (case-insensitive, tolera acentos):
//   madre_tipo, madre, titulo_pieza, tipo_contenido, plataforma,
//   url_publicada, post_id, tipo_angulo, fuente_creacion,
//   fecha_publicacion, notas
export async function POST(req) {
  try {
    const csvText = await readCsv(req);
    if (!csvText || !csvText.trim()) {
      return NextResponse.json({ error: 'CSV vacío o no se pudo leer' }, { status: 400 });
    }

    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeHeader,
    });
    if (parsed.errors?.length) {
      // No abortar si son errores blandos (líneas malas) — reportar los primeros 3.
      console.warn('CSV parse warnings:', parsed.errors.slice(0, 3));
    }
    const rows = parsed.data || [];
    if (rows.length === 0) return NextResponse.json({ error: 'CSV sin filas' }, { status: 400 });

    // Prefetch de episodios/newsletters para resolver origin_id por label.
    const [{ data: episodes }, { data: newsletters }] = await Promise.all([
      db.from('episodes').select('id, name'),
      db.from('newsletters').select('id, name'),
    ]);
    const findByLabel = (list, label) => {
      if (!label) return null;
      const l = label.toString().toLowerCase();
      const hit = (list || []).find(x => (x.name || '').toLowerCase() === l)
        || (list || []).find(x => l.includes((x.name || '').toLowerCase()) || (x.name || '').toLowerCase().includes(l));
      return hit?.id || null;
    };

    const inserts = [];
    let con_madre = 0;
    let sin_madre = 0;
    for (const r of rows) {
      const origin_type = normVal(r.madre_tipo);
      const origin_label = pick(r.madre);
      const title = pick(r.titulo_pieza);
      const content_type = normVal(r.tipo_contenido);
      const platform = normVal(r.plataforma);
      if (!title || !content_type || !platform) continue;
      let origin_id = null;
      if (origin_type === 'episode') origin_id = findByLabel(episodes, origin_label);
      else if (origin_type === 'newsletter') origin_id = findByLabel(newsletters, origin_label);
      if (origin_id) con_madre++;
      else if (origin_type === 'episode' || origin_type === 'newsletter') sin_madre++;

      const utm_campaign = buildUtm({ originLabel: origin_label, contentType: content_type, platform });
      inserts.push({
        title,
        content_type,
        platform,
        published_url: pick(r.url_publicada) || null,
        platform_post_id: pick(r.post_id) || null,
        utm_campaign,
        origin_type: origin_type || null,
        origin_id,
        origin_label: origin_label || null,
        angle_type: pick(r.tipo_angulo) || null,
        creation_source: normVal(r.fuente_creacion) || null,
        published_at: parseDate(r.fecha_publicacion) || null,
      });
    }

    if (inserts.length === 0) {
      return NextResponse.json({ error: 'Ninguna fila válida (revisa columnas)' }, { status: 400 });
    }

    // Insertar en tandas de 200 para evitar payloads gigantes.
    let inserted = 0;
    for (let i = 0; i < inserts.length; i += 200) {
      const chunk = inserts.slice(i, i + 200);
      const { data, error } = await db.from('published_items').insert(chunk).select('id');
      if (error) return NextResponse.json({ error: error.message, insertados_parciales: inserted }, { status: 500 });
      inserted += (data || []).length;
    }

    return NextResponse.json({ importados: inserted, con_madre, sin_madre });
  } catch (e) {
    console.error('published/import error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Header con acentos → snake_case ascii.
function normalizeHeader(h) {
  return (h || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function pick(v) {
  if (v === undefined || v === null) return '';
  return v.toString().trim();
}
function normVal(v) {
  return pick(v).toLowerCase();
}

function parseDate(v) {
  const s = pick(v);
  if (!s) return null;
  // Acepta ISO, dd/mm/yyyy, yyyy-mm-dd
  const iso = new Date(s);
  if (!isNaN(iso.getTime())) return iso.toISOString();
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (m) {
    const day = m[1], mon = m[2];
    let year = m[3];
    if (year.length === 2) year = '20' + year;
    const d = new Date(`${year}-${mon.padStart(2, '0')}-${day.padStart(2, '0')}T12:00:00Z`);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

async function readCsv(req) {
  const ct = (req.headers.get('content-type') || '').toLowerCase();
  if (ct.includes('application/json')) {
    const body = await req.json().catch(() => ({}));
    return body?.csv || '';
  }
  if (ct.includes('multipart/form-data')) {
    const fd = await req.formData();
    const file = fd.get('file');
    if (!file) return '';
    return await file.text();
  }
  // text/csv u otro texto plano
  return await req.text();
}
