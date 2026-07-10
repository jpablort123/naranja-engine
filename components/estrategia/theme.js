// ═══ Theme del Sprint Estrategia ═══
// Reexporta la paleta base + agrega los colores usados por Radar/Público/Linaje
// que no estaban en components/ui.jsx.
export const O = '#EA580C';   // acento primario
export const OL = '#FFF7ED';  // orange-50
export const OB = '#FED7AA';  // orange-200
export const GR = '#16A34A';  // success
export const GL = '#F0FDF4';  // success-50
export const MU = '#78716A';  // muted text (stone-500)
export const BG = '#FAFAF9';  // fondo cálido
export const BORDER = '#E7E5E4'; // borders
export const DARK = '#18181B'; // sidebar / madre en Linaje
export const AMBER = '#EF9F27'; // strength: medio
export const GRAY_STRENGTH = '#D6D3D1'; // strength: debil
export const LILA = '#7C3AED';  // barras "por ángulo"
export const LILA_L = '#FAF5FF';
export const LILA_B = '#E9D5FF';

// Fondos por card de métrica (spec §7 zona A)
export const CARD_ORANGE = '#FFF7ED';
export const CARD_SUCCESS = '#F0FDF4';
export const CARD_NEUTRAL = '#F5F5F4';

export const CONTENT_TYPE_LABEL = {
  reel: 'Reel',
  mediano: 'Mediano',
  linkedin: 'LinkedIn',
  carrusel: 'Carrusel',
  corto: 'Corto',
  episodio: 'Episodio',
  newsletter: 'Newsletter',
};
export const PLATFORM_LABEL = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  spotify: 'Spotify',
  tiktok: 'TikTok',
};
export const ANGLE_TYPE_OPTIONS = [
  { value: 'errores_mitos', label: 'Errores/mitos' },
  { value: 'tras_la_decision', label: 'Tras la decisión' },
  { value: 'datos_duros', label: 'Datos duros' },
  { value: 'historia_personal', label: 'Historia personal' },
  { value: 'otro', label: 'Otro' },
];
export const ANGLE_TYPE_LABEL = ANGLE_TYPE_OPTIONS.reduce((acc, o) => (acc[o.value] = o.label, acc), {});
export const CREATION_SOURCE_OPTIONS = [
  { value: 'sistema', label: 'Sistema' },
  { value: 'idea_propia', label: 'Idea propia' },
  { value: 'minado_sistema', label: 'Minado del sistema' },
  { value: 'mixto', label: 'Mixto' },
];
