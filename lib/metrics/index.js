// ═══ Selector de provider de métricas ═══
// spec §4.2 — enruta cada plataforma a su provider real cuando
// METRICS_PROVIDER != 'mock'. Con mock (default), todo pasa por mock.
// Todos los providers exponen el mismo contrato:
//   fetchMetrics(item) => Promise<[{ metric, value }]>
//   platforms: string[]
import * as mock from './mock';
import * as youtube from './youtube';
import * as metricool from './metricool';
import * as spotify from './spotify';

const PROVIDER = process.env.METRICS_PROVIDER || 'mock';

export async function fetchMetricsForItem(item) {
  if (PROVIDER === 'mock') return mock.fetchMetrics(item);
  const byPlatform = {
    youtube,
    spotify,
    instagram: metricool,
    linkedin: metricool,
    tiktok: metricool,
  };
  const provider = byPlatform[item?.platform];
  // Plataformas sin provider (substack para newsletters, etc.) devuelven [].
  // NO caen al mock — si no hay integración real, mejor "sin métrica" que
  // "métrica falsa". El mock solo se usa cuando METRICS_PROVIDER='mock'
  // explícito.
  if (!provider) return [];
  try {
    return await provider.fetchMetrics(item);
  } catch (e) {
    console.error('metrics provider error', item?.platform, e);
    return [];
  }
}

// Exponer también helpers de mock para el seed / debug.
export { mock };
