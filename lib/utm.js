// ═══ Generador de UTM ═══
// spec §4.5 — usado por POST /api/published y por el importer.
export function buildUtm({ originLabel, contentType, platform }) {
  const slug = (originLabel || 'manual')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    // combining diacritical marks range ̀-ͯ
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24)
    .replace(/^-|-$/g, '');
  const src = (platform || 'manual').toLowerCase();
  const med = (contentType || 'manual').toLowerCase();
  return `utm_source=${src}&utm_medium=${med}&utm_campaign=${slug || 'manual'}`;
}
