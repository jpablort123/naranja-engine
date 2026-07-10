# Sprint Estrategia — Notas de la noche

Rama: `sprint-estrategia` (NO mergeada a `main`).
Spec: `spec-sprint-estrategia.md` — v0.7.
Build: `npm run build` pasa (25 rutas).

## (a) Qué construí

### Módulo 1 — Infraestructura de datos y captura

- **`migrations/sprint-estrategia.sql`** — un solo archivo, idempotente
  (`CREATE TABLE IF NOT EXISTS`), con las 3 tablas + `latest_metrics`. Cada
  tabla trae `ALTER TABLE ... DISABLE ROW LEVEL SECURITY;` (biblia §15 #13).
  También índices útiles para Radar/Linaje.
- **`lib/utm.js`** — `buildUtm({ originLabel, contentType, platform })`.
- **`lib/metrics/`**
  - `index.js` — selector por `METRICS_PROVIDER` (default `mock`).
  - `mock.js` — implementado. Métricas deterministas por hash del id
    (rangos por `content_type` según spec §4.3). Usado por `metrics/sync`
    para que la UI se vea viva sin APIs.
  - `youtube.js`, `metricool.js`, `spotify.js` — **stubs** con firma
    correcta + TODOs explícitos (spec §4.4). NO implementados esta noche.
- **API routes** (todos los GET con `force-dynamic`):
  - `GET/POST/PATCH/DELETE /api/published`
  - `POST /api/published/import` (runtime Node, CSV con papaparse; resuelve
    `origin_id` matcheando `origin_label` contra episodes/newsletters; si no
    matchea deja `origin_id=null` y conserva el label).
  - `GET /api/metrics?published_item_id=`
  - `POST /api/metrics/sync` — con `{}` corre sobre todas las piezas.
  - `GET/PATCH /api/subscribers`
  - `POST /api/subscribers/import` (Substack CSV, upsert por email).
  - `GET /api/radar` — pulso 7d + patrones.
  - `GET /api/episodes/[id]/linaje` — árbol madre→piezas→resultado.
- **`RegistrarPublicacionModal`** vía `createPortal` (biblia §15 #11).
  Genera UTM copiable y opcionalmente dispara `metrics/sync` para que la
  pieza aparezca con números al instante.

### Módulo 2 — Radar (home fusionado)

- `components/estrategia/RadarView.jsx` — dos zonas:
  - **Pulso (7d)**: 4 metric cards (Suscriptores, Alcance, Engagement,
    Piezas), "Qué está funcionando" (top piezas) y card "último episodio"
    con "Ver linaje →" que aterriza en el tab Linaje del workspace.
  - **Qué funciona (patrones)**: barras horizontales por formato (naranja)
    y por ángulo (lila `#7C3AED`), con animación de width 0→final al
    montar. Callout naranja con insight generado de los datos. Estados
    vacíos "Aún no hay suficientes publicaciones" si hay <3.

### Módulo 3 — Público

- `components/estrategia/PublicoView.jsx` — foco: **conteo y crecimiento**
  (Total, Nuevos 7d con ↑/↓ vs previa, Nuevos hoy). El importer de CSV de
  Substack es un modal (`createPortal`) con upsert por email — no duplica.
- **Enriquecimiento latente**: click en una fila abre panel lateral
  slide-in (`createPortal`, Escape cierra) con `cargo`, `empresa`, `notes` y
  toggle `is_target`. **No hay stat, filtro ni chip de "target" en la vista
  principal.** Se muestra `cargo · empresa` bajo el email solo si están
  poblados.

### Módulo 4 — Linaje

- `components/estrategia/LineageTab.jsx` — pestaña nueva en el tab bar del
  workspace del episodio (después de Medianos). Layout: madre a la
  izquierda (card oscuro `#18181B` con YouTube/Spotify si hay), tronco
  vertical + stubs horizontales coloreados por `strength` (fuerte verde
  3px, medio ámbar 2px, débil gris 1px), piezas a la derecha, y franja
  "Resultado del universo" con alcance total + subs. Debajo, tabla de
  detalle. Botón "+ agregar pieza" abre `RegistrarPublicacionModal` con la
  madre pre-seleccionada.

### Navegación + flag

- `SHOW_ESTRATEGIA = true` en `app/page.js`.
- Sidebar: grupo **Estrategia** (Radar, Público) arriba, luego **Producción**
  (Podcast, Newsletter, Fixture, Protocolos, Aprendizajes — antes se llamaba
  "Contenido"). Si `SHOW_ESTRATEGIA=false`, vuelve a mostrar el botón
  Inicio y el label "Contenido" — nada del sprint aparece.
- `activeView` por defecto = `'radar'` (reemplaza a `'inicio'`).
- Pestaña `Linaje` agregada al tab bar del workspace del episodio (`ep`).

### Higiene técnica (biblia §15)

- Todos los GET con `export const dynamic = 'force-dynamic'` y todos los
  fetches del cliente con `cache: 'no-store'` (#15).
- Paneles y modales con `createPortal` a `document.body` + cierre con X,
  overlay y Escape (#11).
- **`components/estrategia/` agregado al `content` de `tailwind.config.js`**
  (#14).
- Tema claro cálido en todo. El único DARK que aparece es la card "madre"
  en el Linaje (spec §9 lo pide explícito) y el sidebar (que ya era oscuro).
- `.gitignore` amplía `.DS_Store` para todos los subdirectorios.

---

## (b) Qué te toca hacer en la mañana

1. **Aplicar el SQL en Supabase.** Abre el SQL editor y corre entero
   `migrations/sprint-estrategia.sql`. Es idempotente y no toca tablas
   existentes. Verifica que salió sin errores.
   ```sql
   -- rápido check
   select 'published_items' t, count(*) from published_items
   union all select 'metric_snapshots', count(*) from metric_snapshots
   union all select 'subscribers', count(*) from subscribers;
   ```

2. **Variables de entorno.** En `.env.local` (dev) y en Vercel (prod)
   deja al menos:
   ```
   METRICS_PROVIDER=mock
   ```
   (Ya está como default en el código, así que si no la seteas también
   funciona.) Las demás las agregas cuando implementes cada provider:
   ```
   YOUTUBE_CLIENT_ID=…
   YOUTUBE_CLIENT_SECRET=…
   YOUTUBE_REFRESH_TOKEN=…
   METRICOOL_TOKEN=…
   METRICOOL_USER_ID=…
   METRICOOL_BLOG_ID=…
   ```

3. **Revisar la rama.**
   ```bash
   git checkout sprint-estrategia
   git log --oneline main..HEAD
   npm run build     # debe pasar
   npm run dev       # abrir en http://localhost:3000
   ```
   Radar debería aparecer como vista por defecto. Al arrancar sin datos
   verás copies vacíos ("Aún no hay suficientes publicaciones…").

4. **Seed opcional para ver la UI viva sin la reconstrucción real.**
   Corre `npm run dev` y en OTRA terminal:
   ```bash
   node scripts/seed-estrategia.mjs
   ```
   Crea ~11 `published_items` sobre los últimos 3 episodios, ~40
   `subscribers` (15 enriquecidos, 8 atribuidos a piezas), y dispara
   `POST /api/metrics/sync` con mock. Ahora Radar/Público/Linaje se ven
   llenos.

5. **Deploy a Vercel.** JP prefiere ver en producción (spec §12.10).
   ```bash
   git push origin sprint-estrategia
   ```
   En Vercel, hacer preview deployment de la rama (no promover a prod).
   Setear `METRICS_PROVIDER=mock` en el env del proyecto si aún no está.
   Confirma que la migración ya está en la Supabase de prod antes de
   promover.

---

## (c) Cómo cargar la reconstrucción real de linaje (post-launch)

El CSV de reconstrucción que preparaste con los 4 episodios + 4 newsletters
al aire tiene estas columnas:

```
madre_tipo, madre, titulo_pieza, tipo_contenido, plataforma,
url_publicada, post_id, tipo_angulo, fuente_creacion,
fecha_publicacion, notas
```

Súbelo por el endpoint `POST /api/published/import`. Hay tres formas:

### A. Multipart (recomendada — desde la UI o curl)

```bash
curl -X POST http://localhost:3000/api/published/import \
  -F "file=@reconstruccion.csv"
```

Respuesta:
```json
{ "importados": 42, "con_madre": 38, "sin_madre": 4 }
```
- `con_madre` = filas donde `madre_tipo` era `episode`/`newsletter` y se
  encontró un match por nombre → se rellenó `origin_id`.
- `sin_madre` = filas donde no matcheó ninguna madre → quedan con
  `origin_label` (para poder revisar y unir después) pero `origin_id=null`.
- Todas las filas ya llevan `utm_campaign` generado por `lib/utm.js`.

### B. JSON con el CSV embebido

```bash
curl -X POST http://localhost:3000/api/published/import \
  -H "content-type: application/json" \
  -d '{"csv":"madre_tipo,madre,titulo_pieza,...\n..."}'
```

### C. text/csv directo

```bash
curl -X POST http://localhost:3000/api/published/import \
  -H "content-type: text/csv" --data-binary @reconstruccion.csv
```

### Después del import

Corre el sync para poblar métricas (con mock ahora, con las APIs cuando
existan):
```bash
curl -X POST http://localhost:3000/api/metrics/sync \
  -H "content-type: application/json" -d '{}'
```
Con `METRICS_PROVIDER=mock` esto llena `metric_snapshots` de una vez.
Cuando enciendas YouTube/Metricool, el mismo call jalará el retroactivo
por pieza.

**Ojo**: si el CSV trae filas sin `titulo_pieza`, `tipo_contenido` o
`plataforma`, el importer las salta silenciosamente (esos 3 son
mandatorios). Si nada matchea, la respuesta trae `error` claro.

---

## Definición de hecho — checklist final

- [x] Migración lista en `migrations/sprint-estrategia.sql` con RLS off.
- [x] `METRICS_PROVIDER=mock` como default; providers YouTube/Metricool/
      Spotify como stubs con TODOs.
- [x] Radar muestra pulso (4 cards + top + último episodio) y patrones
      (2 grupos de barras + insight).
- [x] Público importa CSV real de Substack (upsert), muestra crecimiento;
      enriquecimiento existe en el panel pero no protagoniza.
- [x] Episodio con pestaña Linaje (árbol + resultado + tabla).
- [x] "+ Registrar publicación" crea piezas y expone UTM copiable.
- [x] Sidebar agrupado Estrategia/Producción tras `SHOW_ESTRATEGIA`, Radar
      por defecto.
- [x] `npm run build` pasa.
- [ ] **Pendiente en la mañana**: aplicar SQL, deploy en Vercel, cargar
      reconstrucción real por el endpoint de import.

## Fuera de este sprint (explícito, spec §14)

- APIs externas reales de YouTube/Metricool.
- Enriquecimiento automático de suscriptores.
- Encender la capa "gente correcta / target" (schema lo soporta con
  `is_target`/`cargo`/`empresa` pero ninguna vista lo mide ni lo nombra).
- Atribución exacta por-persona (subscriber ↔ UTM click).
