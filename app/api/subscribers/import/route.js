import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { CURRENT_PRODUCT_ID, withProductPayload } from '@/lib/product';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ═══ POST /api/subscribers/import ═══
// CSV de Substack. Upsert por email. Nuevos entran con status='nuevo',
// is_target=null. (§5.3)
//
// Substack exporta con headers: "email", "active_subscription", "created_at",
// "expiry", "email_disabled", "state" (dependiendo de la exportación).
// Tomamos email + fecha de suscripción. Todos los demás campos manuales.
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
    const rows = parsed.data || [];
    if (rows.length === 0) return NextResponse.json({ error: 'CSV sin filas' }, { status: 400 });

    // Todos los emails ya existentes → mapa para saber cuáles son nuevos.
    const emails = rows.map(r => pick(r.email).toLowerCase()).filter(Boolean);
    const uniqueEmails = [...new Set(emails)];
    if (uniqueEmails.length === 0) return NextResponse.json({ error: 'CSV sin columna email' }, { status: 400 });

    const { data: existing } = await db.from('subscribers').select('id, email').in('email', uniqueEmails);
    const existingSet = new Set((existing || []).map(x => x.email.toLowerCase()));

    const toUpsert = [];
    const seen = new Set();
    for (const r of rows) {
      const email = pick(r.email).toLowerCase();
      if (!email || seen.has(email)) continue;
      seen.add(email);
      const subscribed_at = parseDate(r.created_at || r.subscribed_at || r.fecha || r.suscripcion) || null;
      toUpsert.push({
        email,
        subscribed_at,
        source_platform: pick(r.source_platform) || null,
        status: 'nuevo',
        product_id: CURRENT_PRODUCT_ID,
      });
    }

    if (toUpsert.length === 0) {
      return NextResponse.json({ importados: 0, nuevos: 0, actualizados: 0 });
    }

    // Upsert por email → conserva id/enriquecimiento existente.
    let inserted = 0;
    for (let i = 0; i < toUpsert.length; i += 500) {
      const chunk = toUpsert.slice(i, i + 500);
      const { data, error } = await db
        .from('subscribers')
        .upsert(chunk, { onConflict: 'email', ignoreDuplicates: false })
        .select('id, email');
      if (error) return NextResponse.json({ error: error.message, insertados_parciales: inserted }, { status: 500 });
      inserted += (data || []).length;
    }

    const nuevos = toUpsert.filter(x => !existingSet.has(x.email)).length;
    const actualizados = toUpsert.length - nuevos;
    return NextResponse.json({ importados: toUpsert.length, nuevos, actualizados });
  } catch (e) {
    console.error('subscribers/import error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function normalizeHeader(h) {
  return (h || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}
function pick(v) { return v === undefined || v === null ? '' : v.toString().trim(); }
function parseDate(v) {
  const s = pick(v); if (!s) return null;
  const iso = new Date(s); if (!isNaN(iso.getTime())) return iso.toISOString().slice(0, 10);
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (m) {
    const day = m[1], mon = m[2]; let year = m[3];
    if (year.length === 2) year = '20' + year;
    const d = new Date(`${year}-${mon.padStart(2, '0')}-${day.padStart(2, '0')}T12:00:00Z`);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
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
  return await req.text();
}
