// ═══ Provider Spotify — STUB (spec §4.4) ═══
// Spotify NO tiene API oficial de analíticas de creador.
// Estrategia: dejar el stub retornando [] y llenar a mano (CSV / captura de
// Spotify for Podcasters).
//
// TODO opcional: si en el futuro aparece un mecanismo (scraping autorizado
// o Spotify for Podcasters con OAuth), implementar aquí.
// item.platform_post_id = episode uri (ej. spotify:episode:xxxx).

export const platforms = ['spotify'];

export async function fetchMetrics(item) {
  // No hay API oficial. Se llena a mano. Devolvemos [] para no fallar.
  return [];
}
