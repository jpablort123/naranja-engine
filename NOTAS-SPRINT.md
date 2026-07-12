# Sprint Universo (v0.8) — Notas

Rama: `sprint-universo` (parte de `sprint-estrategia`; NO mergeada a `main`).
Spec: `spec-sprint-universo.md`.
Build: `npm run build` pasa (34 rutas).

> Este archivo reemplaza al de v0.7. La documentación del sprint v0.7
> (Estrategia) sigue vigente en `spec-sprint-estrategia.md` y el código
> anterior está preservado en la rama `sprint-estrategia`.

## (a) Qué construí

### Módulo A — Universo del episodio

- Evolucioné la tab **Linaje** → **Universo 🌐** (`components/estrategia/LineageTab.jsx`).
- El `/api/episodes/[id]/linaje` ahora devuelve piezas de los 3 estados +
  `resultado.conteo` con `publicada / propuesta / descartada`.
- Filtro segmentado arriba: **Todo · Publicado · Propuestas · Descartadas**.
- Clic-según-estado:
  - **publicada** → abre el `PiezaPanel` (detalle + vecinos).
  - **propuesta** → llama `onGoToWorkshopTab(tab)` que salta a la tab de
    producción correspondiente (reel/linkedin/carrusel → Reels;
    minado/corto → Minado; mediano → Medianos; intros → Intros).
  - **descartada** → abre un panel con la razón y la nota "guardado como
    aprendizaje draft".
- `PiezaRow` diferencia visualmente: publicada = borde verde sólido;
  propuesta = borde gris punteado con "PROPUESTA"; descartada = fondo tenue,
  texto tachado, "DESCARTADA".
- El chip de ángulo dentro de cada card es clickeable → abre `AnguloView`.
- **Cara por defecto según ciclo de vida** (spec §4): al entrar a un
  episodio existente, si hay ≥1 pieza en estado `publicada`, la tab activa
  pasa a `linaje`. Si el episodio está recién creado (`phase` en 'angles' /
  'contenido' / 'minado'), NO se toca — el flujo de producción sigue igual.

### Módulo B — Navegabilidad del grafo

- **`PiezaPanel.jsx`** (portal, Escape, overlay): pieza + métricas +
  vecinos (madre clickeable → Universo de la madre; hermanas clickeables →
  abren otra pieza; ángulo clickeable → `AnguloView`). Mini-serie SVG de
  reach cuando hay ≥2 snapshots.
- **`AnguloView.jsx`** (portal): lista todas las piezas del producto con
  ese `angle_type`, cross-episodios, con agregados (piezas, alcance,
  engagement, subs). Cada pieza abre el `PiezaPanel`.
- Endpoints nuevos:
  - `GET /api/published/[id]` — pieza + `latest_metrics` + serie + madre
    (por `origin_type` + `origin_id`) + hermanas + `subs_atribuidos`.
  - `GET /api/angulos/[angle_type]` — piezas + resumen (excluye propuestas
    y descartadas del cálculo de promedios).
- **Radar clickeable**: cada pieza de "Top piezas" abre `PiezaPanel`. Las
  barras de "Qué engancha por ángulo" son botones que abren `AnguloView`.
  El chip "Ver linaje →" del último episodio salta al workspace + tab
  Universo (ya funcionaba desde v0.7).

### Módulo C — Aprendizajes del mes (DEMO)

- **`lib/aprendizajes-demo.js`**: 8 insights hardcodeados, cada uno con
  `eyebrow`, `titular`, `subtexto`, `viz` (barras simples), `recomendacion`
  y `isDemo: true`. Cubren formato / concentración / ángulo / cadencia /
  plataforma (aspiracional) / madre / identidad (aspiracional) / cierre.
- **`components/estrategia/AprendizajesDelMes.jsx`**: carrusel full-screen
  con chrome mínimo. Header con contador + chip **DEMO** removible.
  Cuerpo: eyebrow + titular grande + subtexto + `<BarsViz>` + callout
  naranja "Qué haría con esto". Footer con anterior / dots / siguiente.
  Navegación con ArrowLeft/ArrowRight, cierre con Escape.
- Botón "📖 Aprendizajes del mes" en el header del **Radar**, junto a
  "Registrar publicación".

### Módulo D — Costura multi-producto

- **`lib/product.js`**: `CURRENT_PRODUCT_ID` desde
  `process.env.CURRENT_PRODUCT_ID` (default el UUID fijo de CMO). Helpers:
  - `withProduct(query)` → aplica `.eq('product_id', CURRENT_PRODUCT_ID)`.
  - `withProductPayload(payload)` → mergea `product_id` en el insert.
- Rutas actualizadas para setear `product_id` en TODOS los inserts nuevos
  y filtrar en TODAS las lecturas (episodes, newsletters, published_items,
  subscribers, ideas, descript/import, radar, linaje, angulos).
- **No hay selector de producto en la UI**. Es solo la costura para el día
  que llegue un segundo producto.
- La default en el esquema garantiza que si algún path viejo no setea
  `product_id`, la fila queda igual en el UUID de CMO.

### Módulo E — Provider YouTube (activable por env)

- **`lib/metrics/youtube.js`** implementado con API key (sin OAuth):
  - `extractVideoId(url)` maneja `youtube.com/watch?v=`, `youtu.be/`,
    `youtube.com/shorts/`, `youtube.com/embed/`, o un id crudo.
  - Llama `GET https://www.googleapis.com/youtube/v3/videos?part=statistics&id=<id>&key=<KEY>`.
  - Mapea a `views`, `likes`, `comments` y calcula
    `engagement_rate = (likes + comments) / views * 100` (2 decimales).
- `lib/metrics/index.js` **NO cambió**: con `METRICS_PROVIDER=mock`
  (default) usa el mock; con `METRICS_PROVIDER=youtube` (o cualquier valor
  != 'mock') rutea `platform='youtube'` al provider real. Los otros
  providers siguen como stubs y devuelven `[]`.

### Seed

- **`scripts/seed-estrategia.mjs`** actualizado: siembra 11 publicadas +
  3 propuestas + 2 descartadas (con `discard_reason`), y `product_id`
  explícito en cada fila. Suscriptores atribuidos ahora solo van a piezas
  publicadas (evita atribuir a propuestas).

### Higiene técnica (biblia §15)

- `force-dynamic` en TODOS los nuevos GETs + endpoints legacy (episodes,
  newsletters, published, ideas, etc.).
- Todos los paneles nuevos usan `createPortal` y cierran con
  X/overlay/Escape (#11).
- Nada de dark: el único DARK sigue siendo la card "madre" del Universo.
- **`components/estrategia/` ya estaba en el `content` de tailwind desde
  v0.7 — no hubo que agregar nada nuevo** (todos los componentes viven
  ahí adentro).
- RLS deshabilitado en `products`; el resto ya tenía RLS off en v0.7.
- `product_id` nullable con DEFAULT → los inserts viejos que no la conocen
  siguen funcionando (Descript / seed / etc.).

## (b) Qué te toca hacer

1. **Correr la migración en Supabase.** Abre el SQL editor y ejecuta
   entero `migrations/sprint-universo.sql`. Es idempotente y solo hace
   ALTER + INSERT ON CONFLICT DO NOTHING. Verifica:
   ```sql
   select id, name, slug from products;              -- 1 fila: CMO Stories
   select count(*), status from published_items group by status;
   -- si ya corriste el seed viejo, todo debería estar en 'publicada'
   ```

2. **Variables de entorno** (`.env.local` y en Vercel):

   ```
   # obligatorias (ya existen desde v0.7)
   NEXT_PUBLIC_SUPABASE_URL=…
   NEXT_PUBLIC_SUPABASE_ANON_KEY=…
   ANTHROPIC_API_KEY=…

   # métricas (v0.7 → default 'mock')
   METRICS_PROVIDER=mock

   # producto activo (v0.8) — opcional; sin setear usa el UUID de CMO
   CURRENT_PRODUCT_ID=c0000000-0000-4000-8000-000000000001

   # activar provider real de YouTube (opcional, ver §c)
   YOUTUBE_API_KEY=…   # (la API key que ya tienes)
   ```

3. **Revisar la rama y build.**
   ```bash
   git checkout sprint-universo
   git log --oneline sprint-estrategia..HEAD
   npm run build       # 34 rutas, debe pasar
   npm run dev
   ```
   Al abrir un episodio existente con piezas publicadas debería caer en
   la tab **Universo**. Uno recién creado sigue cayendo en el taller
   (Episodio → Reels → Intros → Minado → Medianos → Universo).

4. **Seed (opcional, para ver los 3 estados vivos).**
   Con `npm run dev` corriendo:
   ```bash
   node scripts/seed-estrategia.mjs
   ```
   Crea las 16 piezas (11 publicadas + 3 propuestas + 2 descartadas),
   40 suscriptores atribuidos a las publicadas, y dispara mock sync.

5. **Deploy a Vercel** (rama, no promover):
   ```bash
   git push origin sprint-universo
   ```
   En Vercel, setear `METRICS_PROVIDER`, `CURRENT_PRODUCT_ID` (opcional)
   y `YOUTUBE_API_KEY` si vas a activar el provider real.

## (c) Cómo activar el provider real de YouTube

Hoy `METRICS_PROVIDER=mock` (default) → todas las plataformas devuelven
los números deterministas del mock. Para activar YouTube real:

1. Setear en `.env.local` (dev) y en Vercel (prod/preview):
   ```
   METRICS_PROVIDER=youtube
   YOUTUBE_API_KEY=<tu API key de YouTube Data API v3>
   ```
   (`METRICS_PROVIDER` puede ser cualquier valor != 'mock'; usar
   `youtube` es solo etiquetación.)

2. Registrar las piezas de YouTube con `published_url` completo (ej.
   `https://www.youtube.com/watch?v=abcd1234`) o con `platform_post_id`
   con el videoId. El extractor soporta `watch`, `shorts`, `embed` y
   `youtu.be`.

3. Correr sync:
   ```bash
   curl -X POST http://localhost:3000/api/metrics/sync \
     -H 'content-type: application/json' -d '{}'
   ```
   Solo las piezas `platform='youtube'` traen números reales. Los otros
   providers (metricool, spotify) siguen como stubs y devuelven `[]` —
   sus piezas quedan sin métrica hasta que se implementen.

4. Chequeo rápido: en el Radar debería ver la pieza de YouTube con los
   `views` reales. En el `PiezaPanel` de esa pieza aparece el
   `engagement_rate` calculado como `(likes + comments) / views`.

**Tip**: si quieres seguir viendo el mock en las plataformas no-YouTube
pero YouTube real, deja `METRICS_PROVIDER=youtube`: los stubs de
Metricool/Spotify devuelven `[]` sin errores. Cuando implementes uno, el
enrutamiento ya está listo en `lib/metrics/index.js`.

## Guardrales cumplidos

- No rompí el flujo de producción — todas las tabs viejas siguen ahí; la
  Universo es una tab más y solo cambia el default en episodios maduros.
- Tema claro cálido en todo; único dark = card madre del Universo.
- RLS off en `products`.
- `product_id` nullable + DEFAULT → los inserts viejos NO se rompen.
- `force-dynamic` + `cache:'no-store'` en TODOS los GET nuevos.
- Portales + cierre X/overlay/Escape en `PiezaPanel`, `AnguloView`,
  `RegistrarPublicacionModal`, `AprendizajesDelMes`.
- Ningún directorio nuevo de componentes — todo vive en
  `components/estrategia/` (ya en tailwind content).
- No construí un project manager: 3 estados, punto (`publicada` /
  `propuesta` / `descartada`), sin checklist de pipeline.
- La capa de identidad/target sigue LATENTE. Los insights aspiracionales
  de "Aprendizajes del mes" hablan de ella como **statement de futuro**,
  pero ninguna vista, filtro ni métrica productiva la muestra.

## Fuera de este sprint (explícito)

- El motor real que calcula insights (todos los "Aprendizajes del mes"
  son demo hardcodeados, marcados con `isDemo: true` y chip removible).
- El modo Narrar completo (esto es solo el preview).
- Encender la capa de identidad/target.
- Providers reales de Metricool (IG/LinkedIn/TikTok) y Spotify.
- Multi-tenant real (auth, roles, onboarding, config por cliente).
- Chrome explícito de "modo producción" / taller (por ahora basta el
  default por ciclo de vida).
