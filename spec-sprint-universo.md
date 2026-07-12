# SPEC — Sprint Universo (v0.8)
## Para ejecutar con Claude Code sobre el repo `naranja-engine`
### Escrito 9 Julio 2026 · continúa el Sprint Estrategia (v0.7, ya en la rama `sprint-estrategia`)

---

## 0. CÓMO LEER ESTE SPEC

Autocontenido. Antes de escribir código, leer en este orden:
1. `cmo-engine-bible.md` (contexto + reglas + §15 "errores a no repetir")
2. `spec-sprint-estrategia.md` (lo construido en v0.7: published_items, metric_snapshots, subscribers, Radar, Público, Linaje, providers mock)
3. Este documento.

**Base sobre la que se construye:** el Sprint Estrategia (v0.7) ya está en el repo, rama `sprint-estrategia`. Este sprint la evoluciona. Trabajar sobre esa misma rama (o una nueva `sprint-universo` que parta de ella).

**Regla de oro:** NO romper el flujo de producción actual (episodios, ángulos, generación, tabs). Todo lo nuevo es aditivo o evolutivo sobre lo que ya funciona.

---

## 1. LA FILOSOFÍA (leer con atención — orienta todas las decisiones)

El sistema está migrando de "una fábrica de repurpose de episodios" a **"un producto y su universo de contenido"**. El verbo con el que se abre ya no es "produce", es **"observa tu universo"**. Producir sigue existiendo, pero se hace *desde adentro* del universo.

Principios que deben guiar cada decisión de UX:

1. **El modelo es un grafo; la representación NO es un grafo.** Todo está conectado (una pieza viene de una madre, tiene hermanas, salió de un ángulo, trajo suscriptores), pero NUNCA se muestra como una nube de nodos tipo Obsidian. Cada pantalla es un subgrafo pequeño y legible (un nodo y sus vecinos), con una columna vertebral clara. Grafo que se **navega**, no que se **contempla**.

2. **Las entidades son nodos clickeables, no filas muertas.** Una pieza, un episodio, un ángulo, un suscriptor: todos se pueden abrir, y desde cada uno se salta a sus vecinos. La regla: **cada nodo siempre sabe quiénes son sus vecinos y siempre hay forma de volver a casa.**

3. **La cara por defecto de un episodio sigue su ciclo de vida.** Episodio recién nacido (nada publicado) → abre en el **taller** (las tabs de producción, que son muy útiles). Episodio maduro (ya tiene piezas publicadas) → abre en su **universo** (el mapa). El taller no se elimina; deja de ser el default de un episodio maduro y se entra deliberadamente.

4. **Producir se hace dentro del mapa.** Clic en un nodo hace algo distinto según su estado: propuesta → la produces; publicada → ves resultados; descartada → ves el aprendizaje.

5. **NO es un project manager.** Nada de pipelines de status (aprobado→grabado→editado→publicado). El equipo ya tiene su Excel para el flujo operativo. El nodo solo lleva el estado estratégico: propuesta / publicada / descartada. Tres estados, punto.

6. **Insights como objetos, no gráficas sueltas.** (Aplica a "Aprendizajes del mes".) Cada insight es un claim + su evidencia + un "qué haría con esto".

7. **Tema claro cálido siempre** (§5 biblia). Único dark permitido: la card "madre" del universo. Tipografía DM Sans. Cards `rounded-xl`.

---

## 2. QUÉ SE CONSTRUYE — MÓDULOS

- **Módulo A** — Universo del episodio (evoluciona la tab Linaje → Universo, con estados y clic-según-estado).
- **Módulo B** — Navegabilidad del grafo (piezas/episodios/ángulos clickeables y traversables).
- **Módulo C** — Aprendizajes del mes (carrusel de 6–8 insights senior, hardcodeados/inventados, como preview vendible).
- **Módulo D** — Costura multi-producto (`product_id`, sin plataforma multi-tenant).
- **Módulo E** — Provider real de YouTube (independiente y opcional; usa la API key que JP ya tiene).

---

## 3. SCHEMA (Supabase)

Migración nueva: `migrations/sprint-universo.sql`. **Recordar RLS off en tablas nuevas (§15 #13).** Idempotente.

```sql
-- 3.1 Estados de pieza en published_items (propuesta / publicada / descartada)
ALTER TABLE published_items ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'publicada';
  -- 'publicada' | 'propuesta' | 'descartada'
ALTER TABLE published_items ADD COLUMN IF NOT EXISTS discard_reason TEXT;
  -- solo para status='descartada'; también alimenta un learning

-- 3.2 Costura multi-producto (barata; NO es multi-tenant)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Insert determinístico del producto CMO con UUID fijo (el app lo usa como constante)
INSERT INTO products (id, name, slug)
VALUES ('c0000000-0000-4000-8000-000000000001', 'CMO Stories', 'cmo-stories')
ON CONFLICT (id) DO NOTHING;

-- product_id en las tablas core (nullable + default al producto CMO para no romper inserts)
ALTER TABLE episodes         ADD COLUMN IF NOT EXISTS product_id UUID DEFAULT 'c0000000-0000-4000-8000-000000000001';
ALTER TABLE newsletters      ADD COLUMN IF NOT EXISTS product_id UUID DEFAULT 'c0000000-0000-4000-8000-000000000001';
ALTER TABLE published_items  ADD COLUMN IF NOT EXISTS product_id UUID DEFAULT 'c0000000-0000-4000-8000-000000000001';
ALTER TABLE subscribers      ADD COLUMN IF NOT EXISTS product_id UUID DEFAULT 'c0000000-0000-4000-8000-000000000001';
ALTER TABLE ideas            ADD COLUMN IF NOT EXISTS product_id UUID DEFAULT 'c0000000-0000-4000-8000-000000000001';

-- Backfill de lo existente al producto CMO
UPDATE episodes        SET product_id = 'c0000000-0000-4000-8000-000000000001' WHERE product_id IS NULL;
UPDATE newsletters     SET product_id = 'c0000000-0000-4000-8000-000000000001' WHERE product_id IS NULL;
UPDATE published_items SET product_id = 'c0000000-0000-4000-8000-000000000001' WHERE product_id IS NULL;
UPDATE subscribers     SET product_id = 'c0000000-0000-4000-8000-000000000001' WHERE product_id IS NULL;
UPDATE ideas           SET product_id = 'c0000000-0000-4000-8000-000000000001' WHERE product_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_published_items_status ON published_items(status);
```

**Constante de producto:** el app usa `CURRENT_PRODUCT_ID` (env, default `c0000000-0000-4000-8000-000000000001`). Todo insert de episodes/newsletters/published_items/subscribers/ideas debe setear `product_id = CURRENT_PRODUCT_ID`. Todo read (Radar, Público, Universo, listas del sidebar) debe filtrar por `product_id = CURRENT_PRODUCT_ID`. La UI NO muestra selector de producto — es CMO-only en la experiencia. La costura solo existe para no reescribir el schema el día que llegue un segundo producto.

---

## 4. MÓDULO A — UNIVERSO DEL EPISODIO

Evoluciona la tab **Linaje** (v0.7) y la renombra a **Universo** (`components/estrategia/LineageTab.jsx` → puede quedarse el archivo, renombrar el label a "Universo 🌐" en el tab bar). Consume `GET /api/episodes/[id]/linaje`, que ahora devuelve piezas de TODOS los estados, no solo publicadas.

### Estados y comportamiento (clic-según-estado)
El mapa (mismo árbol madre→piezas de v0.7) ahora muestra piezas en 3 estados, con el estilo del mockup aprobado:
- **publicada** — card blanco borde verde, muestra métricas; clic → **panel de detalle de la pieza** (ver Módulo B).
- **propuesta** — card borde punteado gris, "propuesta del sistema"; clic → lleva al taller a producir esa pieza (a la tab de producción correspondiente: reel→Reels, mediano→Medianos, minado→Minado, etc.). Acción visible: "→ producir".
- **descartada** — card gris tenue, título tachado; clic → muestra la razón (`discard_reason`) y el aprendizaje asociado. Acción: "no publicado · aprendizaje".

Grosor/color del stub por `strength` (de v0.7): verde 3px (trajo suscriptores) / ámbar 2px (alcance sin conversión) / gris 1px (débil o no publicada). Franja "Resultado del universo" abajo (alcance total · N suscriptores). Leyenda de estados al pie.

Filtro segmentado arriba: **Todo · Publicado · En producción · Propuestas** (filtra los nodos por estado).

Cada card de pieza **nombra su madre** de forma discreta y es consistente con el resto del grafo.

### Cara por defecto según ciclo de vida
En el workspace del episodio (`app/page.js`):
- Si el episodio **tiene ≥1 `published_items` con status='publicada'** (maduro) → la tab activa por defecto al abrirlo es **Universo**.
- Si **no** (fresco) → la tab por defecto es la primera de producción (Episodio), como hoy.
- Las tabs de producción (Episodio · Reels · Intros · Minado · Medianos) **se conservan intactas** — son "el taller". Universo es una tab más, que además es el default de los maduros. (En un sprint futuro se envolverán en un chrome de "modo producción" más explícito; por ahora basta con el default por ciclo de vida.)

### Registrar / descartar piezas
El `RegistrarPublicacionModal` de v0.7 gana un selector de `status`:
- Registrar como **publicada** (con URL, como hoy).
- Registrar como **propuesta** (sin URL).
- Marcar una pieza como **descartada** con `discard_reason` → además crea un `learning` draft (reusar tabla `learnings`; `target_protocol_name` puede ir null o 'general') con la razón, para que el "no publicar" también enseñe.

---

## 5. MÓDULO B — NAVEGABILIDAD DEL GRAFO

El objetivo: matar la sensación de "vistas separadas sin conexión". Todo lo relevante es clickeable y lleva a su vecino.

### Panel de detalle de pieza (`components/estrategia/PiezaPanel.jsx`)
Panel lateral tipo Notion (`createPortal`, slide-in, cierre X/overlay/Escape — §15 #11). Se abre al clickear una pieza publicada (desde Universo, desde Radar, desde donde sea). Muestra:
- Título, tipo, plataforma, link al post.
- Métricas (de `latest_metrics`), y si hay serie temporal, un mini-histórico.
- **Su madre** (nombrada, clickeable → abre el Universo de esa madre).
- **Sus hermanas** (otras piezas de la misma madre, clickeables).
- **Su ángulo** (chip clickeable → vista de ángulo, ver abajo).
- Fechas.
Nuevo endpoint: `GET /api/published/[id]` (force-dynamic) que arma pieza + métricas + madre + hermanas + ángulo.

### Radar clickeable
En `RadarView.jsx`:
- Cada pieza de "top piezas" → abre el PiezaPanel.
- "Último episodio" y su "Ver linaje" → navega al workspace de ese episodio + tab Universo.

### Ángulo como nodo (`components/estrategia/AnguloView.jsx`)
Los `angle_type` son un eje de navegación de primera clase. Un chip de ángulo (en una pieza, en el PiezaPanel, o en las barras de "Qué funciona" del Radar) es clickeable y abre una vista/panel que lista **todas las piezas de ese ángulo a través de todos los episodios**, con sus métricas y un agregado (alcance total, engagement promedio, suscriptores). Endpoint: `GET /api/angulos/[angle_type]` (force-dynamic) → piezas del producto con ese `angle_type` + agregados.

---

## 6. MÓDULO C — APRENDIZAJES DEL MES (preview de "narrar")

Un carrusel de insights en modo historia, **senior e insightful**, NO estilo Spotify Wrapped de daticos de vanidad. Cada pantalla = un claim afilado + evidencia mínima + un "qué haría con esto".

### Alcance de ESTE sprint
Los insights son **hardcodeados / inventados** (6–8), definidos en un archivo de datos (`lib/aprendizajes-demo.js`). Algunos con sabor "computable" (formato vs conversión), otros aspiracionales (identidad/target) — todos como *statement de hacia dónde vamos*. **En el código, marcar claramente que son demo/placeholder** (comentario + una etiqueta sutil "demo" en la UI que se pueda quitar después) para que nadie los confunda con datos vivos. El motor real que *calcula* insights NO se construye acá (conversación futura).

### UI (`components/estrategia/AprendizajesDelMes.jsx`)
- Botón de entrada: en el Radar, arriba a la derecha (junto a "Registrar publicación"), un botón sutil **"Aprendizajes del mes"**.
- Al abrir: vista tipo presentación (puede ser full-screen dentro de la app), chrome mínimo:
  - Header: "Aprendizajes del mes · [mes]" + progreso (ej. "2 / 6") + salir (X).
  - Cuerpo: **una idea por pantalla** — eyebrow ("LO CONTRAINTUITIVO DEL MES"), titular grande (25px/500), subtexto con el dato, una viz mínima (barras simples), y un callout naranja "QUÉ HARÍA CON ESTO".
  - Footer: anterior / dots / siguiente.
- Navegación con flechas del teclado + clicks. Tono editorial, restrained, mucho aire. Referencia visual: el mockup aprobado por JP (barras que muestran la inversión alcance vs conversión; callout de recomendación).

### Los 6–8 insights demo (contenido sugerido, Claude Code puede refinar el copy)
Cada uno: `{ eyebrow, titular, subtexto, viz (tipo + datos), recomendacion }`. Sugerencias:
1. **Formato**: "Tu formato más largo es el que mejor convierte." Medianos 2.4× más suscriptores/pieza que reels, con 5× menos alcance. → producir más medianos.
2. **Concentración**: "El 60% de tu alcance vino de 3 piezas." → entender qué tienen en común y repetirlo.
3. **Ángulo**: "Los ángulos de 'errores/mitos' rinden el doble." → priorizarlos en el próximo episodio.
4. **Cadencia**: "Tu ritmo bajó: 8 piezas vs 14 el mes pasado." → el universo se enfría, subir cadencia.
5. **Plataforma**: "LinkedIn te trae menos alcance pero mejor audiencia." (aspiracional) → invertir criterio, no volumen.
6. **Identidad** (aspiracional, statement de futuro): "3 tomadores de decisión de marketing entraron por un solo mediano." → la profundidad atrae a quien importa.
7. **Madre**: "El episodio con invitada CMO generó 2× más universo que el promedio." → perfil de invitado importa.
8. **Cierre**: una pantalla de síntesis — "Este mes: menos volumen, más profundidad." + la apuesta del próximo mes.

---

## 7. MÓDULO D — COSTURA MULTI-PRODUCTO

Ver §3 (schema). Del lado del código:
- `lib/product.js`: exporta `CURRENT_PRODUCT_ID` (de `process.env.CURRENT_PRODUCT_ID` con default al UUID de CMO).
- Todo insert en episodes/newsletters/published_items/subscribers/ideas: setear `product_id = CURRENT_PRODUCT_ID`.
- Todo read (Radar, Público, Universo, listas del sidebar, ángulos): filtrar `product_id = CURRENT_PRODUCT_ID`.
- Sin selector de producto en la UI. Sin auth, roles, ni onboarding. Es solo la costura.

---

## 8. MÓDULO E — PROVIDER DE YOUTUBE (independiente, opcional)

Implementar `lib/metrics/youtube.js` (hoy stub) usando la **YouTube Data API v3** con API key (JP ya la tiene). Camino simple, sin OAuth:
- Env: `YOUTUBE_API_KEY`.
- Para cada `published_item` con `platform='youtube'`: extraer el `videoId` de `published_url` (el valor después de `v=`) o de `platform_post_id`. Llamar `GET https://www.googleapis.com/youtube/v3/videos?part=statistics&id=<videoId>&key=<API_KEY>`.
- Mapear: `viewCount` → métrica `views` (y usarla como alcance), `likeCount`+`commentCount` → para `engagement_rate = (likes+comments)/views`. Devolver `[{metric,value}]` según el contrato de `lib/metrics/index.js`.
- Mantener `METRICS_PROVIDER=mock` como default. El provider real de YouTube se activa cuando JP setee `YOUTUBE_API_KEY` y enrute youtube→real (dejar el enrutamiento listo en `index.js`, activable por env). Instagram/LinkedIn/TikTok (Metricool) y Spotify siguen como stubs — fuera de este sprint.

---

## 9. ORDEN DE CONSTRUCCIÓN SUGERIDO

1. Migración `migrations/sprint-universo.sql` (estados + products + product_id + backfill). Verificar RLS.
2. `lib/product.js` + aplicar `CURRENT_PRODUCT_ID` en inserts/reads existentes de v0.7 y del flujo de producción.
3. Módulo A: evolucionar Universo (estados, clic-según-estado, default por ciclo de vida, registrar/descartar).
4. Módulo B: `PiezaPanel`, endpoints `GET /api/published/[id]` y `GET /api/angulos/[angle_type]`, Radar clickeable, `AnguloView`.
5. Módulo C: `AprendizajesDelMes` + `lib/aprendizajes-demo.js` + botón en Radar.
6. Módulo E: `lib/metrics/youtube.js` (dejar activable por env).
7. Actualizar `scripts/seed-estrategia.mjs`: agregar algunas piezas en estado `propuesta` y `descartada` para que el Universo muestre los 3 estados vivos.
8. `npm run build`, arreglar lo que rompa, y actualizar `NOTAS-SPRINT.md`.

---

## 10. GUARDRAILES / ERRORES A NO REPETIR

- **No romper producción.** Los tabs y el flujo de generación de v0.6 siguen funcionando igual.
- RLS off en tablas nuevas; `product_id` con default para no romper inserts existentes (§15 #13).
- `force-dynamic` + `cache:'no-store'` en los GET nuevos (§15 #15).
- Paneles vía `createPortal` + cierre X/overlay/Escape (§15 #11).
- Si se crean componentes en un directorio nuevo, agregarlo a `tailwind.config.js content` (§15 #14).
- Tema claro cálido; único dark = card madre. DM Sans. Nada de tema oscuro.
- Los insights de "Aprendizajes del mes" son DEMO/hardcodeados y deben estar marcados como tal en código y con una etiqueta sutil removible en UI.
- **No construir un project manager:** el nodo tiene 3 estados, sin checklist de pipeline.
- La capa de identidad/target sigue **latente** (columnas sí, UI no) — este sprint no la enciende.

---

## 11. DEFINICIÓN DE HECHO

- Abrir un episodio maduro cae en su **Universo**; uno fresco cae en el **taller** (tabs).
- El Universo muestra piezas en 3 estados con clic-según-estado (propuesta→producir, publicada→detalle, descartada→aprendizaje).
- Desde el Radar, piezas y episodios son clickeables y llevan a su detalle/universo. Los ángulos son navegables (vista de ángulo cross-episodio).
- "Aprendizajes del mes" abre un carrusel de 6–8 insights senior (demo), accesible desde el Radar.
- `product_id` existe en las tablas core, backfilleado a CMO; todo filtra por `CURRENT_PRODUCT_ID`; la UI sigue CMO-only.
- `lib/metrics/youtube.js` implementado y activable por env (sin activar por default).
- Build pasa. Nada mergeado a `main`.

---

## 12. LO QUE NO ENTRA EN ESTE SPRINT (explícito)

- El motor real que **calcula** insights (Aprendizajes del mes son inventados por ahora).
- El modo **narrar** completo (esto es solo el preview).
- Encender la capa de **identidad/target** (sigue latente).
- Providers de **Metricool y Spotify** (solo YouTube).
- La **plataforma multi-tenant** real (auth, roles, onboarding, config por cliente, billing). Solo la costura `product_id`.
- Chrome explícito de "modo producción" / taller (por ahora basta el default por ciclo de vida; el pulido viene después).
