// ═══ Provider MOCK ═══ (spec §4.3)
// Genera métricas deterministas a partir de un hash del id de la pieza.
// Objetivo: que la UI del Radar/Linaje/Público se vea VIVA sin APIs.
// El mismo item devuelve siempre los mismos números → estable entre recargas.
//
// Rango por content_type:
//   reel / corto     : reach 3k–60k, engagement 2.5–7%
//   mediano / episodio: views 2k–12k, watch_time, engagement 4–6%
//   linkedin         : impressions 2k–10k, engagement 4–6%
//   carrusel         : reach 2k–8k, engagement 3–5%
//   newsletter       : impressions 1k–8k, engagement 6–10%

export const platforms = ['youtube', 'instagram', 'linkedin', 'spotify', 'tiktok'];

// Hash 32-bit determinista sobre un string (djb2).
function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function rand(seed, offset = 0) {
  // LCG chiquito determinista sobre el seed base
  const x = ((seed + offset) * 1103515245 + 12345) & 0x7fffffff;
  return x / 0x7fffffff;
}

function inRange(seed, offset, min, max) {
  const r = rand(seed, offset);
  return Math.round(min + r * (max - min));
}

// El "alcance principal" según plataforma
function reachMetric(platform) {
  if (platform === 'linkedin') return 'impressions';
  if (platform === 'youtube' || platform === 'spotify') return 'views';
  return 'reach';
}

export async function fetchMetrics(item) {
  if (!item || !item.id) return [];
  const seed = hash(String(item.id));
  const ct = (item.content_type || '').toLowerCase();
  const platform = (item.platform || '').toLowerCase();
  const reachName = reachMetric(platform);
  let reach, engagement, watchTime = null;

  switch (ct) {
    case 'reel':
    case 'corto':
      reach = inRange(seed, 1, 3000, 60000);
      engagement = 2.5 + rand(seed, 2) * 4.5; // 2.5 – 7
      break;
    case 'mediano':
    case 'episodio':
      reach = inRange(seed, 1, 2000, 12000);
      engagement = 4 + rand(seed, 2) * 2; // 4 – 6
      watchTime = inRange(seed, 3, 60, 480); // segundos
      break;
    case 'linkedin':
      reach = inRange(seed, 1, 2000, 10000);
      engagement = 4 + rand(seed, 2) * 2;
      break;
    case 'carrusel':
      reach = inRange(seed, 1, 2000, 8000);
      engagement = 3 + rand(seed, 2) * 2;
      break;
    case 'newsletter':
      reach = inRange(seed, 1, 1000, 8000);
      engagement = 6 + rand(seed, 2) * 4;
      break;
    default:
      reach = inRange(seed, 1, 1000, 20000);
      engagement = 3 + rand(seed, 2) * 4;
  }

  const likes = Math.round(reach * (engagement / 100) * 0.65);
  const comments = Math.round(reach * (engagement / 100) * 0.15);
  const shares = Math.round(reach * (engagement / 100) * 0.12);
  const saves = Math.round(reach * (engagement / 100) * 0.08);

  const out = [
    { metric: reachName, value: reach },
    { metric: 'engagement_rate', value: Math.round(engagement * 100) / 100 },
    { metric: 'likes', value: likes },
    { metric: 'comments', value: comments },
    { metric: 'shares', value: shares },
    { metric: 'saves', value: saves },
  ];
  if (watchTime != null) out.push({ metric: 'watch_time', value: watchTime });
  return out;
}
