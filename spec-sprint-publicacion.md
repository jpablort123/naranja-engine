# SPEC — Sprint Publicación (v0.9)
## Para ejecutar con Claude Code sobre el repo `naranja-engine`
### Escrito 17 Julio 2026 · continúa el Sprint Universo (v0.8, ya en `main`)

---

## 0. CÓMO LEER ESTE SPEC

Autocontenido. Antes de escribir código, leer en este orden:
1. `cmo-engine-bible.md` (contexto + §1 reencuadre "producto y su universo" + §15 errores a no repetir).
2. `spec-sprint-estrategia.md` y `spec-sprint-universo.md`.
3. Este documento.

Base: v0.8 en `main`. Trabajar en rama nueva `sprint-publicacion` a partir de `main`. NO mergear a main (JP lo hace tras revisar).

**Regla de oro:** no romper el flujo de producción existente ni la capa de estrategia (Radar/Universo/Público). Todo es aditivo/evolutivo.

---

## 1. EL PROBLEMA QUE RESUELVE

Hoy, para que el sistema sepa qué se publicó, hay que **registrar cada pieza desde cero** (el modal "Registrar publicación", que además está **roto** — tira client-side exception). Eso obliga a re-escribir el ángulo, la madre, el tipo — cosas que el sistema **ya sabe** porque la pieza nació de la producción del episodio. Es el modelo equivocado.

**El modelo correcto:** publicar ≠ crear desde cero. Publicar = **marcar como publicada una pieza que ya existe** (una propuesta) y pegarle el link. El ángulo/madre/tipo se heredan. Y la trazabilidad propuesta → publicada/descartada, que hoy es imposible (el contenido generado vive en JSONB de producción, desconectado de `published_items`), se vuelve automática.

---

## 2. EL MODELO EN TRES PARTES

1. **Las piezas nacen como PROPUESTAS.** Cuando el equipo *selecciona/desarrolla* contenido en producción (medianos desarrollados, clips de minado, reels armados), esos ítems se convierten en nodos `published_items` con `status='propuesta'`, heredando `origin_*` (madre) + `angle_type` + `creation_source='sistema'`. (Solo lo seleccionado/desarrollado, NO los 20 ángulos crudos.)
2. **Vista semanal "Publicaciones"** (reemplaza el modal roto): la PM, una vez por semana, ve las propuestas abiertas y marca cada una **publicada** (plataforma + link, puede ser varias) o **descartada** (razón opcional → learning). Nunca toca ángulo/madre/tipo.
3. **Contenido original**: para lo que la copy hace por fuera del sistema (frecuente en reels), un botón "+ contenido original" que crea la pieza con `creation_source='idea_propia'`.

---

## 3. MÓDULOS

### Módulo A — Piezas nacen como propuestas (el puente producción → published_items)

- Acción **"Enviar a publicaciones"** en los ítems de producción ya desarrollados/seleccionados: cada **mediano desarrollado** (`episodes.medianos`), cada **clip de minado** (`episodes.minado.momentos`), cada **reel armado** (`episodes.repurpose_content.reels_v2`) y **post de LinkedIn** generado. (Reutilizar el patrón del viejo "Enviar a Parrilla" / "Al banco", ver biblia.) La acción crea un `published_items` con:
  - `status='propuesta'`, `origin_type='episode'`, `origin_id`=episodio, `origin_label`=nombre, `angle_type` heredado del ítem, `content_type` según el ítem, `creation_source='sistema'`, `title` del ítem. Sin `platform`/`published_url` todavía.
- Idempotencia: no crear dos propuestas para el mismo ítem de producción (guardar una referencia al ítem origen, ej. en `origin_ref` o un hash, para no duplicar al reenviar).
- Estas propuestas aparecen en el filtro "Propuestas" del Universo del episodio (ya existe) y en la vista semanal (Módulo B).

### Módulo B — Vista semanal "Publicaciones" (la reconciliación) — NUEVA vista

Nuevo item en el sidebar (grupo Estrategia) **"Publicaciones"**, o accesible desde el Radar. Es la superficie principal del flujo. Muestra, agrupado por episodio/semana:

- **Primero, el episodio-al-aire** (ver Módulo F): "¿este episodio ya salió? → pega el link de YouTube / Spotify".
- **Luego, las propuestas abiertas** (status='propuesta', sin publicar/descartar). Por cada una, dos acciones rápidas:
  - **Publicada**: abre un input donde se pegan **uno o varios pares plataforma+link** (IG, TikTok, YouTube/Shorts, LinkedIn). Al guardar, la propuesta pasa a `status='publicada'` para la primera, y **se crean piezas hermanas** (una `published_items` por plataforma adicional), todas compartiendo un `content_group_id` (Módulo E). Se genera `utm_campaign` (lib/utm.js). Se dispara `metrics/sync` para esas piezas.
  - **Descartada**: `status='descartada'` + `discard_reason` opcional → crea un `learning` draft con la razón.
- **Botón "+ contenido original"** (Módulo C).
- La vista prioriza velocidad: la PM solo pega links o descarta; NO edita ángulo/madre/tipo. Estilo checklist, no formulario.
- **Dedupe por URL:** antes de crear una pieza publicada, si ya existe un `published_items` con esa `published_url` (normalizada), NO crear duplicado (evita doble contabilidad — preocupación explícita de JP).

Endpoints: `GET /api/publicaciones` (propuestas abiertas + episodios sin registrar, filtrados por producto y rango), `POST /api/publicaciones/publicar` (marca publicada + crea hermanas), `POST /api/publicaciones/descartar`.

### Módulo C — Contenido original

Botón "+ contenido original" en la vista de Publicaciones (y también dentro del Universo del episodio). Modal ligero:
- Elegir **episodio** (madre) — obligatorio (o "manual" si no aplica).
- **plataforma + link** (uno o varios, como Módulo B).
- **content_type** (reel por defecto).
- **Libreto (opcional):** textarea. Si se llena, un endpoint `POST /api/publicaciones/sugerir-angulo` llama a Claude (Anthropic, ya configurado) para **sugerir el `angle_type`** a partir del libreto (así la copy no lo elige). Si no se llena, se pide el ángulo a mano.
- Al guardar: crea `published_items` con `creation_source='idea_propia'`, el libreto en la columna `libreto`, `status='publicada'`, y las hermanas por plataforma.
- **No procesar el libreto más allá de sugerir el ángulo.** Capturarlo queda como semilla para el futuro motor de aprendizaje (principio "capturar lo irreemplazable barato"); no construir aprendizaje sobre él ahora.

### Módulo D — Descartar desde producción

En las tabs de producción (Minado, Medianos, Reels), cada ítem desarrollado/seleccionado gana un **"descartar"**. Al descartar:
- Si ya tiene propuesta → marca esa propuesta `status='descartada'`.
- Si no → crea la propuesta directamente en `status='descartada'`.
- Las descartadas quedan **ocultas por defecto** (viven solo en el filtro "Descartadas" del Universo; no aparecen en "Todo"/"Publicado" ni en la vista de Publicaciones). Mantiene el universo limpio.

### Módulo E — Agrupación de hermanas (mismo video, varias redes)

- Nueva columna `content_group_id UUID` en `published_items`. Las piezas creadas juntas (mismo video/concepto a varias plataformas) comparten el mismo `content_group_id`.
- En el **Universo/linaje**, las piezas con el mismo `content_group_id` se renderizan como **UNA sola tarjeta** con desglose por plataforma adentro (IG / TikTok / YouTube, cada una con su alcance y engagement), en vez de N filas que parecen duplicadas. Muestra también el **combinado** (suma de alcance) + el por-plataforma. Esto arregla el "¿hay unas repetidas?" que confundió a JP.
- El `PiezaPanel` de una de esas piezas muestra sus hermanas de grupo con sus métricas por red.

### Módulo F — Episodio al aire

- El episodio aparece como el primer nodo de su universo y como primer ítem en la vista de Publicaciones: "¿ya salió? pega el link de YouTube / Spotify".
- Al pegarlo, se crea un `published_items` `content_type='episodio'`, plataforma youtube (y/o spotify), `origin_id`=el episodio, con la URL → llena la **card madre** con sus métricas propias (hoy solo Ep. 001 la tiene). Metricool/YouTube jalan sus métricas.

### Módulo G — Selector de rango temporal en el Radar

- Reemplazar el "últimos 7 días" fijo por un **selector de rango**: Esta semana · Este mes · Todo el tiempo · (rango custom opcional). Default sugerido: **Este mes** (los datos son reconstrucción histórica; 7 días no aplica).
- Agregar una lectura de **"mejores de todos los tiempos"** (top piezas por alcance/engagement sin ventana), que responde el "quiero ver a qué le ha ido mejor en general".
- El endpoint `/api/radar` acepta `from`/`to`.

---

## 4. SCHEMA (migración `migrations/sprint-publicacion.sql`, idempotente, RLS off recordatorio)

```sql
ALTER TABLE published_items ADD COLUMN IF NOT EXISTS content_group_id UUID;
ALTER TABLE published_items ADD COLUMN IF NOT EXISTS libreto TEXT;
ALTER TABLE published_items ADD COLUMN IF NOT EXISTS origin_ref TEXT;  -- referencia al ítem de producción origen (para idempotencia del puente)
CREATE INDEX IF NOT EXISTS idx_published_items_content_group ON published_items(content_group_id);
```
(`status`, `discard_reason`, `creation_source` ya existen desde v0.8.)

---

## 5. QUÉ REEMPLAZA / ARREGLA

- El modal **"Registrar publicación" (roto)** se retira; su función la cubren la vista de Publicaciones (Módulo B) + "contenido original" (Módulo C).
- El "+ agregar pieza a este episodio" del Universo se mantiene pero apunta al mismo flujo nuevo (marcar publicada / contenido original), no al modal viejo.

---

## 6. GUARDRAILES (biblia §15)

- No romper producción ni la capa de estrategia.
- RLS off en cualquier tabla nueva (no hay tablas nuevas aquí, solo columnas). Migración idempotente.
- `force-dynamic` + `no-store` en los GET nuevos.
- Paneles/modales vía `createPortal` + cierre X/overlay/Escape.
- Tema claro cálido (único dark = card madre). DM Sans.
- **Dedupe por URL** al publicar (evita doble contabilidad).
- `product_id = CURRENT_PRODUCT_ID` en todo insert; filtrar por producto en lecturas.
- Descartadas ocultas por defecto.

---

## 7. DEFINICIÓN DE HECHO

- Los ítems desarrollados/seleccionados de producción se pueden "enviar a publicaciones" → nacen como propuestas con su linaje heredado.
- La vista **Publicaciones** lista propuestas abiertas + episodios sin registrar; la PM marca publicada (multi-link) o descartada sin re-escribir ángulo/madre.
- Publicar el mismo video en varias redes = un solo gesto → piezas hermanas agrupadas por `content_group_id`, que en el linaje se ven como UNA tarjeta con desglose por plataforma.
- "+ contenido original" crea piezas `idea_propia`, con libreto opcional que auto-sugiere el ángulo.
- Descartar desde producción funciona y las descartadas quedan ocultas.
- La card madre se llena al registrar el episodio como pieza tipo 'episodio'.
- El Radar tiene selector de rango + "mejores de todos los tiempos".
- Dedupe por URL activo. Build pasa. Nada mergeado a main.

---

## 8. FUERA DE ALCANCE (explícito)

- **YouTube Analytics API / OAuth** (CTR, % medio visto, watch time) — sprint futuro, requiere setup de OAuth de JP.
- El **motor real de insights** (Aprendizajes del mes siguen demo).
- Encender la capa de **identidad/target**.
- Procesar el libreto más allá de sugerir el ángulo (aprendizaje sobre contenido original = futuro).
- Integración de las métricas de profundidad del sistema de Rubén (Spotify sin API).
