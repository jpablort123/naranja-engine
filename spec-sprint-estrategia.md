# SPEC — Sprint Estrategia (Capa de Medición)
## Para ejecutar con Claude Code sobre el repo `naranja-engine`
### Versión objetivo: v0.7 · Escrito 8 Julio 2026

---

## 0. CÓMO LEER ESTE SPEC

Este documento es autocontenido. Un desarrollador (o Claude Code) que nunca habló con JP debe poder construir todo el sprint solo leyendo esto + la biblia (`cmo-engine-bible.md`). Antes de escribir código, leer la biblia completa, en especial:
- Sección 3 (tablas Supabase) y 5 (diseño visual mandatorio)
- Sección 15 (ERRORES A NO REPETIR) — **todos aplican aquí**, en particular #13 (RLS), #14 (tailwind content), #15 (force-dynamic).

**Regla de oro del sprint:** se construye TODA la infraestructura de 4 módulos. Lo único que queda pendiente después de esta noche es implementar 3 archivos de provider de APIs externas (`lib/metrics/youtube.js`, `metricool.js`, `spotify.js`) y cambiar una variable de entorno. Nada más.

**Mindset de priorización (decisión de producto):** las métricas de esta versión son **alcance, engagement y suscriptores** — lo que se mide fácil hoy. La capa de "gente correcta / target" queda **latente**: las columnas existen en el schema (`is_target`, `cargo`, `empresa`) para no tener que reconstruir nada después, pero **ninguna vista, copy ni métrica de esta versión habla de "público correcto".** Se enciende más adelante, cuando la comunidad sea más grande y tenga sentido. No construir enriquecimiento automático en este sprint.

---

## 1. QUÉ SE CONSTRUYE — LOS 4 MÓDULOS

1. **Módulo 1 — Infraestructura de datos y captura.** Schema nuevo (`published_items`, `metric_snapshots`, `subscribers`), la capa de providers de métricas con mock, el generador de UTM, y el flujo manual de "registrar publicación". Es el cimiento; todo lo demás se apoya acá.
2. **Módulo 2 — Radar (home fusionado).** Reemplaza a "Inicio". Dos zonas: "Esta semana" (pulso) arriba y "Qué funciona" (patrones) abajo.
3. **Módulo 3 — Público.** Suscriptores con import de CSV de Substack; el foco es **conteo y crecimiento**. El enriquecimiento (cargo/empresa) queda latente y opcional, sin protagonismo en la UI.
4. **Módulo 4 — Linaje.** Pestaña nueva dentro del workspace del episodio: madre → piezas → resultado.

**Navegación resultante.** El sidebar gana un grupo "Estrategia" con **dos** items nuevos (Radar, Público) arriba del grupo "Producción" (Podcast, Newsletter, Fixture, Protocolos, Aprendizajes, ya existentes). "Qué funciona" NO es item propio: es una zona dentro de Radar. El scorecard/Linaje NO es item: es una pestaña dentro del workspace del episodio.

Todo el módulo va detrás de un feature flag `SHOW_ESTRATEGIA` (default `true`), mismo patrón que `SHOW_PARRILLA`.

---

## 2. STACK Y CONVENCIONES (recordatorio)

- Next.js 14 App Router en Vercel · Supabase (Postgres) · Anthropic SDK server-side (`claude-sonnet-4-6`).
- Alias `@/` requiere `jsconfig.json` (error #10). Ya existe; no romperlo.
- **Toda tabla nueva:** `ALTER TABLE <t> DISABLE ROW LEVEL SECURITY;` justo después de crearla (error #13).
- **Todo route GET sin parámetros dinámicos:** `export const dynamic = 'force-dynamic'` + `cache: 'no-store'` en el fetch cliente (error #15).
- **Si se crea el directorio `components/estrategia/`**, agregarlo al array `content` de `tailwind.config.js` (error #14) — si no, las clases que solo aparezcan ahí no se compilan y el layout se rompe en silencio.
- **Paneles/modales fixed** dentro de árboles con overflow/transform: `createPortal` a `document.body` (error #11). Cierre siempre con X + click en overlay + tecla Escape.
- **Diseño (sección 5 de la biblia, MANDATORIO):** fondo `#FAFAF9`, sidebar `#18181B`, acento `#EA580C`, orange-50 `#FFF7ED`, orange-200 `#FED7AA`, success `#16A34A`, success-50 `#F0FDF4`, muted `#78716A`, cards blancos, borders `#E7E5E4`, tipografía DM Sans, cards `rounded-xl`, transiciones suaves. **NUNCA tema oscuro** (salvo el sidebar). Temperaturas/tibio usan lila `#FAF5FF` / `#7C3AED` / `#E9D5FF`.

---

## 3. MÓDULO 1 — SCHEMA (Supabase)

Ejecutar en el SQL editor. **Recordar deshabilitar RLS en las 3 tablas.**

```sql
-- 3.1 Piezas publicadas: el "eslabón" que hoy no existe. Cuelga métricas y linaje.
CREATE TABLE published_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content_type TEXT NOT NULL,      -- 'reel'|'mediano'|'linkedin'|'carrusel'|'corto'|'episodio'|'newsletter'
  platform TEXT NOT NULL,          -- 'youtube'|'instagram'|'linkedin'|'spotify'|'tiktok'
  published_url TEXT,
  platform_post_id TEXT,           -- video id / media id / episode uri (se llenará solo o a mano)
  utm_campaign TEXT,               -- generado por lib/utm.js
  origin_type TEXT,                -- 'episode'|'newsletter'|'idea'|'manual'  (la "madre")
  origin_id UUID,                  -- FK lógica a episodes/newsletters/ideas
  origin_label TEXT,               -- ej "Ep. 042 · Sofía Realpe"
  angle_type TEXT,                 -- tipo de ángulo, para la zona "Qué funciona" (ej 'errores_mitos')
  creation_source TEXT,            -- 'sistema'|'idea_propia'|'minado_sistema'|'mixto' — cómo nació la pieza (habilita "¿rinde mejor lo del sistema o lo humano?" a futuro)
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE published_items DISABLE ROW LEVEL SECURITY;

-- 3.2 Métricas como serie temporal (una fila por métrica por captura)
CREATE TABLE metric_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  published_item_id UUID REFERENCES published_items(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  metric TEXT NOT NULL,            -- 'reach'|'impressions'|'views'|'likes'|'comments'|'shares'|'saves'|'watch_time'|'engagement_rate'
  value NUMERIC NOT NULL,
  captured_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE metric_snapshots DISABLE ROW LEVEL SECURITY;

-- 3.3 Suscriptores: la columna de identidad (fuente = CSV de Substack)
CREATE TABLE subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  subscribed_at DATE,
  source_platform TEXT,            -- opcional, si se conoce el canal de entrada
  attributed_item_id UUID REFERENCES published_items(id) ON DELETE SET NULL, -- best-effort, opcional
  cargo TEXT,                      -- MANUAL, opcional
  empresa TEXT,                    -- MANUAL, opcional
  is_target BOOLEAN,               -- MANUAL, opcional (null = sin clasificar)
  status TEXT DEFAULT 'nuevo',     -- 'nuevo'|'clasificado'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE subscribers DISABLE ROW LEVEL SECURITY;

-- 3.4 Vista de "última métrica por pieza por tipo" (para rollups rápidos)
CREATE OR REPLACE VIEW latest_metrics AS
SELECT DISTINCT ON (published_item_id, metric)
  published_item_id, platform, metric, value, captured_at
FROM metric_snapshots
ORDER BY published_item_id, metric, captured_at DESC;
```

**Nota:** `angle_type` es un texto libre por ahora (no enum). Valores sugeridos consistentes con los patrones: `errores_mitos`, `tras_la_decision`, `datos_duros`, `historia_personal`, `otro`. La UI de "registrar publicación" ofrece estos como opciones.

---

## 4. MÓDULO 1 — CAPA DE PROVIDERS DE MÉTRICAS (el corazón del "solo faltan las APIs")

Crear `lib/metrics/`:

```
lib/metrics/
├── index.js        → selecciona provider según env METRICS_PROVIDER (default 'mock')
├── mock.js         → devuelve métricas deterministas sembradas (para tener UI viva HOY)
├── youtube.js      → STUB. TODO: implementar con YouTube Data + Analytics API
├── metricool.js    → STUB. TODO: implementar con Metricool API (IG + LinkedIn agregado)
└── spotify.js      → STUB. TODO: import manual / no oficial (marcado)
```

### 4.1 Contrato del provider (todos implementan la misma interfaz)

```js
// Cada provider exporta:
export async function fetchMetrics(item) {
  // item = fila de published_items
  // devuelve: [{ metric, value }] para insertar en metric_snapshots
}
export const platforms = ['youtube'];       // qué plataformas cubre este provider
```

### 4.2 `lib/metrics/index.js`

```js
import * as mock from './mock';
import * as youtube from './youtube';
import * as metricool from './metricool';
import * as spotify from './spotify';

const PROVIDER = process.env.METRICS_PROVIDER || 'mock';

// Enruta cada plataforma a su provider real; si PROVIDER='mock', todo va a mock.
export async function fetchMetricsForItem(item) {
  if (PROVIDER === 'mock') return mock.fetchMetrics(item);
  const byPlatform = { youtube, spotify, instagram: metricool, linkedin: metricool, tiktok: metricool };
  const provider = byPlatform[item.platform] || mock;
  try { return await provider.fetchMetrics(item); }
  catch (e) { console.error('metrics provider error', item.platform, e); return []; }
}
```

### 4.3 `lib/metrics/mock.js` (SÍ se implementa HOY)

Genera valores deterministas a partir de un hash del `id` de la pieza, para que la UI se vea estable entre recargas. Por `content_type` da rangos realistas:
- `reel` / `corto`: reach 3k–60k, engagement_rate 2.5–7%
- `mediano` / `episodio`: views 2k–12k, watch_time, engagement 4–6%
- `linkedin`: impressions 2k–10k, engagement 4–6%
- `carrusel`: reach 2k–8k, engagement 3–5%

Devuelve al menos `reach` (o `views`/`impressions` según plataforma) y `engagement_rate`.

### 4.4 Stubs (`youtube.js`, `metricool.js`, `spotify.js`) — lo único pendiente

Cada uno con la firma del contrato, lanzando/loggeando "no implementado" y comentarios TODO explícitos que indiquen:
- **youtube.js:** usar YouTube Data API v3 (contadores) + YouTube Analytics API (retención, watch_time, tráfico) vía OAuth como dueño del canal. Credenciales esperadas en env: `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`. `platform_post_id` = videoId.
- **metricool.js:** API de Metricool (plan Advanced/Custom). Auth header `X-Mc-Auth` + query `userId` + `blogId`. Env: `METRICOOL_TOKEN`, `METRICOOL_USER_ID`, `METRICOOL_BLOG_ID`. Cubre Instagram y LinkedIn agregado.
- **spotify.js:** NO hay API oficial de analíticas de creador. Dejar como import manual (CSV) o stub que devuelve `[]`. Comentar que Spotify se llena a mano por ahora.

**Definición de hecho del sprint respecto a APIs:** estos 3 archivos existen con su firma correcta y sus TODOs; NO se implementan esta noche.

### 4.5 `lib/utm.js` (SÍ se implementa HOY)

```js
export function buildUtm({ originLabel, contentType, platform }) {
  const slug = (originLabel || 'manual').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
  return `utm_source=${platform}&utm_medium=${contentType}&utm_campaign=${slug}`;
}
```

---

## 5. MÓDULO 1 — API ROUTES

Todas bajo `app/api/`. Recordar `force-dynamic` en los GET.

### 5.1 `app/api/published/route.js`
- `GET`: lista `published_items`. Soporta query params `origin_id`, `origin_type`, `platform`, `content_type`, `from`, `to`. `force-dynamic`.
- `POST`: crea una pieza publicada. Al crear, si viene `origin_label`+`content_type`+`platform`, generar `utm_campaign` con `lib/utm.js`.
- `PATCH` (`?id=`): actualiza (ej. pegar `published_url` / `platform_post_id`).
- `DELETE` (`?id=`): borra (cascade elimina sus snapshots).
- `POST /api/published/import` (runtime Node): recibe el CSV/XLSX de reconstrucción de linaje (columnas: `madre_tipo`, `madre`, `titulo_pieza`, `tipo_contenido`, `plataforma`, `url_publicada`, `post_id`, `tipo_angulo`, `fuente_creacion`, `fecha_publicacion`, `notas`). Mapea a `published_items` (`madre_tipo`→`origin_type`, `madre`→`origin_label`, `titulo_pieza`→`title`, `tipo_contenido`→`content_type`, `plataforma`→`platform`, `url_publicada`→`published_url`, `post_id`→`platform_post_id`, `tipo_angulo`→`angle_type`, `fuente_creacion`→`creation_source`, `fecha_publicacion`→`published_at`). Genera `utm_campaign` con `lib/utm.js`. Cuando `madre_tipo` es `episode`/`newsletter`, intenta resolver `origin_id` matcheando `origin_label` contra la lista de episodios/newsletters (si no matchea, deja `origin_id` null y conserva el label). Parsear con `papaparse`. Devuelve `{ importados, con_madre, sin_madre }`.

### 5.2 `app/api/metrics/route.js` + `app/api/metrics/sync/route.js`
- `GET /api/metrics?published_item_id=`: devuelve las métricas más recientes de una pieza (leer de la vista `latest_metrics`). `force-dynamic`.
- `POST /api/metrics/sync`: para cada `published_item` (o los pasados en body), llama `fetchMetricsForItem` e inserta filas en `metric_snapshots` con `captured_at = now()`. Con `METRICS_PROVIDER=mock` esto siembra datos. Devuelve conteo insertado.

### 5.3 `app/api/subscribers/route.js` + `app/api/subscribers/import/route.js`
- `GET`: lista suscriptores con filtro `status`. Devuelve también un resumen: total, nuevos_7d, nuevos_hoy, crecimiento_pct. (Los campos `is_target`/`cargo`/`empresa` existen pero NO entran al resumen en esta versión.) `force-dynamic`.
- `PATCH` (`?id=`): actualiza `cargo`, `empresa`, `is_target`, `status`, `notes`.
- `POST /api/subscribers/import` (runtime Node): recibe el CSV de Substack (multipart o texto). Parsear con `papaparse`. Mapear columnas de Substack (`email`, `created_at`/columna de fecha, y las que existan). **Upsert por `email`** (no duplicar). Los nuevos entran con `status='nuevo'`, `is_target=null`. Devuelve `{ importados, nuevos, actualizados }`.

### 5.4 `app/api/radar/route.js` (GET, `force-dynamic`)
Devuelve el objeto que consume RadarView:
```json
{
  "pulso": {
    "subs_nuevos_7d": 84, "subs_prev_7d": 61,
    "engagement_promedio_7d": 5.2,
    "alcance_total_7d": 112400, "piezas_publicadas_7d": 11, "madres_activas": 3,
    "top_piezas": [{ "title","content_type","platform","reach","subs" }],
    "ultimo_episodio": { "origin_id","label","piezas","alcance","subs" }
  },
  "patrones": {
    "engagement_por_formato": [{ "formato","engagement_rate" }],
    "engagement_por_angulo": [{ "angle_type","engagement_rate" }]
  }
}
```
- `alcance_total`/`reach` = suma de la métrica de alcance (reach/views/impressions) de las piezas.
- `engagement_promedio_7d` = promedio de `engagement_rate` de las piezas publicadas en los últimos 7 días.
- `top_piezas` = ordenadas por reach de los últimos 7 días, top 3–5. (El `subs` por pieza depende de atribución manual; si no la hay, va en 0 y el ranking manda por reach.)
- `patrones.engagement_por_formato` = promedio de `engagement_rate` agrupado por `content_type`.
- `patrones.engagement_por_angulo` = promedio de `engagement_rate` agrupado por `angle_type`. (Ambos patrones salen directo de métricas; no requieren atribución.)

### 5.5 `app/api/episodes/[id]/linaje/route.js` (GET, `force-dynamic`)
Arma el árbol del episodio:
```json
{
  "madre": { "id","label","type":"episode","metrics": { "youtube","spotify" } },
  "piezas": [{ "id","title","content_type","platform","reach","engagement_rate","subs_atribuidos","strength" }],
  "resultado": { "alcance_total","subs_total" }
}
```
- `piezas` = `published_items` con `origin_type='episode'` y `origin_id=[id]`, cada una con su última métrica.
- `subs_atribuidos` = suscriptores con `attributed_item_id` = esa pieza.
- `strength` = derivado para el color del árbol, basado en suscriptores traídos: `'fuerte'` si trajo >=3 suscriptores; `'medio'` si tuvo alcance alto pero <3 suscriptores; `'debil'` si poco de todo. (Cuando no hay atribución de suscriptores, cae por reach: alcance alto → medio, resto → débil.)
- `madre.metrics` = si el episodio tiene una `published_item` tipo `episodio`, sus métricas propias (YouTube/Spotify).

---

## 6. MÓDULO 1 — FLUJO MANUAL "REGISTRAR PUBLICACIÓN" (captura sin APIs)

Componente `components/estrategia/RegistrarPublicacionModal.jsx` (via `createPortal`, cierre con X/overlay/Escape).
Campos: madre (selector: episodio / newsletter / manual → carga lista), `content_type` (select), `platform` (select), `angle_type` (select con los valores sugeridos), `published_url` (pegar link). Al guardar: `POST /api/published` (genera UTM), y opcionalmente dispara `POST /api/metrics/sync` para esa pieza (con mock, la deja con números al instante).
- Mostrar la UTM generada con botón "copiar" para pegarla al publicar.
- Accesible desde: botón "+ Registrar publicación" en Radar (zona superior) y en la pestaña Linaje del episodio ("+ agregar pieza a este episodio", con la madre pre-seleccionada).

---

## 7. MÓDULO 2 — RADAR (home fusionado)

`components/estrategia/RadarView.jsx`. Reemplaza a "Inicio" como vista por defecto (`activeView='radar'`). Consume `GET /api/radar` con `cache:'no-store'`.

**Zona A — "Esta semana" (pulso), arriba:**
- Header: "Radar" + subtítulo "últimos 7 días" + botón "+ Registrar publicación".
- 4 metric cards (grid `auto-fit minmax(120px,1fr)`): Suscriptores nuevos (con ↑/↓ vs semana previa), Alcance total (7d), Engagement promedio (7d), Piezas publicadas (+ "de N madres").
  - Fondos: suscriptores en orange-50, engagement en success-50, alcance/piezas en `#F5F5F4`.
- Lista "Qué está funcionando": top piezas con icono de plataforma, título + tipo, reach, y chip verde "+N" (subs). Card blanco `rounded-xl`.
- Tarjeta "último episodio" con "Ver linaje →" que navega al workspace del episodio + pestaña Linaje.

**Zona B — "Qué funciona" (patrones), abajo, separada por divisor:**
- Título de zona "Qué funciona · sobre todos los episodios".
- Barras horizontales "Qué gusta más" (engagement por formato), fill naranja `#EA580C`.
- Barras horizontales "Qué engancha por tipo de ángulo" (engagement por `angle_type`), fill lila `#7C3AED`.
- Callout naranja (orange-50 / orange-200) con un insight generado de los datos (ej. "los reels lideran engagement; entre ángulos, errores/mitos es el que más engancha"). Ambas barras salen directo de las métricas, sin depender de atribución manual.
- Barras animan de 0 a su ancho al montar (transición width 0.5s), como en el mock.

Regla: si aún no hay datos suficientes (ej. <3 piezas), mostrar estados vacíos con copy tipo "Aún no hay suficientes publicaciones para ver patrones" en vez de barras vacías.

---

## 8. MÓDULO 3 — PÚBLICO

`components/estrategia/PublicoView.jsx`. Consume `GET /api/subscribers`.
- Header: "Público" + "N suscriptores · +M esta semana".
- 3 metric cards de crecimiento: Total, Nuevos (7d, con ↑/↓ vs semana previa), Nuevos hoy. **Sin lenguaje de "target/correcto".**
- Toolbar: "Importar CSV de Substack" (abre modal de upload → `POST /api/subscribers/import`, loader naranja, muestra `{importados,nuevos}`).
- Lista de suscriptores (card blanco, filas con divisor): email, fecha de suscripción, y origen si se conoce ("Reel ep.042" / "Newsletter"/…). Si hay `cargo`/`empresa` (enriquecidos a mano) se muestran discretos como subtítulo; si no, no se muestra ningún estado tipo "sin enriquecer".
- **Enriquecimiento latente (opcional, no protagonista):** click en una fila abre panel lateral tipo Notion (`createPortal`, slide-in, Escape) con campos editables `cargo`, `empresa`, `notes` y un toggle discreto `is_target`. Sirve para ir sembrando datos, pero NO hay stat, filtro ni chip de "público correcto" en la vista principal. Esa capa se activa en una versión futura.
- **Es útil sin enriquecer nada:** conteo y crecimiento son el foco y funcionan solos.

---

## 9. MÓDULO 4 — LINAJE (pestaña en el workspace del episodio)

`components/estrategia/LineageTab.jsx`. Se monta como **una pestaña nueva** en el tab bar del workspace del episodio en `app/page.js`, después de Medianos: `Episodio · Reels · Intros · Minado · Medianos · Linaje`. Consume `GET /api/episodes/[id]/linaje`.

Layout (según mock aprobado): madre a la izquierda (card oscuro `#18181B` con su propio resultado YouTube/Spotify) → tronco vertical + stubs horizontales → filas de piezas a la derecha, cada una con formato (chip), título, reach, chip de subs. Grosor/color del stub por `strength`: fuerte = verde `#16A34A` (3px), medio = ámbar `#EF9F27` (2px), débil = gris `#D6D3D1` (1px). Cada pieza muestra su reach y un chip de "+N subs". Abajo, franja "Resultado del universo" (orange-50/200): alcance total · N suscriptores. Leyenda de 3 colores al pie. (Sin lenguaje de "CMOs / público correcto" ni chips de personas en esta versión.)
- Botón "+ agregar pieza a este episodio" abre el RegistrarPublicacionModal con la madre pre-seleccionada.
- Debajo del árbol, opcional, la tabla de detalle (misma data, formato tabla) — si el tiempo no alcanza, dejar solo el árbol.

---

## 10. NAVEGACIÓN Y FLAG (`app/page.js` + `components/ui.jsx`)

- Feature flag `SHOW_ESTRATEGIA = true` (en `app/page.js` y donde haga falta, patrón de `SHOW_PARRILLA`).
- Sidebar: agregar grupo "Estrategia" (con label de grupo sutil, como el que separa hoy Aprendizajes/Protocolos) con items **Radar** (ícono radar) y **Público** (ícono users), arriba del grupo "Producción" que contiene los items actuales. Si `SHOW_ESTRATEGIA=false`, ocultar el grupo.
- `activeView` gana `'radar'` y `'publico'`. **`'radar'` es la nueva vista por defecto** (reemplaza a `'inicio'`; se puede retirar `InicioView` o dejarlo como fallback tras el flag).
- Workspace del episodio: agregar la pestaña `'linaje'` al tab bar y renderizar `LineageTab` cuando esté activa.
- El "Ver linaje →" del Radar navega: setear episodio seleccionado + `activeView='podcast'` (workspace) + pestaña activa `'linaje'`.

---

## 11. SEED (para que se vea vivo esta noche, sin APIs)

**Nota importante:** el primer dato REAL no viene del seed sino de la reconstrucción de linaje que hace JP a mano (los 4 episodios + 4 newsletters ya al aire), que se carga por `POST /api/published/import`. Al conectar YouTube/Metricool, `metrics/sync` jala el alcance/engagement retroactivo de cada pieza. El seed de abajo es solo un fallback para ver la UI viva antes de tener esa tabla lista.

Crear `scripts/seed-estrategia.mjs` (o un bloque SQL de `INSERT`) que inserte, para 2–3 episodios existentes:
- ~10–12 `published_items` variados (reels, medianos, linkedin, carrusel, cortos) con `origin_type='episode'`, `origin_id` real de un episodio existente, `angle_type` variado, `published_url` de ejemplo.
- ~40 `subscribers` con fechas repartidas en las últimas 2 semanas; ~15 con `cargo`/`empresa`/`is_target=true`, el resto sin clasificar; algunos con `attributed_item_id`.
- Luego correr `POST /api/metrics/sync` (mock) para poblar `metric_snapshots`.
Documentar en el README cómo correrlo. Con esto, Radar/Público/Linaje se ven llenos de inmediato.

---

## 12. ORDEN DE CONSTRUCCIÓN SUGERIDO (para Claude Code)

1. Schema (sección 3) en Supabase + verificar RLS deshabilitado en las 3 tablas + crear la vista.
2. `lib/metrics/*` (index + mock + 3 stubs) y `lib/utm.js`.
3. API routes: `published`, `metrics` + `metrics/sync`, `subscribers` + `import`, `radar`, `episodes/[id]/linaje`.
4. Seed (sección 11) + correr sync mock → confirmar que hay datos.
5. `RegistrarPublicacionModal` + `PublicoView` (import CSV real) — probar contra datos sembrados.
6. `RadarView` (pulso + patrones).
7. `LineageTab` + montaje de la pestaña en el workspace.
8. Navegación + flag + sidebar agrupado + `activeView` default `radar`.
9. Si se creó `components/estrategia/`, agregarlo a `tailwind.config.js content`.
10. Deploy a Vercel (JP prefiere ver en producción, no localhost — decisión de UX del Sprint 3).

---

## 13. DEFINICIÓN DE HECHO

- Las 3 tablas + vista existen, con RLS deshabilitado.
- `METRICS_PROVIDER=mock` puebla métricas y las 3 vistas se ven vivas con datos sembrados.
- Radar muestra pulso (4 cards + top piezas + último episodio) y patrones (2 grupos de barras + insight).
- Público importa un CSV real de Substack (upsert por email) y muestra conteo y crecimiento como foco; el enriquecimiento (cargo/empresa/target) existe latente en el panel pero no protagoniza la vista ni aparece como métrica.
- El episodio tiene pestaña Linaje con el árbol madre→piezas→resultado.
- "+ Registrar publicación" crea piezas y genera UTM copiable.
- Sidebar agrupado (Estrategia/Producción) tras `SHOW_ESTRATEGIA`, Radar por defecto.
- **Lo único pendiente:** implementar `youtube.js`, `metricool.js`, `spotify.js` y setear las env vars + `METRICS_PROVIDER`.

---

## 14. LO QUE NO SE HACE ESTA NOCHE (explícito)

- Implementar las APIs externas reales (queda para después; la interfaz ya está).
- Enriquecimiento automático de suscriptores (cargo/empresa/target siguen manuales).
- **Encender la capa de "gente correcta / target":** el schema la soporta (columnas latentes) pero esta versión NO la mide, muestra ni la nombra. Alcance, engagement y suscriptores son el foco. La capa de target se activa en una versión futura, cuando la comunidad crezca.
- Atribución exacta por-persona (subscriber ↔ UTM click); por ahora `attributed_item_id` es manual/best-effort.
- Cerrar el loop de "aprendizaje de desempeño" hacia los protocolos (fase futura).
- Reactivar/fusionar con la Parrilla (independiente de este sprint).
```

## 15. NOTA SOBRE EL MERGE RADAR + QUÉ FUNCIONA
Decisión tomada: son **una sola página** (Radar), con dos zonas. Se separarían en el futuro solo si la capa de análisis pide herramientas que la home no debe cargar (filtros, cohortes, export para el analista de datos) o si la usan personas distintas. Hasta entonces, una página.
