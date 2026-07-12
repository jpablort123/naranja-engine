// ═══════════════════════════════════════════════════════════════════════════
// DATOS DEMO — Aprendizajes del mes (spec universo §6)
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️  ESTE ARCHIVO ES 100% INVENTADO / HARDCODEADO.
//     Sirve como preview vendible de "hacia dónde va" el módulo Narrar.
//     El motor real que CALCULA insights a partir de metric_snapshots +
//     published_items + subscribers NO se construye en este sprint.
//
//     Cada insight lleva `isDemo: true` para que si alguna vez esto se
//     mezcla con datos reales quede claro cuál es cuál. La UI también
//     lo marca con un chip sutil removible.
//
// Formato de cada insight:
//   {
//     id, eyebrow, titular, subtexto,
//     viz: { type: 'bars', unit, series: [{ label, value, color? }] },
//     recomendacion,
//     isDemo: true,
//   }
// ═══════════════════════════════════════════════════════════════════════════

export const APRENDIZAJES_DEMO_MES = 'Julio 2026';

export const APRENDIZAJES_DEMO = [
  {
    id: 'formato',
    eyebrow: 'LO CONTRAINTUITIVO DEL MES',
    titular: 'Tu formato más largo es el que mejor convierte.',
    subtexto:
      'Los medianos trajeron 2.4× más suscriptores por pieza que los reels, con 5× menos alcance total. El volumen no fue el que trajo la comunidad.',
    viz: {
      type: 'bars',
      unit: 'suscriptores por pieza',
      series: [
        { label: 'Reel', value: 1.2, color: '#FED7AA' },
        { label: 'Mediano', value: 2.9, color: '#EA580C' },
        { label: 'LinkedIn', value: 0.8, color: '#FED7AA' },
      ],
    },
    recomendacion:
      'Subir la cadencia de medianos (uno cada dos semanas) y bajar el volumen puro de reels. La profundidad está atrayendo mejor que el brillo.',
    isDemo: true,
  },
  {
    id: 'concentracion',
    eyebrow: 'DONDE VIVE EL PICO',
    titular: 'El 60% de tu alcance vino de 3 piezas.',
    subtexto:
      'De las 24 piezas del mes, 3 concentraron la mayoría del alcance. Las tres compartían el mismo formato (medianos con invitada CMO).',
    viz: {
      type: 'bars',
      unit: 'alcance acumulado',
      series: [
        { label: 'Top 3 piezas', value: 60, color: '#EA580C' },
        { label: 'Resto (21 piezas)', value: 40, color: '#FED7AA' },
      ],
    },
    recomendacion:
      'Estudiar qué tienen en común esas 3 piezas — no para replicar la forma sino para repetir la condición (invitada de decisión, tema con tensión).',
    isDemo: true,
  },
  {
    id: 'angulo',
    eyebrow: 'EL ÁNGULO QUE ENGANCHA',
    titular: 'Los ángulos de "errores/mitos" rinden el doble.',
    subtexto:
      'Engagement promedio de 6.1% vs 3.0% del resto. Tres de tus mejores piezas del mes usaron ese ángulo, y NO fueron las más largas.',
    viz: {
      type: 'bars',
      unit: 'engagement %',
      series: [
        { label: 'Errores/mitos', value: 6.1, color: '#7C3AED' },
        { label: 'Datos duros', value: 3.4, color: '#E9D5FF' },
        { label: 'Tras la decisión', value: 3.1, color: '#E9D5FF' },
        { label: 'Historia personal', value: 2.8, color: '#E9D5FF' },
      ],
    },
    recomendacion:
      'Priorizar el ángulo "errores/mitos" en el próximo episodio. Es el que reta el consenso — por eso engancha.',
    isDemo: true,
  },
  {
    id: 'cadencia',
    eyebrow: 'EL RITMO SE ENFRIÓ',
    titular: 'Publicaste 8 piezas — el mes pasado fueron 14.',
    subtexto:
      'La caída del volumen coincide con dos semanas sin episodio nuevo. Los universos se enfrían rápido: sin madre nueva, las piezas viejas dejan de traer.',
    viz: {
      type: 'bars',
      unit: 'piezas',
      series: [
        { label: 'Mayo', value: 12, color: '#FED7AA' },
        { label: 'Junio', value: 14, color: '#FED7AA' },
        { label: 'Julio', value: 8, color: '#EA580C' },
      ],
    },
    recomendacion:
      'Volver a 2 episodios/mes como mínimo. La cadencia importa más que el brillo de una pieza suelta.',
    isDemo: true,
  },
  {
    id: 'plataforma',
    eyebrow: 'ASPIRACIONAL · DEMO',
    titular: 'LinkedIn te trae menos alcance pero mejor audiencia.',
    subtexto:
      '(Statement de futuro: cuando activemos la capa de identidad, LinkedIn debería medirse por perfil del suscriptor, no por reach. Los 3 CMOs que entraron por LinkedIn no habrían aparecido en un ranking de alcance.)',
    viz: {
      type: 'bars',
      unit: 'quality score (aspiracional)',
      series: [
        { label: 'LinkedIn', value: 8.2, color: '#EA580C' },
        { label: 'Instagram', value: 5.4, color: '#FED7AA' },
        { label: 'YouTube', value: 6.9, color: '#FED7AA' },
        { label: 'TikTok', value: 4.1, color: '#FED7AA' },
      ],
    },
    recomendacion:
      'Invertir el criterio en LinkedIn: menos volumen, más criterio. No es un canal de reach; es un canal de identidad.',
    isDemo: true,
  },
  {
    id: 'madre',
    eyebrow: 'EL PERFIL QUE ABRE UNIVERSO',
    titular: 'El episodio con invitada CMO generó 2× más universo.',
    subtexto:
      'Un solo episodio (Sofía Realpe · CMO Rappi) generó 14 piezas publicadas, 62k alcance y 7 suscriptores atribuidos. El promedio del mes fue la mitad.',
    viz: {
      type: 'bars',
      unit: 'alcance total del universo',
      series: [
        { label: 'Ep. Sofía Realpe', value: 62, color: '#EA580C' },
        { label: 'Ep. promedio', value: 28, color: '#FED7AA' },
        { label: 'Ep. más pequeño', value: 12, color: '#FED7AA' },
      ],
    },
    recomendacion:
      'El perfil de invitado importa: quien decide, no quien solo ejecuta. Priorizar invitados con seniority de decisión en próximos episodios.',
    isDemo: true,
  },
  {
    id: 'identidad',
    eyebrow: 'ASPIRACIONAL · DEMO',
    titular: '3 tomadores de decisión entraron por un solo mediano.',
    subtexto:
      '(Statement de futuro: cuando activemos la capa de identidad, este es el tipo de insight que buscamos — no cuántos, sino QUIÉNES. Un mediano atrajo a Silvi (CMO Rappi), Andrés (CMO Truora) y Manu (Founder Chiper).)',
    viz: {
      type: 'bars',
      unit: 'CMOs / decisores atraídos',
      series: [
        { label: 'Mediano ganador', value: 3, color: '#EA580C' },
        { label: 'Resto de piezas', value: 0.4, color: '#FED7AA' },
      ],
    },
    recomendacion:
      'La profundidad atrae a quien importa. Cuando encendamos identidad, este es el eje que vamos a mirar primero.',
    isDemo: true,
  },
  {
    id: 'cierre',
    eyebrow: 'LA APUESTA DEL MES QUE VIENE',
    titular: 'Este mes: menos volumen, más profundidad.',
    subtexto:
      'La lectura junta lo de arriba: los formatos más largos convierten mejor, "errores/mitos" es el ángulo que engancha, y la cadencia importa. El mes que viene: 2 episodios con invitados de decisión + 3 medianos afilados alrededor de errores/mitos.',
    viz: {
      type: 'bars',
      unit: 'apuesta de piezas',
      series: [
        { label: 'Medianos afilados', value: 3, color: '#EA580C' },
        { label: 'Reels ganchos', value: 4, color: '#FED7AA' },
        { label: 'LinkedIn (identidad)', value: 2, color: '#FED7AA' },
      ],
    },
    recomendacion:
      'Menos piezas totales, más deliberadas. Que cada pieza tenga una razón editorial visible, no solo llenar la parrilla.',
    isDemo: true,
  },
];
