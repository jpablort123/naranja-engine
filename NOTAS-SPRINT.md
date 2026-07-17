# Sprint Publicación (v0.9) — Notas

Rama: `sprint-publicacion` (parte de `main`; NO mergeada).
Spec: `spec-sprint-publicacion.md`.
Build: `npm run build` pasa (40 rutas).

> Este archivo reemplaza al de v0.8. La documentación del Sprint Universo
> (v0.8) sigue viva en `spec-sprint-universo.md` y el código está en la
> historia de `main`.

## (a) Qué construí

### Módulo A — Puente producción → propuestas
- Nuevo helper `SendToPublicacionesBtn` en `components/ui.jsx`. Dos modos:
  publicar (envía como propuesta) y descartar (mismo endpoint con status
  descartada + razón inline).
- Botones integrados en:
  - **MinadoTab** — por cada `MicroCard` (source `minado`, ref = índice).
  - **MedianosTab** — por cada mediano desarrollado (source `mediano`,
    ref = `m.id`).
  - **ReelsTab** — por cada propuesta con guión final cerrado (source
    `reel`, ref = `ci-pIdx`). Los que no están cerrados no ofrecen el
    botón — evita crear propuestas de guiones a medio armar.
- Endpoint `POST /api/publicaciones/enviar` inserta filas con
  `status='propuesta'` (o `descartada`), heredando `origin_type='episode'`,
  `origin_id`, `origin_label`, `angle_type`, `creation_source='sistema'`.
  **Idempotente por `origin_ref`** (formato `ep:<uuid>/<source>/<ref>`) —
  hacer clic dos veces desde el mismo ítem NO crea duplicados; devuelve
  `saltadas[]` con el `existing_id`.
- Los ángulos crudos NO se envían (solo lo seleccionado/desarrollado, spec
  §2 punto 1).

### Módulo B — Vista "Publicaciones" (nueva)
- `components/estrategia/PublicacionesView.jsx` + endpoint
  `GET /api/publicaciones`.
- Sidebar (grupo Estrategia) ahora tiene 3 items: **Radar · Publicaciones ·
  Público**.
- La vista muestra, agrupado por episodio:
  1. Barra naranja "¿este episodio ya salió?" con inputs para YouTube y/o
     Spotify (solo si faltan — Módulo F).
  2. Propuestas abiertas (`status='propuesta'`) con dos acciones rápidas
     por fila: **publicada ↗** o **descartar**.
- Publicar abre un mini-formulario inline (dentro de la fila) donde la PM
  pega 1..N pares plataforma+link. Un click en "otra plataforma" suma
  hermanas del mismo video/concepto. Endpoint
  `POST /api/publicaciones/publicar`:
  - **Dedupe por URL** (normalizada: sin query/fragment/trailing slash).
    Si la URL ya está registrada, esa fila se salta y se devuelve como
    `saltadas`.
  - La propuesta original se **actualiza** a publicada (no se crea una
    nueva); las siguientes URLs entran como **hermanas** (INSERT nuevas)
    con el mismo `content_group_id` (nuevo UUID por grupo).
  - Se genera `utm_campaign` por pieza.
  - Fire-and-forget: dispara `POST /api/metrics/sync` para levantar
    métricas al instante.
- Descartar (`POST /api/publicaciones/descartar`): `status='descartada'` +
  `discard_reason` opcional → **crea learning draft** (`target_protocol_name='general'`).

### Módulo C — Contenido original
- Botón "+ contenido original" en el header de PublicacionesView y también
  como "+ agregar pieza a este episodio" desde LineageTab (Universo).
- `components/estrategia/ContenidoOriginalModal.jsx` (portal + Escape):
  madre / tipo / título / **libreto opcional** / ángulo / 1..N pares
  plataforma+link.
- **Sugerir ángulo con Claude** (`POST /api/publicaciones/sugerir-angulo`):
  si hay libreto ≥20 chars, un click en "sugerir ángulo" llama a Claude
  con el system prompt del ADN y devuelve
  `{ angle_type, confianza, razon }`. La sugerencia se auto-selecciona en
  el dropdown pero la PM puede cambiarla. Fuera de alcance: NO procesamos
  el libreto más allá de esto — se guarda como semilla para el futuro
  motor de aprendizaje (spec §8).
- Endpoint `POST /api/publicaciones/original`: crea las piezas con
  `creation_source='idea_propia'`, `libreto` en la columna nueva,
  `content_group_id` común, `status='publicada'`, `published_at=now()`.
  Dedupe por URL.

### Módulo D — Descartar desde producción
- El mismo `SendToPublicacionesBtn` en modo `discard=true` funciona en las
  3 tabs de producción. Genera propuesta directa en estado descartada
  (con razón opcional inline).
- Descartadas quedan **ocultas por defecto** en el Universo (viven solo
  en el filtro "Descartadas") y NO entran a la vista Publicaciones.

### Módulo E — Agrupación de hermanas (`content_group_id`)
- Nueva columna `content_group_id UUID` en `published_items` (migración).
- `GET /api/episodes/[id]/linaje` ahora devuelve `filas[]`: mezcla de
  `kind:'grupo'` (con `miembros[]` desglosados por plataforma + reach
  combinado + engagement promedio) y `kind:'individual'` (piezas
  sueltas). El campo viejo `piezas[]` se conserva por compatibilidad.
- `LineageTab.jsx` renderiza `GrupoRow` para grupos y `PiezaRow` para
  individuales. El GrupoRow muestra `×N` en el ícono, chip "N redes",
  alcance combinado, y expandible para ver cada red con sus métricas.
- `/api/radar` cuenta piezas y calcula reach/engagement **agrupando por
  content_group_id** — un mismo video en 3 redes ya no infla las
  cuentas. En "top piezas" y "mejores_all_time" cada tarjeta representa
  un grupo (con `platforms[]` listado).

### Módulo F — Episodio al aire
- Dentro de PublicacionesView, arriba del bloque del episodio, un banner
  naranja aparece cuando el episodio no tiene aún registrada su pieza
  `content_type='episodio'` en YouTube o Spotify. Se pegan los links y se
  crea (via `/api/publicaciones/publicar` con `content_type_override='episodio'`
  y `episode_id`) la fila que llena la **card madre** del Universo con
  sus métricas propias (Metricool/YouTube las jalan en el sync).

### Módulo G — Selector de rango en el Radar
- Selector segmentado (Esta semana · Este mes · Todo el tiempo) arriba
  del Radar. Default: **Este mes** (spec §3.G — los datos son
  reconstrucción histórica, 7 días fijos no aplica).
- `GET /api/radar?range=week|month|all&from=&to=`. Los subs se comparan
  contra la ventana previa; en `all` no hay comparación.
- Nueva sección **"Mejores de todos los tiempos"** debajo del bloque
  patrones: top 10 grupos por reach sobre todo el histórico (independiente
  del rango). Cada fila es clickeable → `PiezaPanel`.

### Higiene técnica cumplida (biblia §15)
- Todos los GET con `force-dynamic` + fetches del cliente con `cache: 'no-store'`.
- Modales via `createPortal` a `document.body` + cierre X/overlay/Escape.
- Tema claro cálido en todo; único dark = card madre del Universo.
- `product_id = CURRENT_PRODUCT_ID` en cada insert (episodes, published_items,
  subscribers, ideas, publicaciones). Lecturas filtran por producto.
- Dedupe por URL en `publicar` y `original`. Idempotencia por
  `origin_ref` en `enviar`.
- Descartadas ocultas por defecto en la vista Publicaciones y en el
  filtro "Todo" del Universo.
- Migración idempotente (`ADD COLUMN IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS`).
- `components/estrategia/` ya está en `content` de tailwind desde v0.7.

### Modal viejo retirado
- **`RegistrarPublicacionModal.jsx` eliminado** (era el que tiraba
  client-side exception, spec §1). Su lugar lo toman PublicacionesView
  (para lo que salió) + ContenidoOriginalModal (para lo original).

## (b) Qué te toca hacer

1. **Correr la migración en Supabase**. SQL editor:
   ```
   migrations/sprint-publicacion.sql
   ```
   Es idempotente y solo agrega 3 columnas + 2 índices a `published_items`.
   Verifica rápido:
   ```sql
   select column_name from information_schema.columns
   where table_name='published_items' and column_name in ('content_group_id','libreto','origin_ref');
   ```

2. **Revisar la rama y probar en dev**:
   ```bash
   git checkout sprint-publicacion
   git log --oneline main..HEAD
   npm run build    # 40 rutas, debe pasar
   npm run dev
   ```

3. **Deploy a Vercel** (rama, NO promover a main):
   ```bash
   git push origin sprint-publicacion
   ```
   No hay envs nuevas — todo el sprint usa creds que ya están.

## (c) Cómo usar la vista Publicaciones

**Flujo semanal típico** (la PM abre la app, hace todo en Publicaciones):

1. **Producción** (durante la semana): mientras el equipo trabaja en
   Minado/Medianos/Reels, cada ítem desarrollado tiene un botón
   `↗ Enviar` en la esquina. Un click lo manda a Publicaciones como
   propuesta. Si el ítem no va a salir, click en `Ban descartar` y se
   guarda con razón opcional como learning.
2. **Al final de la semana**, la PM va a **Publicaciones** en el sidebar.
   Ve, por episodio:
   - Banner naranja "¿ya salió?" si al episodio le falta YouTube/Spotify
     → pega los links → click en `Registrar`.
   - Lista de propuestas abiertas. Por cada una: click **publicada ↗**
     abre un mini-form → selecciona plataforma, pega URL → si el mismo
     video va a IG+TT+YT-Shorts, click en "otra plataforma" y agrega
     otro par → click en **Marcar publicada**. Se crean como hermanas
     con `content_group_id` común y aparecen como **una sola tarjeta**
     en el Universo (Módulo E).
   - Si decide no publicar, click en **descartar**, razón opcional →
     guardado como learning draft.
3. **Contenido original** (lo que la copy hace por fuera del sistema):
   click en `+ contenido original`. Selecciona la madre (episodio o
   manual), tipo, título. Si tiene un libreto pega el texto y hace click
   en `sugerir ángulo` → Claude propone uno; el modal auto-selecciona
   pero se puede cambiar. Luego pega el/los links → `Crear publicación`.

**Qué NO hace la vista** (spec §3 B):
- No re-escribe ángulo/madre/tipo — todo eso se hereda de la producción.
- No es un formulario largo — es una checklist rápida.
- No es un project manager con checklist de "grabado/editado/aprobado" —
  el nodo tiene 3 estados y ya.

**Qué protege contra "veo repetido"** (Módulo E):
- Cuando la PM publica un video en 3 redes, aparecen como UNA tarjeta en
  el Universo con `×3` y desglose expandible por plataforma. El reach y
  engagement son el combinado, no la suma inflada.
- El Radar también agrupa por `content_group_id`: si tu top 5 tiene un
  video en IG+TT+YT, ocupa 1 slot, no 3.

**Qué protege contra "doble contabilidad"** (dedupe por URL):
- Publicar la misma URL dos veces (por accidente) no crea una segunda
  fila. La respuesta trae `saltadas[]` con el `existing_id`.

## Fuera de alcance (spec §8, cumplido)
- YouTube Analytics API con OAuth (CTR / % visto / watch time) — sprint futuro.
- Motor real de insights (Aprendizajes del mes siguen demo).
- Encender la capa de identidad/target.
- Procesar el libreto más allá de sugerir el ángulo.
- Integración con las métricas de Rubén (Spotify sin API).
