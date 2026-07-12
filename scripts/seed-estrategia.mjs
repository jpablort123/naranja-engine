#!/usr/bin/env node
// ═══ Seed del Sprint Estrategia (spec §11) ═══
// Inserta ~10-12 published_items variados sobre 2-3 episodios existentes,
// ~40 subscribers y luego dispara /api/metrics/sync (mock) para que
// Radar/Público/Linaje se vean vivos SIN APIs externas.
//
// USO:
//   node scripts/seed-estrategia.mjs                 # apunta a http://localhost:3000
//   BASE_URL=https://naranja-engine.vercel.app node scripts/seed-estrategia.mjs
//
// Requiere que la migración migrations/sprint-estrategia.sql ya esté aplicada
// y que exista al menos 1 episodio en la tabla `episodes`.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
// spec universo §7 — todo insert debe llevar product_id.
const PRODUCT_ID = process.env.CURRENT_PRODUCT_ID || 'c0000000-0000-4000-8000-000000000001';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Falta NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (usa .env.local).');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const CONTENT_TYPES = ['reel', 'mediano', 'linkedin', 'carrusel', 'corto', 'episodio'];
const PLATFORMS = {
  reel: 'instagram', corto: 'tiktok', linkedin: 'linkedin', carrusel: 'instagram',
  mediano: 'youtube', episodio: 'youtube',
};
const ANGLES = ['errores_mitos', 'tras_la_decision', 'datos_duros', 'historia_personal', 'otro'];
const CREATION = ['sistema', 'idea_propia', 'minado_sistema', 'mixto'];

function slug(s) {
  return (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
}
function utm(originLabel, contentType, platform) {
  return `utm_source=${platform}&utm_medium=${contentType}&utm_campaign=${slug(originLabel) || 'manual'}`;
}
function daysAgoISO(n) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString();
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function main() {
  const { data: eps, error: epErr } = await db.from('episodes').select('id, name').order('created_at', { ascending: false }).limit(3);
  if (epErr) throw new Error(epErr.message);
  if (!eps || eps.length === 0) {
    console.error('No hay episodios en la tabla. Crea al menos uno para poder atribuir el seed.');
    process.exit(1);
  }
  console.log(`Usando ${eps.length} episodio(s):`, eps.map(e => e.name).join(' · '));

  // 1) published_items — mezcla de estados publicada / propuesta / descartada
  //    para poder ver los 3 estados vivos en el Universo (spec universo §11).
  const items = [];
  // spec: [content_type, título, ángulo, creation_source, díasAtrás, status, discardReason?]
  const specs = [
    // Publicadas — mayoría (con métricas del mock)
    ['reel', 'La trampa del ROAS', 'errores_mitos', 'minado_sistema', 2, 'publicada'],
    ['reel', '3 datos que rompen creencias', 'datos_duros', 'sistema', 4, 'publicada'],
    ['carrusel', 'Cómo decidieron cambiar la estrategia', 'tras_la_decision', 'sistema', 5, 'publicada'],
    ['linkedin', 'La confesión de una CMO', 'historia_personal', 'idea_propia', 6, 'publicada'],
    ['mediano', 'Pandemia y 13 marcas', 'datos_duros', 'sistema', 8, 'publicada'],
    ['corto', 'Frase que todo marketer debe escuchar', 'otro', 'sistema', 3, 'publicada'],
    ['reel', 'Mito: el CTR importa más que el LTV', 'errores_mitos', 'mixto', 1, 'publicada'],
    ['episodio', null, null, null, 10, 'publicada'],
    ['carrusel', 'Errores comunes al lanzar producto', 'errores_mitos', 'sistema', 12, 'publicada'],
    ['reel', 'La historia detrás del pivote', 'historia_personal', 'minado_sistema', 9, 'publicada'],
    ['linkedin', 'Datos duros del último año', 'datos_duros', 'idea_propia', 11, 'publicada'],
    // Propuestas — piezas del sistema que aún no se produjeron
    ['reel', 'El momento en el que se equivocaron', 'tras_la_decision', 'sistema', null, 'propuesta'],
    ['mediano', 'Las 3 métricas que sí importan', 'datos_duros', 'sistema', null, 'propuesta'],
    ['linkedin', 'Por qué la audiencia no es un número', 'errores_mitos', 'sistema', null, 'propuesta'],
    // Descartadas — con razón (crean learning draft en el server)
    ['reel', 'Top 5 tips para marketers', 'otro', 'sistema', null, 'descartada',
      'Demasiado genérico — no es lo que hacemos, se siente clickbait.'],
    ['carrusel', 'Cómo hacer growth hacking', 'otro', 'sistema', null, 'descartada',
      'El término no encaja con el editorial. Rechazamos ángulos de "hack".'],
  ];
  for (let i = 0; i < specs.length; i++) {
    const [ct, titleBase, angle, source, days, status, discardReason] = specs[i];
    const ep = eps[i % eps.length];
    const title = titleBase ? `${labelForType(ct)} — ${titleBase}` : `Episodio: ${ep.name}`;
    const platform = PLATFORMS[ct];
    items.push({
      title,
      content_type: ct,
      platform,
      published_url: status === 'publicada' ? `https://example.com/${slug(title) || 'x'}` : null,
      platform_post_id: null,
      utm_campaign: utm(ep.name, ct, platform),
      origin_type: 'episode',
      origin_id: ep.id,
      origin_label: ep.name,
      angle_type: angle,
      creation_source: source,
      status,
      discard_reason: discardReason || null,
      published_at: status === 'publicada' && days != null ? daysAgoISO(days) : null,
      product_id: PRODUCT_ID,
    });
  }
  const { data: inserted, error: pubErr } = await db.from('published_items').insert(items).select('id, status');
  if (pubErr) throw new Error('published_items: ' + pubErr.message);
  const conteo = (inserted || []).reduce((a, x) => (a[x.status] = (a[x.status] || 0) + 1, a), {});
  console.log(`+ ${inserted.length} published_items (${conteo.publicada || 0} publicada, ${conteo.propuesta || 0} propuesta, ${conteo.descartada || 0} descartada)`);

  // 2) subscribers — ~40, fechas repartidas en las últimas 2 semanas
  // Solo atribuye a piezas publicadas (evita atribuir a propuesta/descartada).
  const publicadasIds = (inserted || []).filter(x => x.status === 'publicada').map(x => x.id);
  const subs = [];
  for (let i = 0; i < 40; i++) {
    const days = Math.floor(Math.random() * 14);
    const withEnrich = i < 15;
    subs.push({
      email: `subscriber_${Date.now()}_${i}@example.com`,
      subscribed_at: new Date(new Date().getTime() - days * 24 * 3600 * 1000).toISOString().slice(0, 10),
      source_platform: pick(['newsletter', 'referido', 'orgánico', null]),
      status: withEnrich ? 'clasificado' : 'nuevo',
      cargo: withEnrich ? pick(['CMO', 'Founder', 'Marketing Manager', 'Growth Lead']) : null,
      empresa: withEnrich ? pick(['Rappi', 'Truora', 'Merqueo', 'Habi', 'Chiper']) : null,
      is_target: withEnrich ? true : null,
      attributed_item_id: i < 8 && publicadasIds.length > 0 ? publicadasIds[i % publicadasIds.length] : null,
      product_id: PRODUCT_ID,
    });
  }
  const { error: subErr } = await db.from('subscribers').insert(subs);
  if (subErr) throw new Error('subscribers: ' + subErr.message);
  console.log(`+ ${subs.length} subscribers`);

  // 3) sync mock para poblar metric_snapshots
  console.log(`> disparando ${BASE_URL}/api/metrics/sync (mock)…`);
  try {
    const r = await fetch(`${BASE_URL}/api/metrics/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const j = await r.json();
    console.log('sync:', j);
  } catch (e) {
    console.error('sync falló (asegúrate que el server está corriendo):', e.message);
  }

  console.log('\nListo. Abre /  y navega a Radar / Público / Linaje.');
}

function labelForType(t) {
  return { reel: 'Reel', mediano: 'Mediano', linkedin: 'LinkedIn', carrusel: 'Carrusel', corto: 'Corto', episodio: 'Episodio' }[t] || t;
}

main().catch(e => { console.error(e); process.exit(1); });
