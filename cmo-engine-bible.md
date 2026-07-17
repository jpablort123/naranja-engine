# CMO ENGINE — Biblia del Proyecto
## (Archivo de contexto para cualquier sesión futura de desarrollo)
### Última actualización: 17 Julio 2026 · versión de la app: **v0.8 (Sprint Universo, en producción)**

---

## 1. QUÉ ES CMO ENGINE

### 1.1 El reencuadre (v0.8) — LEER PRIMERO

Después del Sprint Estrategia (v0.7) y del Sprint Universo (v0.8), el sistema **cambió de identidad**. Dejó de ser principalmente "una fábrica de repurpose de episodios" y pasó a ser **"un producto y su universo de contenido"**. No es cosmético: reordena la navegación, el propósito y el vocabulario que usa el equipo. Toda decisión de diseño futura debe pasar por este filtro.

**Los 8 principios rectores nuevos:**

1. **El objeto central es el producto y su universo**, no el episodio-como-workspace. El verbo con el que se abre el sistema es **"observa tu universo"**. Producir sigue existiendo, pero se hace *desde adentro* del universo.
2. **El modelo es un grafo; la representación NO es un grafo.** Todo está conectado (pieza → madre → hermanas → ángulo → suscriptores), pero nunca se muestra como nube de nodos tipo Obsidian. Cada pantalla es un subgrafo pequeño y legible. Grafo que se **navega**, no que se **contempla**. Regla dura: cada nodo sabe quiénes son sus vecinos y siempre hay forma de volver a casa.
3. **Las entidades son nodos clickeables** (pieza, episodio, ángulo, suscriptor), no filas muertas.
4. **La cara por defecto de un episodio sigue su ciclo de vida.** Fresco (nada publicado) → abre en el **taller** (las tabs de producción). Maduro (ya tiene piezas publicadas) → abre en su **Universo** (el mapa). El taller no se elimina; deja de ser el default de un episodio maduro y se entra deliberadamente.
5. **Producir se hace dentro del mapa.** Clic en un nodo hace algo según su estado: propuesta → producir; publicada → ver resultados; descartada → ver el aprendizaje.
6. **NO es un project manager.** Nada de pipelines de status (aprobado→grabado→editado). El equipo tiene su Excel para eso. El nodo lleva 3 estados y ya: **propuesta / publicada / descartada**.
7. **Los ángulos son un eje de navegación de primera clase** — un `angle_type` clickeable muestra todas las piezas de ese ángulo a través de episodios (cross-episodios).
8. **Insights como objetos** (claim + evidencia + "qué haría con esto"), no gráficas sueltas.

**Producción / estrategia como CICLO DE VIDA, no como "dos modos".** JP originalmente propuso "dos modos con toggle". La conclusión: no son dos apps con un toggle; son dos caras del mismo objeto según su estado. Nace en taller, se gradúa a activo estratégico al publicar la primera pieza. El "modo producción" es un cuarto (taller) que se entra deliberadamente, anidado dentro del universo — no un muro paralelo.

**La Parrilla se DISOLVIÓ** (decisión tomada en el Sprint Universo). Estaba confundiendo 3 trabajos distintos: (1) planear/programar → se va a **Metricool** (no reconstruir); (2) seguimiento de producción → es el estado del nodo, sin checklist de pipeline; (3) registro de lo publicado + resultados → **es el Universo**. No queda una "parrilla". El acto de publicación (pegar link / descartar con razón) es la bisagra que gradúa un episodio de taller a universo, y ocurre en el mapa. Ver §10.

**Narrar** es una tercera postura (además de producir y observar): convertir el universo en una historia caminada para una audiencia (cliente, equipo). Es la superficie de venta/retención de la agencia. Ya existe un **preview** vivo — "Aprendizajes del mes" (§4 Sprint Universo). El modo Narrar completo es futuro.

### 1.2 Qué es CMO Engine (descripción funcional)

Sistema de postproducción de podcasts construido para JP (Juan Pablo) de Naranja Media. Toma transcripciones de episodios de CMO Stories y genera todo el contenido de postproducción: títulos, descripciones, intros leídos, contenido para redes sociales, y minado de micro-contenido. Desde v0.7-v0.8 también **mide** ese contenido (published_items + métricas de YouTube/Metricool) y lo **narra** en el Universo del episodio.

**El diferenciador principal** es un sistema de protocolos que aprende: el usuario da feedback sobre el contenido generado, los aprendizajes se acumulan silenciosamente durante la sesión, y al final el usuario revisa y aprueba cuáles son aprendizajes reales vs circunstanciales. Los aprobados se inyectan en los protocolos como capa adicional. Con cada episodio, el output mejora.

**Primero se construye para JP.** Si después de semanas es increíble, se evalúa vender como SaaS a otros podcasters y creadores de YouTube. La costura `product_id` (§3) ya está lista para el día que llegue un segundo producto — la UI actual sigue **CMO-only**.

---

## 2. STACK TÉCNICO

- **Frontend + API:** Next.js 14 (App Router) en Vercel
- **Base de datos:** Supabase (PostgreSQL) — proyecto `cmo-engine`, URL: `https://vuujvuyxvsbcewbpdgae.supabase.co`
- **Generación:** API de Anthropic (Claude Sonnet, modelo `claude-sonnet-4-6`) via server-side API routes (`@anthropic-ai/sdk`)
- **Repo:** GitHub — `github.com/jpablort123/naranja-engine`
- **Vercel URL:** la URL que Vercel asignó al proyecto naranja-engine
- **API Key Anthropic:** clave "naranja-engine" en la consola de Anthropic (console.anthropic.com)

### Variables de entorno en Vercel (ya configuradas)
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL` = `https://vuujvuyxvsbcewbpdgae.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = la anon key del proyecto cmo-engine
- `DESCRIPT_API_TOKEN` = token de la API de Descript (Production + Preview). Atado a un solo Drive de Descript
- `NEXT_PUBLIC_SITE_URL` = `https://naranja-engine.vercel.app` (solo Production) — URL pública para el webhook de Descript
- `CRON_SECRET` = secreto que protege el endpoint del cron; Vercel lo manda como `Authorization: Bearer` al disparar el cron (solo Production)

### Variables de entorno del Sprint Estrategia / Universo (v0.7-v0.8)
- `METRICS_PROVIDER` = `youtube` (o cualquier valor `!= 'mock'` para activar providers reales; `mock` para desarrollo/UI viva sin APIs)
- `YOUTUBE_API_KEY` = API key de YouTube Data API v3 desde Google Cloud (sin OAuth). Se activa cuando `METRICS_PROVIDER != 'mock'`
- `METRICOOL_TOKEN` = token de Metricool (Account Settings → API). Se manda en header `X-Mc-Auth`
- `METRICOOL_USER_ID` = `4844353`
- `METRICOOL_BLOG_ID` = `6285498` (blogId del brand de CMO — de la URL de Analítica)
- `METRICOOL_WINDOW_DAYS` = opcional, ventana hacia atrás para pedir posts (default 365 días)
- `METRICOOL_DEBUG` = opcional, `1` imprime `MATCH/NO MATCH` por pieza durante el sync
- `CURRENT_PRODUCT_ID` = opcional (default al UUID de CMO `c0000000-0000-4000-8000-000000000001`). Se lee desde `lib/product.js`

---

## 3. TABLAS DE SUPABASE (ya creadas)

```sql
episodes (id UUID PK, name TEXT, transcript TEXT, transcript_srt TEXT, mapa JSONB, titulos JSONB, descripcion_spotify TEXT, descripcion_youtube TEXT, thumbnails JSONB, ideas JSONB, selected_ideas JSONB, repurpose_content JSONB, minado JSONB, medianos_candidatos JSONB, medianos_seleccionados JSONB, medianos JSONB, descript_project_id TEXT, descript_composition_id TEXT, descript_composition_name TEXT, status TEXT, created_at, updated_at)

descript_jobs (id UUID PK, episode_id UUID FK, descript_project_id TEXT, clip_type TEXT, clip_ref TEXT, composition_name TEXT, prompt TEXT, meta JSONB, descript_job_id TEXT, descript_composition_id TEXT, descript_response JSONB, status TEXT, error_message TEXT, ai_credits_used INTEGER, started_at, completed_at, created_at, updated_at)

newsletters (id UUID PK, name TEXT, articulo TEXT, resumen JSONB, ideas JSONB, selected_ideas JSONB, repurpose_content JSONB, status TEXT, created_at, updated_at)

protocolos (id UUID PK, name TEXT, slug TEXT UNIQUE, content TEXT, version INTEGER, created_at, updated_at)

learnings (id UUID PK, episode_id UUID FK, newsletter_id UUID FK, section TEXT, original_content TEXT, feedback TEXT, proposed_change TEXT, target_protocol_id UUID FK, target_protocol_name TEXT, status TEXT default 'draft', created_at)

protocol_history (id UUID PK, protocol_id UUID FK, previous_content TEXT, new_content TEXT, learning_ids JSONB, summary TEXT, created_at)

ideas (id UUID PK, title TEXT, description TEXT, notes TEXT, category TEXT default 'undecided', temperature TEXT default 'cold', formats JSONB, angle TEXT, origin_url TEXT, origin_type TEXT, origin_id TEXT, status TEXT, generated_content JSONB, prompt_notes TEXT, parent_id UUID FK self, position INTEGER, created_at, updated_at)

parrilla_items (id UUID PK, title TEXT, content TEXT, content_type TEXT, origin_type TEXT, origin_id UUID, origin_label TEXT, idea_group_id TEXT, idea_group_title TEXT, scheduled_date DATE, position INTEGER, checklist JSONB, status TEXT default 'inbox', created_at, updated_at)

-- ═══ Sprint Estrategia (v0.7) — capa de medición ═══
products (id UUID PK, name TEXT, slug TEXT UNIQUE, created_at)
-- 1 fila: CMO Stories con UUID fijo c0000000-0000-4000-8000-000000000001 (constante).

published_items (id UUID PK, title TEXT, content_type TEXT, platform TEXT, published_url TEXT, platform_post_id TEXT, utm_campaign TEXT, origin_type TEXT, origin_id UUID, origin_label TEXT, angle_type TEXT, creation_source TEXT, published_at TIMESTAMPTZ, status TEXT default 'publicada', discard_reason TEXT, product_id UUID default 'c0000000-0000-4000-8000-000000000001', created_at, updated_at)

metric_snapshots (id UUID PK, published_item_id UUID FK → published_items ON DELETE CASCADE, platform TEXT, metric TEXT, value NUMERIC, captured_at TIMESTAMPTZ, created_at)

subscribers (id UUID PK, email TEXT UNIQUE, subscribed_at DATE, source_platform TEXT, attributed_item_id UUID FK → published_items ON DELETE SET NULL, cargo TEXT, empresa TEXT, is_target BOOLEAN, status TEXT default 'nuevo', notes TEXT, product_id UUID default 'c0000000-0000-4000-8000-000000000001', created_at, updated_at)

-- Vista (no tabla): última métrica por (published_item_id, metric).
latest_metrics AS
  SELECT DISTINCT ON (published_item_id, metric)
    published_item_id, platform, metric, value, captured_at
  FROM metric_snapshots
  ORDER BY published_item_id, metric, captured_at DESC;

-- product_id agregado también a episodes / newsletters / ideas (nullable,
-- DEFAULT al UUID de CMO, backfilleado en la migración de v0.8).
```

### Cómo se usan las columnas en el flujo actual
- `episodes.ideas` → almacena los 20 ángulos generados (no confundir con la tabla `ideas` que es el Fixture)
- `episodes.selected_ideas` → array de índices de ángulos seleccionados por JP
- `episodes.mapa` → mapa estructurado del episodio (tesis, datos_duros, ideas, tensiones, frases, historia_personal, conexiones)
- `episodes.minado` → objeto con `momentos` (clips para redes) y `voz_en_off` (presentaciones del invitado)
- `episodes.repurpose_content` → objeto con `intros`, `reels`, `reels_v2`, `linkedin` (reels_v2 es el formato nuevo por-ángulo con propuestas)
- `episodes.medianos_candidatos` → array de candidatos propuestos por la Fase A del sprint Medianos (título de trabajo, rango, duración, tipo de ángulo, razón, ángulos_relacionados)
- `episodes.medianos_seleccionados` → array de ids de los candidatos que JP aprobó para desarrollar
- `episodes.medianos` → array de piezas desarrolladas por la Fase B: cada una con rango, duración, tipo, inicio_textual, cierre_textual, 5 títulos, descripcion_youtube y 3 conceptos de thumbnail
- `episodes.transcript_srt` → transcript en formato SRT (con timestamps verbatim) que baja el import de Descript; es la fuente para anclar cortes y para "ver texto del clip". `episodes.transcript` sigue siendo el texto plano que consumen las fases de generación
- `episodes.descript_project_id` / `descript_composition_id` / `descript_composition_name` → identifican el proyecto y la composición madre (el episodio completo) en Descript, para poder cortar sobre ellos
- `descript_jobs` → una fila por corte enviado a Descript. Es la cola persistente (ver sección Integración Descript). `status`: `'queued' | 'running' | 'done' | 'error' | 'cancelled'`. `clip_type`: `'micro' | 'mediano'`. `prompt` guarda la instrucción exacta al agente; `meta` guarda título/rango; `descript_response` guarda el payload crudo de Descript para debug
- `newsletters.articulo` → texto completo del artículo escrito por el autor (JP no lo reescribe; solo lo repurposea). Se puede subir en `.txt`, `.md` o `.docx`
- `newsletters.resumen` → mapa "plomería silenciosa" del artículo (tesis, datos_duros, ideas_clave, tensiones, frases, conexiones). No se muestra al usuario, alimenta las llamadas siguientes
- `newsletters.ideas` → lista de ideas validables extraídas del artículo (fase `ideas`)
- `newsletters.selected_ideas` → ideas que JP eligió para repurposear
- `newsletters.repurpose_content` → objeto con `reels`, `carrusel`, `linkedin` (piezas generadas en paralelo desde las ideas seleccionadas)
- `newsletters.status` → `'draft' | 'ideas_ready' | 'complete'`
- `protocolos` → tabla con los 9 protocolos del sistema, ya cargados (ver sección 13)
- `learnings.newsletter_id` → cuando el feedback viene de una pieza del Newsletter en vez de un episodio. Un learning tiene `episode_id` O `newsletter_id`, nunca ambos
- `ideas.status` → `'draft'` (default), `'merged'` (apareada — se oculta del Fixture), `'ready'` (enviada a la parrilla — se oculta del Fixture)
- `ideas.temperature` → `'spotlight' | 'warm' | 'cold'` (3 niveles; `'hot'` legado se mapea a `warm` en runtime)
- `ideas.category` → `'undecided' | 'contenido' | 'newsletter'`
- `ideas.generated_content` → `{ linkedin?: {...}, reel?: {...} }`. Si `source === 'manual'`, la pieza fue pegada por JP en vez de generada
- `parrilla_items.content_type` → `'episodio' | 'linkedin' | 'reel' | 'tiktok' | 'newsletter' | 'carrousel'`
- `parrilla_items.status` → `'inbox'` (en cola para programar) | `'scheduled'` (programado en fecha) | `'complete'` (todo el checklist marcado) | `'discarded'` (descartado, no se publica)
- `parrilla_items.checklist` → JSONB dinámico según `content_type`. Episodio: `{Editado, Títulos y descripciones, Thumbnails}`. LinkedIn: `{Aprobado}`. Reel: `{Libreto aprobado, Grabado, Editado}`. TikTok: `{Libreto aprobado, Grabado, Editado}`. Newsletter: `{Aprobado, Imagen portada}`. Carrousel: `{Copy, Diseñado}`.
- `parrilla_items.origin_type` → `'episode' | 'newsletter' | 'fixture' | 'manual'`
- `parrilla_items.idea_group_id` + `idea_group_title` → agrupan piezas que vienen de la misma idea. Cuando todas las piezas de un grupo están programadas o descartadas, el grupo desaparece del inbox.

### Columnas del Sprint Estrategia / Universo (v0.7-v0.8)
- `products` → tabla nueva, hoy con 1 fila (CMO Stories, UUID fijo `c0000000-0000-4000-8000-000000000001`). Es la costura multi-producto — no es multi-tenant. La UI no tiene selector; todo el código filtra por `CURRENT_PRODUCT_ID`.
- `published_items` → una fila por pieza publicada / propuesta / descartada. `content_type`: `reel | mediano | linkedin | carrusel | corto | episodio | newsletter`. `platform`: `youtube | instagram | linkedin | tiktok | spotify | substack`. `angle_type` texto libre (sugeridos: `errores_mitos | tras_la_decision | datos_duros | historia_personal | otro`). `creation_source`: `sistema | idea_propia | minado_sistema | mixto`. `status`: **`publicada` (default) | `propuesta` | `descartada`** — los 3 estados del Universo. `discard_reason` solo aplica a `descartada` y además crea un `learning` draft asociado. `utm_campaign` la genera `lib/utm.js` a partir de `origin_label + content_type + platform`.
- `metric_snapshots` → serie temporal (una fila por métrica por captura). `metric`: `reach | impressions | views | likes | comments | shares | saves | watch_time | engagement_rate`. La lectura normal se hace sobre la vista `latest_metrics`.
- `subscribers` → fuente de la lista es el CSV de Substack (upsert por `email`). Foco: **conteo y crecimiento**. Las columnas `cargo` / `empresa` / `is_target` existen pero quedan **LATENTES** — ninguna vista de la app las nombra, mide ni filtra en esta versión. Se encenderán cuando la comunidad crezca (mindset "gente correcta" — fuera de scope v0.8).
- `latest_metrics` (vista) → devuelve la última métrica por `(published_item_id, metric)`. Es la fuente para Radar, PiezaPanel, Linaje.
- `product_id` en `episodes / newsletters / ideas / published_items / subscribers` → siempre setearlo en inserts nuevos (usar `withProductPayload` de `lib/product.js`); todo read filtra por `CURRENT_PRODUCT_ID` (usar `withProduct`). Nullable con DEFAULT al UUID de CMO, para no romper inserts viejos.

> Los schemas exactos (defaults, constraints) están en Supabase — esta lista refleja las columnas que efectivamente se leen/escriben desde el código. Si aparecen columnas nuevas en la tabla que no están acá, revisar contra `app/api/episodes/route.js`, `app/api/newsletters/route.js` y los generadores en `app/api/generate/` y `app/api/newsletters/generate/`.

---

## 4. LO QUE EXISTE HOY EN PRODUCCIÓN (v0.8)

La app está desplegada en Vercel con el flujo completo de ángulos + revisión de aprendizajes + visor de protocolos + banco de ideas (Fixture Kanban) + Newsletter (repurpose desde artículo) + Contenido Mediano (mini-episodios) + Integración Descript (cortes automáticos) + **capa de Estrategia** (Radar, Público, providers de métricas) + **Universo del episodio** (piezas en 3 estados navegables, PiezaPanel, AnguloView cross-episodios, Aprendizajes del mes).

### Lo que tiene y funciona (Sprint 1 COMPLETO)
- Sidebar oscuro con lista de episodios + botón "Nuevo episodio"
- Empty state con CTA "Cargar primer episodio"
- Upload modal con drag/drop de archivo .txt + placeholders de RSS Feed y Audio MP3 ("Próximamente")
- **Flujo correcto de ángulos:** al subir transcript, genera mapa + 20 ángulos → JP selecciona → genera contenido afilado
- **Protocolos de Supabase:** cada llamada a la API carga ADN + protocolo de fase desde la tabla `protocolos`
- **Aprendizajes se inyectan automáticamente:** los aprendizajes aprobados se concatenan en la sección [APRENDIZAJES] del protocolo correspondiente en runtime
- 3 tabs: Contenido / Repurpose / Minado
- Mapa del episodio colapsable con nueva estructura (tesis, datos duros, ideas, tensiones, frases, historia personal)
- 20 ángulos con checkboxes + comentarios opcionales + badge de tipo
- Botón "Generar contenido con X ángulos" que genera títulos + descripciones + thumbnails + minado
- **Edición manual directa** en TODOS los textos (click para editar, hover muestra "editar")
- **"Editar con IA"** en descripciones Spotify/YouTube e intros
- Feedback inline por fila en títulos, thumbnails y minado
- Botón "Aplicar cambios y aprender" que regenera contenido con feedback
- Tab Repurpose: genera intros + reels + LinkedIn en paralelo desde ángulos seleccionados
- Tab Minado: clips para micro-contenido con categorías, marcas [+DANI], duración, caption sugerido + voz en off del invitado
- Copiar en cada pieza de contenido
- Episodios persisten en Supabase
- Tema visual: fondo cálido (#FAFAF9), sidebar oscuro (#18181B), acento naranja (#EA580C), tipografía DM Sans

### Lo que tiene y funciona (Sprint 2 COMPLETO)
- **Sidebar actualizado:** dos items — "Aprendizajes" (con badge de pendientes) y "Protocolos" — debajo de la lista de episodios, separados por línea sutil
- **Vista de revisión de aprendizajes:** pantalla completa accesible desde sidebar. Al abrirse, llama a Claude para sintetizar los feedbacks draft agrupados por protocolo. Muestra patrones identificados (no lista cruda), con badge de confianza (alta/media/baja), feedbacks originales expandibles, y cambio propuesto para el protocolo. Tres acciones por síntesis: aprobar (verde), rechazar (rojo), circunstancial (ámbar). Barra inferior sticky con contador de decisiones + botón "Aplicar decisiones" (habilitado solo cuando todo está decidido). Estado de éxito post-aplicación con explicación.
- **Visor de protocolos:** split view con lista de protocolos a la izquierda (badges de learnings aprobados y draft) y detalle a la derecha. Muestra contenido completo del protocolo, aprendizajes inyectados en verde, historial de versiones (tabla `protocol_history`), botón copiar protocolo completo (con aprendizajes incluidos), y edición directa con razón del cambio que se versiona automáticamente.
- **Navegación por vistas:** estado `activeView` controla si se muestra el workspace de episodios, la revisión de aprendizajes, o el visor de protocolos. Click en episodio vuelve al workspace.

### Lo que tiene y funciona (Sprint 3A COMPLETO)
- **Parrilla de contenidos:** vista nueva accesible desde sidebar con split view — inbox a la izquierda + calendario a la derecha
- **Inbox con filtros:** piezas de contenido pendientes de programar, agrupadas por idea de origen, con filtros por origen (Episodio, Newsletter, Fixture) y por tipo de contenido (LinkedIn, Reel, TikTok, Newsletter, Carrousel, Episodio)
- **Drag and drop:** arrastrar piezas del inbox al calendario para programarlas en un día específico
- **3 vistas de calendario:** Semana (grid 7 columnas Lun-Dom), Mes (grid 7×N con tarjetas compactas, click en día cambia a vista semana), Lista (cronológica vertical agrupada por día, con "Cargar más" para +14 días)
- **Ghost slots recurrentes:** los martes alternan automáticamente entre Episodio y Newsletter (semanas pares = episodio, impares = newsletter, basado en semana ISO). Si ya hay un item del tipo correspondiente programado ese martes, el ghost se oculta.
- **Checklist de producción por tipo:** cada pieza tiene un checklist específico según su content_type. Episodio: Editado + Títulos y descripciones + Thumbnails. LinkedIn: Aprobado. Reel/TikTok: Libreto aprobado + Grabado + Editado. Newsletter: Aprobado + Imagen portada. Carrousel: Copy + Diseñado.
- **3 estados visuales por color:** gris (sin iniciar, 0 checks marcados), amarillo (en progreso, al menos 1 check pero no todos), verde (listo, todos los checks marcados)
- **Tarjeta expandida:** click en tarjeta del calendario muestra preview del contenido generado + checklist interactivo (marcar/desmarcar) + origen de la pieza
- **Mini barra de progreso:** debajo de cada tarjeta en el calendario, segmentos que se llenan según el checklist (solo visible si el checklist tiene más de 1 item)
- **"Enviar a Parrilla":** botón disponible en Fixture (tarjetas de ideas), Repurpose y Minado (tabs de episodios) que envía piezas de contenido al inbox de la Parrilla
- **"+ Agregar contenido":** botón en el inbox para creación manual de piezas (título, tipo, contenido opcional)
- **Descartar pieza (✕):** marcar una pieza como "no publicar" (`status = 'discarded'`) sin eliminarla permanentemente
- **Histórico:** el contenido completado (verde) se mantiene visible en el calendario como registro histórico
- **Navegación temporal:** flechas para navegar entre semanas/meses según la vista activa, botón "Hoy" para volver a la fecha actual

### Lo que tiene y funciona (Sprint 3B COMPLETO)
- **Banco de Ideas (Fixture Kanban)** accesible desde el sidebar como un tercer item permanente ("Fixture", ícono Lightbulb)
- **Tres columnas** en orden fijo:
  - 💭 **Sin definir** (`category='undecided'`) — para ideas sin formato decidido
  - 📱 **Redes Sociales** (`category='contenido'`) — LinkedIn + Reel
  - 📨 **Newsletter** (`category='newsletter'`) — ideas largas para escribir
  - Cada columna muestra contador total
- **Temperaturas como filas visuales** dentro de cada columna (no badges en la tarjeta). Headers siempre visibles aunque la sección esté vacía:
  - 💡 **Quiere ver la luz** (fondo verde claro, arriba)
  - 🌤️ **Tibio** (fondo lila claro, medio)
  - ❄️ **Frío** (fondo azul-gris claro, abajo)
  - Se eliminó "🔥 Caliente" del sistema; ideas legacy con `temperature='hot'` se mapean visualmente a Tibio sin migración destructiva
- **Drag-and-drop con dos zonas claras:**
  - Drop en espacio vacío de una sección → mueve la idea a esa columna + esa temperatura (`PUT category/temperature`)
  - Drop directo sobre una tarjeta del mismo `category` → abre modal de aparear
- **Botón "+" Trello-style al fondo de cada columna** → abre modal de creación con la categoría pre-asignada (sin dropdown). Se eliminó el botón global de "+ Nueva idea".
- **Panel lateral deslizable tipo Notion** al clickear una tarjeta:
  - Slide-in animado desde la derecha (`transform: translateX`, 280ms ease-out)
  - ~60vw (`minWidth: 560px`, `maxWidth: calc(100vw - 64px)`)
  - Renderizado con `createPortal` a `document.body` para evitar contextos de apilamiento del padre
  - Overlay con `backdrop-filter: blur(4px)` y fade-in
  - Cierre siempre disponible: botón X, click en overlay, o tecla Escape (bug que impedía cerrar después de generar quedó arreglado)
- **Layout dos columnas dentro del panel:**
  - Izquierda: notas + prompt con `AutoTextarea` (auto-resize con `scrollHeight`), `text-base`, `leading-[1.75]` para sensación de bloc de notas
  - Derecha: contenido generado (solo aparece cuando `generated_content` existe)
- **Controles persistentes en el header del panel:**
  - Toggles de formato (LinkedIn / Reel / Newsletter) — cambia `formats[]`
  - Selector de temperatura con los 3 botones — cambia `temperature`
- **Generación de contenido desde la idea:**
  - Botón "Generar contenido (linkedin + reel)" usa formatos activos en paralelo
  - Cada pieza generada (`GeneratedBox`) muestra badge de patrón, "Editar con IA" + copiar
- **Aparear ideas:** modal de confirmación → fusiona descripción, notas y formatos; la fuente queda con `status='merged'` y se oculta automáticamente
- **"Llevar al banco" desde el workspace de episodios** (`BankBtn` en `app/page.js`):
  - Ángulos del episodio → crea idea con el ángulo como `angle` y `origin_id` apuntando al episodio
  - Cada intro / reel / LinkedIn de Repurpose → crea idea con `generated_content` ya poblado
  - Cada momento de Minado → crea idea con la cita como notas
  - Feedback "✓ Agregado" 2s después de la creación
- **"📋 Enviar a la parrilla"** en el footer del panel:
  - Confirmación inline
  - `PUT status='ready'` → la idea desaparece del Fixture (filtro excluye `merged` y `ready`)
  - Feedback verde "✓ Enviada a la parrilla" 1.8s antes de cerrar el panel
- **"📝 Pegar mi versión"** debajo de cada pieza generada (o como alternativa si no hay generado):
  - Abre modal con la versión IA de referencia
  - Al guardar: patch en `generated_content[fmt]` con `source: 'manual'`, reemplazando `cuerpo`/`guion`
  - Crea automáticamente un `learning` draft (`original_content` = IA, `feedback` = manual) solo si hay versión IA con la que comparar
  - Sistema aprende silenciosamente de la diferencia entre lo que generó y lo que JP terminó escribiendo

### Newsletter (Sprint 3 COMPLETO — repurpose de artículo escrito por el autor)
- **Feature separada del podcast.** JP escribe el newsletter aparte (Claude directo, editor de texto, lo que sea) y sube el artículo terminado. El Engine no reescribe el artículo, solo lo repurposea.
- **Sidebar con Newsletter expandible** (`Mail` icon) al lado de Podcast, con lista de últimas 5 ediciones y botón "Ver todos". Cada item tiene basurita para borrar (visible al hover, con `confirm()` y limpieza en cascada).
- **Upload:** modal (`NewsletterUploadModal.jsx`) que acepta `.txt`, `.md` y `.docx`. Los `.docx` los parsea el endpoint `POST /api/newsletters/extract` (runtime Node, usa `mammoth`) y devuelve texto plano. El resto del pipeline usa el mismo campo `articulo`.
- **Fase 1 — `ideas`:** `POST /api/newsletters/generate { newsletter_id, phase: 'ideas' }`. System prompt = `adn + mapa-angulos`. Output: `resumen` (mapa "plomería silenciosa" del artículo) + lista de ideas validables. Se guarda en `newsletters.resumen` y `newsletters.ideas`; status → `ideas_ready`.
- **Fase 2 — `repurpose`:** cuando JP selecciona ideas y confirma, `POST /api/newsletters/generate { newsletter_id, phase: 'repurpose', selected_ideas }`. **Tres llamadas en paralelo:**
  - `adn + reels` → 1 guión de reel por idea
  - `adn + carrusel` → 1 carrusel de Instagram por idea (8-10 slides con `portada | desarrollo | cta`, patrón de gancho: `dato_contundente | contraintuitivo | dolor_directo | promesa_lista | error_senalado`)
  - `adn + linkedin` → 1 post de LinkedIn por idea
- Output se guarda en `newsletters.repurpose_content = { reels, carrusel, linkedin }`; status → `complete`.
- **`NewsletterView.jsx`** renderiza las 3 piezas por idea, con edición manual, "Editar con IA y aprender" en cada bloque, y `CarruselBlock` slide por slide. El botón "Enviar a Parrilla" está disponible (aunque la vista de Parrilla esté oculta — ver más abajo).
- Aprendizajes: cada feedback genera un learning con `newsletter_id` en vez de `episode_id` y `target_protocol_name` del protocolo tocado (`reels` | `carrusel` | `linkedin`).

### Sprint Medianos (7 Julio 2026 — COMPLETO)
- **Cuarto tab "Medianos 🎬"** en el workspace del episodio, junto a Episodio / Reels / Intros / Minado. Producto separado del minado de micro-contenido: piezas de 4-12 minutos, cada una centrada en un tema desarrollado dentro del episodio, empaquetadas como mini-episodios (título, descripción de YouTube, thumbnails).
- **Protocolo nuevo `medianos`** (slug `medianos`, v1) en la tabla `protocolos`. Capa 1 — hereda ADN. Trae reglas de qué convierte a un tramo en "mediano" (tesis desarrollada, arco propio, cita textual clara al inicio y al final), formato de output, y su sección `[APRENDIZAJES]` para inyección en runtime.
- **Requiere transcript con timestamps (Descript).** El tab detecta si el transcript tiene marcas de tiempo (`[mm:ss]`, `mm:ss`, `[hh:mm:ss]`, `hh:mm:ss`) y si no las tiene muestra un mensaje explicativo y deshabilita la generación. Los episodios viejos sin timestamps simplemente no disparan la feature.
- **Flujo de dos pasos con decisión humana en medio** (mismo patrón que ángulos):
  - **Fase A — `medianos-candidatos`:** `POST /api/generate { episode_id, phase: 'medianos-candidatos', selected_angles, mapa }`. System prompt = `adn + medianos` (+ aprendizajes de `medianos` aprobados). Input: transcript con timestamps (60k chars) + mapa + ángulos seleccionados como **prioridad blanda**. Output: array de candidatos `{ id, titulo_trabajo, rango_inicio, rango_fin, duracion_estimada_min, tipo_angulo, razon, angulos_relacionados }`. Guarda en `episodes.medianos_candidatos`.
  - JP selecciona con checkboxes (`episodes.medianos_seleccionados`) y clickea "Desarrollar N medianos".
  - **Fase B — `medianos-desarrollo`:** `POST /api/generate { episode_id, phase: 'medianos-desarrollo', mapa, candidatos_seleccionados }`. Mismo system prompt. Input: transcript con timestamps + mapa + candidatos aprobados. Output: array de piezas completas `{ id, titulo_trabajo, rango_inicio, rango_fin, duracion_estimada_min, tipo_angulo, inicio_textual, cierre_textual, titulos: [5], descripcion_youtube, thumbnails: [3] }`. Guarda en `episodes.medianos`.
- **Reglas duras reforzadas en el prompt:** `rango_inicio` siempre temporalmente anterior a `rango_fin`; `duracion_estimada_min` corresponde al rango real; `inicio_textual` y `cierre_textual` son **citas textuales exactas** del transcript (el código no las reformatea ni las limpia al guardar).
- **Circuito de aprendizaje conectado:** cada feedback en una pieza mediana crea un `learning` con `target_protocol_name = 'medianos'`, entra al flujo genérico de síntesis (`/api/learnings/synthesize` agrupa por `target_protocol_name`), pasa por aprobación (`/api/learnings/batch`) y se inyecta en la próxima Fase A o Fase B como el resto de los protocolos.
- **Fix colateral en el visor de Protocolos:** `export const dynamic = 'force-dynamic'` + `.limit(50)` en `GET /api/protocolos` y `cache: 'no-store'` en el fetch cliente — para que la lista siempre refleje Supabase (antes Next.js podía cachear la respuesta y ocultar protocolos agregados a mano en el editor SQL).

### Integración Descript (9 Julio 2026 — COMPLETO, en producción)
Automatiza el corte de clips (micros y medianos) directamente sobre el episodio madre que JP carga manualmente en Descript, vía la API REST de Descript (`descriptapi.com/v1`). Reemplaza el trabajo manual de buscar con Ctrl+F, seleccionar y duplicar a una composición nueva (1-2 horas por episodio).

- **Principio de arquitectura:** el Engine es el cerebro (genera todo el contenido editorial con Anthropic + protocolos); Descript es (a) la fuente del transcript con timestamps y (b) el ejecutor de los cortes. Descript NO genera contenido editorial.
- **Import por link** (`POST /api/descript/import`): JP pega el link del episodio en Descript; el Engine extrae `project_id`, baja el transcript en SRT (`transcript_srt`, con timestamps) y en texto plano (`transcript`), y guarda `descript_project_id/composition_id/composition_name`. Ya no hace falta subir el `.txt` a mano (sigue disponible como respaldo). `GET /api/descript/projects` es el fallback para buscar por nombre.
- **Cortes vía el agente de Descript** (`POST /jobs/agent`): a cada corte se le da la frase de inicio y la de cierre (verbatim) y crea una composición nueva `MICRO_EP{n}_{slug}` / `MEDIANO_EP{n}_{slug}` con solo ese tramo, dejando el episodio original intacto. Se le pide arrancar/terminar ~2s "suelto" (la editora ajusta después). ~7-10 créditos de IA por corte, ~40s cada uno; cortar no consume media minutes.
- **Cola persistente server-side** (`descript_jobs`, `lib/descript-queue.js`): al dar "Generar en Descript" se insertan filas `queued`; el procesador las despacha **de a una por proyecto** — regla dura: Descript rechaza un segundo `POST /jobs/agent` sobre el mismo proyecto si hay uno corriendo, así que la cola se serializa por `project_id`. El estado vive en Supabase → JP puede cerrar el navegador y volver. Dedupe por `(episode_id, clip_ref)` evita cortes duplicados al reenviar.
- **Avance de la cola (tres mecanismos, mismo poll de respaldo):** (1) webhook `POST /api/descript/jobs/webhook` que Descript llama al terminar (solo funciona en producción; la URL de preview está protegida); (2) heartbeat del panel a `/api/descript/jobs/process` cada 4s mientras la pestaña esté abierta; (3) cron de Vercel `/api/descript/jobs/cron` cada minuto (`vercel.json`) que empuja todas las colas aunque el navegador esté cerrado — esto habilita el "mando cortes y cierro el computador".
- **Micros (Minado) — una etapa:** aparecen los 15-20 micros ya generados (protocolo `minado` v2); JP marca cuáles y da "Generar en Descript". La tarjeta encabeza con el `gancho` (no la frase cruda truncada), muestra la `frase_iman` como punchline, y trae dos colapsables: "ver texto del clip" (`GET /api/descript/clip-text` extrae el tramo verbatim del SRT bajo demanda, con match laxo) y "ver payload de corte" (las anclas backstage).
- **Medianos — dos etapas + un botón:** candidatos automáticos (Fase A) → JP selecciona favoritos → un solo botón "Desarrollar y enviar N a Descript" que desarrolla el paquete completo (Fase B) y encola los cortes en paralelo, con modal de confirmación de créditos.
- **Panel de cola** (`DescriptJobsPanel.jsx`) por episodio: estado por clip (en cola / cortando / listo / error / cancelado) con créditos, "abrir en Descript ↗" (usa el id corto de 5 caracteres para aterrizar en el clip exacto), "abrir proyecto en Descript ↗", "reintentar" y "cancelar pendientes" (`POST /api/descript/jobs/cancel`, solo toca `queued`).
- **Nota cosmética:** los medianos cortados antes del arreglo de detección de número de episodio dicen "EPX" en vez de "EP{n}". Los nuevos ya salen bien (toma el número de `descript_composition_name`, ej. "CMO Latam - Episodio4" → EP4).

### Mejoras puntuales (17 Junio 2026)
- **Modelo de Anthropic actualizado a `claude-sonnet-4-6`** (antes `claude-sonnet-4-20250514`, que dejó de ser válido y rompía `/api/generate` en producción). Cambiado en `lib/generation.js` y `app/api/learnings/synthesize/route.js`.
- **Eliminar episodios y newsletters desde el sidebar:** botón basurita sutil en cada item, visible solo al hacer hover, con `confirm()` antes de borrar. Endpoints `DELETE /api/episodes?id=...` y `DELETE /api/newsletters?id=...` con limpieza en cascada previa: primero `learnings` (FK real probable), después `parrilla_items` e `ideas` filtrando por `origin_type` + `origin_id` (FK lógicas — limpieza para evitar huérfanos), y al final el recurso principal. Si el item borrado estaba seleccionado, `idx`/`nlIdx` se resetean y la vista cae al listado padre (`podcast` / `newsletter`).
- **Upload de newsletters en `.docx` además de `.txt`/`.md`:** nuevo endpoint `POST /api/newsletters/extract` (runtime Node) que parsea el Word con `mammoth` y devuelve `{ text }` plano. El modal acepta `.docx`, muestra un loader naranja mientras extrae y muestra el error si el parseo falla. El texto extraído llega al mismo campo `articulo` que antes — el resto del pipeline (`POST /api/newsletters` → `/api/newsletters/generate`) no se tocó.

### Sprint Estrategia ✅ COMPLETO (v0.7, 9 Julio 2026)
Capa de medición sobre el sistema de producción, sin romperlo. Encendida por `SHOW_ESTRATEGIA=true` (default) en `app/page.js`.

- **3 tablas nuevas** en Supabase (ver §3): `published_items`, `metric_snapshots`, `subscribers` + vista `latest_metrics`. RLS off en todas.
- **Radar** (`components/estrategia/RadarView.jsx`) — la home nueva, reemplaza a "Inicio". `activeView='radar'` por default. Fusiona dos zonas: "Esta semana" (pulso — 4 metric cards + top piezas + último episodio) y "Qué funciona" (patrones — engagement por formato + por ángulo con barras horizontales que animan del 0 al ancho final). Decisión: Radar y "Qué funciona" en una sola página; se separarían solo cuando el análisis pida filtros/cohortes/export propios.
- **Público** (`components/estrategia/PublicoView.jsx`) — suscriptores con import de CSV de Substack (Substack no tiene API; el CSV es el único camino). Foco: **conteo y crecimiento**. Métricas: Total / Nuevos 7d (con ↑/↓ vs previa) / Nuevos hoy. Enriquecimiento `cargo`/`empresa` latente y opcional en un panel lateral (createPortal), sin protagonismo — no cambia contadores ni entra en las vistas de esta versión.
- **Linaje** — pestaña nueva en el workspace del episodio (renombrada a **Universo 🌐** en v0.8). Árbol madre → piezas → resultado con card oscuro `#18181B` para la madre (único dark permitido) y stubs por `strength` (verde 3px trajo subs · ámbar 2px alcance alto · gris 1px débil).
- **Capa de providers de métricas** (`lib/metrics/`): abstracción con `index.js` (rutea por plataforma), `mock.js` (determinista por hash del id, para tener UI viva sin APIs), y stubs `youtube.js`/`metricool.js`/`spotify.js`. Contrato uniforme: `fetchMetrics(item) → [{metric, value}]`.
- **`lib/utm.js`** genera UTMs (`utm_source=platform&utm_medium=content_type&utm_campaign=slug(origin_label)`); **`RegistrarPublicacionModal`** captura piezas publicadas y muestra la UTM copiable al terminar.
- **Sidebar agrupado**: label "Estrategia" (Radar, Público) arriba del label "Producción" (Podcast, Newsletter, Fixture, Protocolos, Aprendizajes).
- **Mindset de métricas (decisión de producto):** alcance, engagement y suscriptores son primarios. La capa "gente correcta / target" queda **LATENTE** — las columnas `is_target/cargo/empresa` existen pero **ninguna vista, copy ni métrica de esta versión las nombra**. Se enciende cuando la comunidad crezca.

### Sprint Universo ✅ COMPLETO (v0.8, 12-17 Julio 2026)
Evoluciona la capa de estrategia hacia el modelo de "producto y su universo de contenido" (§1.1).

- **3 estados en `published_items`**: `publicada | propuesta | descartada`. Migración: `ADD COLUMN status TEXT DEFAULT 'publicada'` + `discard_reason`. Un descarte con razón además crea un `learning` draft asociado.
- **Universo del episodio** (`LineageTab.jsx`, tab renombrada **Linaje → Universo 🌐**): muestra piezas en los 3 estados con **clic-según-estado**:
  - `publicada` → abre `PiezaPanel` con métricas + vecinos.
  - `propuesta` → salta a la tab de producción correspondiente (reel/carrusel → Reels; minado/corto → Minado; mediano → Medianos), con `onGoToWorkshopTab`.
  - `descartada` → panel con la razón + nota "guardado como aprendizaje draft".
  Filtro segmentado arriba: `Todo · Publicado · Propuestas · Descartadas`.
- **Cara por defecto por ciclo de vida**: al abrir un episodio existente, un `useEffect` consulta `/api/published?status=publicada&origin_id=...`; si tiene ≥1 pieza publicada, la tab default pasa a `linaje`. Si es fresco (`phase` en `angles/contenido/minado`), se respeta el flujo de producción — no se toca el default.
- **Navegabilidad del grafo** (`PiezaPanel.jsx`, `AnguloView.jsx`, ambos via createPortal): panel lateral con métricas + serie SVG mini de reach + **madre clickeable** (abre Universo de la madre) + **hermanas cross-plataforma** + **ángulo clickeable** (abre `AnguloView` — todas las piezas del producto con ese `angle_type` a través de episodios, con agregados). Nuevos endpoints: `GET /api/published/[id]` y `GET /api/angulos/[angle_type]`.
- **Radar clickeable**: cada pieza de "Top piezas" abre `PiezaPanel`; las barras de "Qué engancha por ángulo" son botones que abren `AnguloView`. El "Ver linaje →" del último episodio salta al workspace + tab Universo.
- **Aprendizajes del mes** (`AprendizajesDelMes.jsx` + `lib/aprendizajes-demo.js`): carrusel full-screen de **8 insights senior HARDCODEADOS/demo** (`isDemo: true`, chip DEMO removible en la UI). Es el preview de "narrar" — estilo "wrapped pero senior": eyebrow + claim afilado + evidencia + viz mínima + callout "Qué haría con esto". Navegación con flechas del teclado + clicks. Botón de entrada en el Radar arriba a la derecha. **El motor real que calcula insights NO está construido** (conversación futura).
- **Costura multi-producto**: tabla `products` con UUID fijo para CMO + `product_id` en `episodes/newsletters/published_items/subscribers/ideas` (nullable, DEFAULT al UUID de CMO, backfilleado). `lib/product.js` expone `CURRENT_PRODUCT_ID` (env con default) + helpers `withProduct(query)` y `withProductPayload(payload)`. La UI sigue **CMO-only** (sin selector). No es multi-tenant.
- **Provider de YouTube real** (`lib/metrics/youtube.js`): YouTube Data API v3 con API key (sin OAuth). `extractVideoId` soporta `watch?v=`, `youtu.be/`, `shorts/`, `embed/`. Devuelve `views`, `likes`, `comments` + `engagement_rate = (likes + comments) / views × 100`. Se activa con `METRICS_PROVIDER != 'mock'` + `YOUTUBE_API_KEY`.
- **Provider de Metricool real** (`lib/metrics/metricool.js`): cubre Instagram / LinkedIn / TikTok. Auth: header `X-Mc-Auth: <token>` + query `userId` + `blogId`. Cache in-memory por (endpoint, ventana) con TTL 5 min — un sync con 40 reels pega a Metricool 1 vez, no 40. Ventana default 365 días. Ruteo por (plataforma + URL + content_type) a **4 endpoints reales** (§18). Match por URL normalizada + shortcode + IDs numéricos largos. **Sync real medido:** ~137 items → ~701 snapshots, 91% match rate.
- **Fix:** plataformas sin provider (substack para newsletters) devuelven `[]` (sin métrica). Ya NO caen al mock — el mock solo se usa con `METRICS_PROVIDER=mock` explícito.
- **Registrar publicación** (`RegistrarPublicacionModal.jsx`) evolucionado con selector de `status` (Publicada / Propuesta / Descartada) y campo condicional de `discard_reason`.

### Lo que NO funciona todavía
- No hay chat embebido con contexto → Sprint 4.
- El motor real de insights (los "Aprendizajes del mes" siguen siendo demo/hardcodeados) → futuro.
- El modo Narrar completo (hoy solo el preview) → futuro.
- **La capa de identidad / target sigue LATENTE**: `is_target`, `cargo`, `empresa` existen en `subscribers` pero ninguna vista los nombra. Se enciende cuando la comunidad crezca.
- **No hay autenticación**: la app no tiene login; quien tenga el URL entra. Con RLS off + anon key expuesta, el acceso es abierto. Aceptable para uso interno; resolver antes de abrir a clientes.
- **Providers reales de Metricool/YouTube listos pero no todos activos:** Metricool y YouTube funcionan; Spotify sigue como stub (no hay API oficial de analíticas de creador — llenado manual). Substack no tiene provider; sus piezas quedan sin métrica.
- **Parrilla DISUELTA** — el código sigue en el repo (`components/ParrillaView.jsx`, `app/api/parrilla/*`) pero fuera del flujo de v0.8. Ver §10.

---

## 5. DISEÑO VISUAL — MANDATORIO MANTENER

### Paleta de colores
- Fondo principal: `#FAFAF9` (warm off-white)
- Sidebar: `#18181B` (dark zinc)
- Acento primario: `#EA580C` (naranja/orange-600)
- Acento light: `#FFF7ED` (orange-50)
- Acento border: `#FED7AA` (orange-200)
- Success: `#16A34A` (green-600)
- Success light: `#F0FDF4` (green-50)
- Muted text: `#78716A` (stone-500)
- Card background: `#FFFFFF`
- Borders: `#E7E5E4` (stone-200)
- Text: stone-700, stone-800, stone-900

### Colores de las temperaturas del Fixture
- Spotlight (Quiere ver la luz): fondo `#ECFDF5`, texto `#15803D`, borde `#BBF7D0`
- Warm (Tibio): fondo `#FAF5FF`, texto `#7C3AED`, borde `#E9D5FF`
- Cold (Frío): fondo `#F1F5F9`, texto `#475569`, borde `#E2E8F0`

### Tipografía
- Body: DM Sans (Google Fonts)
- No usar Fraunces ni fonts tipo display

### Sensación general
- Editorial, como una herramienta para profesionales de contenido
- Cálida, no fría ni corporativa
- Limpia con espacios generosos
- Cards redondeados (rounded-xl)
- Transiciones suaves
- **NUNCA tema oscuro.** JP lo odia para este producto. Siempre tema claro cálido.

---

## 6. FLUJO DE TRABAJO (IMPLEMENTADO en v0.6)

### Flujo de generación (Sprint 1)
1. JP sube transcript (.txt)
2. Sistema genera automáticamente: mapa del episodio + 20 ángulos interesantes
3. JP ve los ángulos, selecciona los que más le gustan (checkboxes + comentarios opcionales)
4. JP hace click en "Generar contenido con estos ángulos"
5. Sistema genera: títulos, descripciones Spotify/YouTube, thumbnails — todos AFILADOS alrededor de los ángulos seleccionados
6. Minado se genera también (micro-contenido para redes + voz en off del invitado)
7. Cuando JP va a Repurpose, genera intros + reels + LinkedIn desde los mismos ángulos seleccionados

### Flujo de aprendizajes (Sprint 2)
1. JP da feedback inline o usa "Aplicar cambios y aprender" → se crean learnings con status `draft` silenciosamente
2. Badge en sidebar muestra cuántos learnings draft hay pendientes
3. JP hace click en "Aprendizajes" en sidebar → se abre vista de revisión
4. El sistema llama a `/api/learnings/synthesize` que agrupa drafts por protocolo y llama a Claude para sintetizar patrones
5. JP ve las síntesis con confianza, feedbacks originales expandibles, y cambio propuesto
6. JP aprueba/rechaza/marca circunstancial cada patrón
7. Click en "Aplicar decisiones" → llama a `/api/learnings/batch` que actualiza status y crea snapshots en `protocol_history`
8. Los aprendizajes aprobados se inyectan automáticamente en el protocolo correspondiente en la próxima generación

### Flujo de protocolos (Sprint 2)
1. JP hace click en "Protocolos" en sidebar → se abre visor de protocolos
2. Lista de los 9 protocolos a la izquierda con badges de learnings (7 originales + `carrusel` + `medianos`)
3. Detalle a la derecha: contenido completo + aprendizajes inyectados en verde
4. Puede copiar protocolo completo (con learnings), ver historial de versiones, o editar directamente

### Flujo de Parrilla (Sprint 3A)
1. Contenido llega al inbox de la Parrilla desde múltiples fuentes: Episodios (botón "Enviar a Parrilla" en Repurpose/Minado), Fixture (botón "Enviar a Parrilla" en tarjeta de idea), o creación manual (botón "+" en el inbox)
2. Las piezas aparecen en el inbox agrupadas por idea de origen, con su tipo de contenido (emoji + label)
3. JP puede filtrar el inbox por origen (Episodio, Newsletter, Fixture) y por tipo de contenido
4. JP arrastra cada pieza individual a un día del calendario (drag and drop del inbox al calendario)
5. Una vez programada, JP va marcando el checklist de producción según el tipo (ej: Reel = Libreto aprobado → Grabado → Editado)
6. El color de la tarjeta cambia automáticamente según progreso: gris (nada marcado) → amarillo (parcial) → verde (todo listo)
7. Si JP decide no publicar una pieza, la descarta con ✕ (`status = 'discarded'`)
8. Cuando todas las piezas de una idea están programadas o descartadas, la idea desaparece del inbox
9. El contenido completado permanece visible en el calendario como registro histórico
10. Los martes muestran ghost slots recurrentes que alternan entre Episodio y Newsletter para recordar la cadencia de publicación

### Flujo de ideas / Fixture (Sprint 3)
1. JP entra al "Fixture" desde el sidebar
2. Ve tres columnas (Sin definir / Redes Sociales / Newsletter) con sus filas de temperatura
3. Crea ideas desde el botón "+" de la columna correspondiente, o desde el workspace de episodios con "Llevar al banco"
4. Mueve tarjetas entre columnas y temperaturas arrastrando; aparea soltando sobre una tarjeta
5. Click en tarjeta → panel lateral con notas + prompt + controles de formato y temperatura
6. Genera contenido desde la idea (LinkedIn / Reel) o pega su propia versión
7. Cuando una idea está lista, click "📋 Enviar a la parrilla" → desaparece del Fixture con `status='ready'`
8. La idea (con `status='ready'`) deja de aparecer en el Fixture; las piezas asociadas viajan al inbox de la Parrilla (Sprint 3A) para programación

### Flujo de Newsletter (Sprint 3 — repurpose de artículo)
1. JP escribe el newsletter por fuera del Engine (Claude directo, editor, etc.)
2. Sube el artículo en `.txt`, `.md` o `.docx` desde el modal de "Nueva edición"
3. Si es `.docx`, el endpoint `POST /api/newsletters/extract` lo convierte a texto plano con `mammoth`
4. El Engine dispara Fase `ideas`: extrae un mapa "plomería silenciosa" del artículo (tesis, datos, tensiones, frases, conexiones) + una lista de ideas validables como piezas independientes
5. JP ve las ideas, selecciona las que quiere repurposear
6. El Engine dispara Fase `repurpose`: 3 llamadas en paralelo generan 1 reel + 1 carrusel (8-10 slides con portada/desarrollo/CTA) + 1 post de LinkedIn por cada idea seleccionada
7. Cada pieza se puede editar manualmente, editar con IA (crea learning), copiar, o enviar a la Parrilla (si el flag `SHOW_PARRILLA` está activo)
8. Los feedbacks entran al circuito genérico de aprendizaje con `newsletter_id` en vez de `episode_id` y `target_protocol_name` según el bloque (`reels` | `carrusel` | `linkedin`)

### Flujo de Contenido Mediano (Sprint Medianos — mini-episodios)
1. JP entra al tab **Medianos 🎬** del workspace de un episodio
2. Si el transcript no tiene timestamps → mensaje explicativo, feature deshabilitada
3. Click en "Generar candidatos de contenido mediano" → **Fase A** genera 5-8 candidatos con rango `MM:SS – MM:SS`, duración, tipo de ángulo, razón, y ángulos_relacionados (para señalar los que tocan lo que JP ya seleccionó como prioridad blanda)
4. JP marca los candidatos que quiere desarrollar (checkbox) y clickea "Desarrollar N medianos"
5. **Fase B** desarrolla cada candidato aprobado en una pieza completa: mantiene rango + duración + tipo, agrega `inicio_textual` y `cierre_textual` (citas exactas del transcript, sin reformatear), 5 títulos, descripción YouTube y 3 conceptos de thumbnail
6. Cada pieza permite edición manual directa (click), "Editar con IA y aprender" en la descripción, feedback inline en cada título (con `ApplyBar`), y copiar la ficha completa
7. Los feedbacks entran al circuito de aprendizaje bajo el protocolo `medianos`
8. JP puede volver a regenerar candidatos o desarrollar más adelante — no es un flujo de un solo tiro

### Ciclo de vida completo de una idea (referencia rápida)
1. **Nace** — desde un ángulo de episodio ("Al banco"), desde una pieza de Repurpose (intro / reel / LinkedIn), desde un clip de Minado, o creada manual con "+ Nueva idea" en una columna
2. **Aterriza** — entra al Fixture en `category='undecided'` (Sin definir) con `temperature='cold'` (Frío)
3. **Se clasifica** — JP la arrastra a Redes Sociales o Newsletter según el formato que vaya a tomar
4. **Madura** — JP sube su temperatura mientras la cocina (cold → warm → spotlight)
5. **Se trabaja** — click en la tarjeta abre el panel lateral: notas, prompt, formatos, generación o "Pegar mi versión"
6. **Sale del Fixture** — "📋 Enviar a la parrilla" → `status='ready'` → desaparece del Kanban
7. **Se programa y publica** — en la Parrilla (Sprint 3A): cada formato activo de la idea se convierte en una pieza en el inbox de la Parrilla, JP la arrastra a un día del calendario y marca el checklist de producción

### Fases de la API y qué protocolos se inyectan

**Fase 1 — `angles` (automático al subir transcript):**
→ System prompt = `adn` + `mapa-angulos`
→ Input: transcripción (hasta 30,000 chars)
→ Output: mapa del episodio + 20 ángulos

**Fase 2 — `contenido` (después de seleccionar ángulos):**
→ System prompt = `adn` + `titulos`
→ Input: ángulos seleccionados + mapa
→ Output: 10 títulos + descripción Spotify + descripción YouTube + 3 thumbnails

**Fase 3 — `minado` (automático junto con contenido):**
→ System prompt = `adn` + `minado`
→ Input: transcripción completa + ángulos seleccionados (para voz en off)
→ Output: 15-20 clips para redes + 5-10 opciones de voz en off

**Fase 4 — `repurpose` (cuando JP va a la tab Repurpose):**
→ Tres llamadas en paralelo:
  - `adn` + `intros` → 10 intros leídos
  - `adn` + `reels` → 3 guiones de reel
  - `adn` + `linkedin` → 2 posts de LinkedIn
→ Input: ángulos seleccionados + mapa

**Fase 5 — `medianos-candidatos` (bajo demanda, tab Medianos):**
→ System prompt = `adn` + `medianos`
→ Input: transcript con timestamps (60k chars) + mapa + ángulos seleccionados como prioridad blanda
→ Output: array de candidatos con rango, duración, tipo de ángulo, razón, ángulos_relacionados

**Fase 6 — `medianos-desarrollo` (bajo demanda, después de seleccionar candidatos):**
→ System prompt = `adn` + `medianos`
→ Input: transcript con timestamps + mapa + candidatos aprobados
→ Output: piezas completas con inicio_textual, cierre_textual (citas exactas), 5 títulos, descripción YouTube, 3 thumbnails

**Newsletter — Fase `ideas`:**
→ System prompt = `adn` + `mapa-angulos`
→ Input: artículo del newsletter (30k chars)
→ Output: `resumen` (plomería silenciosa) + lista de ideas validables

**Newsletter — Fase `repurpose`:**
→ Tres llamadas en paralelo:
  - `adn` + `reels` → 1 guión de reel por idea seleccionada
  - `adn` + `carrusel` → 1 carrusel (8-10 slides) por idea
  - `adn` + `linkedin` → 1 post de LinkedIn por idea
→ Input: ideas seleccionadas + resumen del artículo

**Generación desde Fixture (Sprint 3):**
→ Llamada directa a `/api/generate` con `prompt` armado en cliente y `protocols: ['adn', 'linkedin' | 'reels']`
→ Input: contexto compuesto por título + descripción + notas + prompt del autor + ángulo + origen
→ Output: post de LinkedIn o guión de reel según el formato activado

### Cómo se ve en la UI
- Al subir un episodio, lo primero que ve JP es el mapa + los 20 ángulos
- Los ángulos aparecen en la tab de Episodio (renombrada desde "Contenido"), ARRIBA de los títulos
- JP selecciona y genera → títulos, descripciones, thumbnails aparecen abajo
- Los tabs del workspace son (orden actual): **Episodio 📝 · Reels 🎥 · Intros 🎤 · Minado ⛏️ · Medianos 🎬**
- Reels usa la estructura v2 (por-ángulo con hooks/desarrollo/cierres/CTAs seleccionables y armado de guión final)
- Medianos aparece SIEMPRE en el tab bar; si el transcript no tiene timestamps, el contenido del tab muestra el mensaje explicativo en vez del botón de generar
- En sidebar: **Inicio · Podcast (expandible) · Newsletter (expandible) · Fixture · Protocolos · Aprendizajes** (con badge naranja de drafts). Parrilla está oculta por feature flag (`SHOW_PARRILLA = false`)

### Estructura de archivos (v0.7)

```
app/
├── page.js                              → Sidebar + routing por activeView + workspace + tabs (incluye MedianosTab)
├── layout.js                            → Layout root con DM Sans
├── globals.css                          → Estilos globales
└── api/
    ├── episodes/route.js                → CRUD de episodios (con limpieza en cascada de learnings/parrilla/ideas al DELETE)
    ├── newsletters/
    │   ├── route.js                     → CRUD de newsletters (con limpieza en cascada al DELETE)
    │   ├── extract/route.js             → POST: parsear .docx con mammoth → { text } plano
    │   └── generate/route.js            → POST: fases 'ideas' y 'repurpose' (reels + carrusel + linkedin en paralelo)
    ├── generate/route.js                → Generación con Anthropic. Fases actuales: angles, contenido, minado,
    │                                       repurpose (legacy), reels_v2, reels_variant, intros_only,
    │                                       medianos-candidatos, medianos-desarrollo. Además: prompt libre con protocols[] para Fixture y regeneraciones.
    ├── ideas/route.js                   → CRUD del Fixture (GET con filtro de categoría, POST, PUT, DELETE)
    ├── learnings/
    │   ├── route.js                     → CRUD de learnings (POST crear, GET listar). Un learning tiene episode_id O newsletter_id
    │   ├── synthesize/route.js          → POST: agrupa drafts por target_protocol_name, Claude sintetiza patrones (genérico, sin lista fija de slugs)
    │   └── batch/route.js               → POST: batch approve/reject/circumstantial + snapshot en protocol_history
    ├── protocolos/
    │   ├── route.js                     → GET: todos los protocolos con conteos de learnings. force-dynamic + no-store para evitar caching
    │   └── [id]/
    │       ├── route.js                 → GET/PUT: protocolo individual (edición con versionado)
    │       └── history/route.js         → GET: historial de versiones del protocolo
    ├── parrilla/                        → Endpoints activos aunque la vista esté oculta por feature flag
    │   ├── route.js                     → GET: items por status y rango de fechas. POST: crear item individual
    │   ├── [id]/route.js                → PATCH: actualizar item
    │   └── batch/route.js               → POST: enviar múltiples piezas de una vez
    └── descript/                        → Integración Descript
        ├── import/route.js              → POST: import por link (baja SRT + txt, crea/actualiza episodio)
        ├── projects/route.js            → GET: listar proyectos de Descript (fallback de búsqueda)
        ├── clip-text/route.js           → GET: extrae el texto verbatim de un clip del SRT (para "ver texto del clip")
        └── jobs/
            ├── route.js                 → GET: jobs de un episodio (para el panel de cola)
            ├── enqueue/route.js         → POST: encolar cortes (con dedupe) y disparar el procesador
            ├── process/route.js         → POST/GET: empujar la cola de un proyecto (heartbeat + poll de respaldo)
            ├── webhook/route.js         → POST: callback de Descript al terminar un job
            ├── cron/route.js            → GET: lo dispara el cron de Vercel; empuja TODAS las colas pendientes
            ├── cancel/route.js          → POST: cancelar pendientes (queued → cancelled)
            └── retry/route.js           → POST: reencolar un job en error/cancelado
components/
├── FixtureBoard.jsx                     → Kanban del banco de ideas (3 columnas, 3 temperaturas, panel lateral, parrilla, pegar versión)
├── InicioView.jsx                       → Dashboard "Inicio" con cards de episodios, newsletters, ideas del Fixture y próximos programados
├── LearningsReview.jsx                  → Vista de revisión de aprendizajes (síntesis + decisiones)
├── NewsletterUploadModal.jsx            → Modal de subida de newsletter (acepta .txt, .md, .docx; extrae Word server-side)
├── NewsletterView.jsx                   → Workspace del newsletter (fase ideas + fase repurpose con reels, carrusel, linkedin)
├── ParrillaView.jsx                     → Vista de Parrilla completa. Oculta por SHOW_PARRILLA=false pero código conservado
├── ProtocolosViewer.jsx                 → Visor de protocolos (split view + edición + historial + aprendizajes inyectados en verde)
├── DescriptImportModal.jsx             → Modal de import (link de Descript o .txt de respaldo)
├── DescriptJobsPanel.jsx               → Panel de la cola de cortes por episodio (estado por clip + links + cancelar/reintentar)
├── DescriptGenerateBar.jsx            → Barra sticky con modal de confirmación de créditos
└── ui.jsx                               → Utilidades compartidas: EditableText, ApplyBar, EditModal, AIEditBtn, CopyBtn, BankBtn, Skel, Badge, SendToParrillaBtn/Modal, api, apiRetry (fetch con reintento), etc.
lib/
├── generation.js                        → loadProtocol (base + [APRENDIZAJES] aprobados), buildSystem (concat de protocolos), callClaude
├── descript.js                          → Cliente REST de Descript + parseDescriptLink + buildCutPrompt + composicionName + interpretJob (lee la respuesta real de un job) + extractCompositionId
├── descript-queue.js                    → Cola persistente de cortes: enqueueJobs, processNext (serializa por proyecto con claim optimista), completeJob, pollRunningJob, retryJob
└── supabase.js                          → Cliente de Supabase (anon key)
```

En la raíz del repo:
- `cmo-engine-bible.md` — este documento
- `spec-sprint-medianos.md` — spec de implementación del Sprint Medianos (referencia histórica)
- `SPEC-integracion-descript.md` — spec de implementación de la integración Descript (referencia histórica)
- `supabase-migration-descript-fix.sql` — migración correctiva de columnas de `descript_jobs`/`episodes` (referencia; ya aplicada en Supabase)
- `vercel.json` — configura el cron de Descript (`/api/descript/jobs/cron` cada minuto)
- `protocolo-carrusel-v1.md` — copia local del contenido del protocolo `carrusel` (fuente de verdad sigue siendo la tabla `protocolos` en Supabase)

---

## 7. ARQUITECTURA DE PROTOCOLOS — DECISIONES CLAVE

### El problema que resolvimos
Los protocolos en Notion estaban diseñados para sesiones humano-Claude (redundancia OK, cada protocolo autocontenido). Para un sistema API donde se inyectan como system prompt, necesitábamos: separación de capas, cero redundancia, modularidad por fase, y puntos claros de inyección de aprendizajes.

### Arquitectura de 3 capas

**Capa 0 — ADN (se inyecta en TODA llamada):**
Protocolo lean (~500 palabras) con: identidad del show, audiencia, posición editorial, tono, reglas de idioma, números como arma, checklist anti-IA. Se carga siempre.

**Capa 1 — Protocolos de fase (se inyecta solo el que corresponde):**
- `mapa-angulos` — Cómo extraer el mapa y generar 20 ángulos con criterios de evaluación. También lo usa el newsletter (fase `ideas`) para armar el mapa "plomería silenciosa" del artículo
- `titulos` — Títulos + descripciones (Spotify/YouTube) + keywords para el episodio
- `intros` — 10 intros leídos con 4 fórmulas narrativas
- `minado` — Micro-contenido de 20-90 seg para redes (clips que funcionan solos en el feed, NO trailers — se tercerizan)
- `medianos` — Contenido mediano de 4-12 min: mini-episodios con rango, inicio/cierre textuales, 5 títulos, descripción YouTube y 3 thumbnails. Requiere transcript con timestamps
- `reels` — Guiones de reel con voz de Daniela. Se usa tanto en el workspace del episodio (reels_v2 por-ángulo) como en el newsletter (repurpose)
- `carrusel` — Carrusel de Instagram: 8-10 slides con portada + desarrollo + CTA, 5 patrones de gancho. Se usa en el newsletter (fase `repurpose`); el diseño visual se hace aparte (Canva)
- `linkedin` — Posts de LinkedIn. Se usa tanto en repurpose del episodio como del newsletter

**Capa 2 — Aprendizajes (se inyectan dinámicamente):**
Cada protocolo tiene una sección `[APRENDIZAJES]` al final. El Engine busca los aprendizajes aprobados en la tabla `learnings` y los concatena como bullets. Los aprendizajes son una capa separada — el protocolo base no se modifica automáticamente. Periódicamente (cada 10-15 episodios), JP hace un "protocol refresh" donde consolida los aprendizajes más consistentes en el protocolo base.

### Qué se migró de Notion al Engine
- **Del protocolo de Newsletter** → checklist anti-IA (ahora en ADN), reglas de idioma/dialecto (ahora en ADN), principios de "el episodio es la chispa" y "mecanismos no campañas" (ahora en mapa-angulos)
- **Del protocolo de Bandeja de Entrada** → referentes intelectuales como marcos de evaluación (ahora en mapa-angulos), frameworks de análisis
- **Del Criterio de Curaduría** → patrones de "lo que nos encanta" adaptados a ángulos de episodio (ahora en mapa-angulos)
- **Del Protocolo General** → identidad y tono (ahora en ADN)

### Qué se queda en Notion (no entra al Engine todavía)
- Newsletter (JP lo sigue haciendo en Claude directo)
- Bandeja de Entrada (futuro)
- Investigación (futuro)
- Criterio de Curaduría (su contenido relevante ya se absorbió en ADN y mapa-angulos)
- Protocolo General (su contenido relevante ya se absorbió en ADN)

### Decisiones específicas sobre protocolos
- **20 ángulos, no 15.** JP prefiere más opciones para ir a la fija.
- **Presentación del invitado con color es preferencia, no regla.** A veces es mejor decir directo quién es y qué hace.
- **Detalles personales del invitado solo si son valiosos.** No forzar si la conversación no tiene matices personales.
- **Minado es 100% micro-contenido para redes, NO trailers.** Los trailers se tercerizan. Clips de 20-60 seg que funcionan solos en el feed.
- **Mínimo 3-5 clips con Daniela [+DANI]** para mostrar que es conversación, no monólogo.
- **Voz en off se nutre de ángulos seleccionados**, no del transcript crudo.
- **Intros es Fase 2 (producción del episodio), no Fase 4 (repurpose).** Actualmente se genera en repurpose por UX, pero conceptualmente es producción.
- **LinkedIn se construyó desde cero** porque en Notion estaba vacío. Se usaron patrones del Newsletter + tono intermedio.
- **Reels estaba más completo de lo que decía la biblia anterior** — tiene arquitectura de 4 tiempos, tipos de gancho, expresiones colombianas, tono de Daniela, todo.

---

## 8. SISTEMA DE APRENDIZAJE — LO MÁS IMPORTANTE

### Cómo funciona hoy (v0.6)
1. Mientras JP trabaja en un episodio o en una idea del Fixture, cada vez que da feedback, usa "Aplicar cambios y aprender", o pega su propia versión sobre una pieza generada, el sistema crea un borrador de aprendizaje SILENCIOSAMENTE
2. Los borradores se acumulan — visible como badge naranja en el sidebar ("Aprendizajes" + número)
3. Los aprendizajes aprobados se inyectan automáticamente en el protocolo correspondiente en runtime
4. Vista de revisión donde JP ve los aprendizajes sintetizados por protocolo. La IA agrupa y sintetiza patrones — NO es una lista cruda de feedbacks
5. Para cada patrón sintetizado: badge de confianza, feedbacks originales expandibles, cambio propuesto para el protocolo
6. JP aprueba, rechaza, o marca como "circunstancial" cada patrón
7. Los aprobados se aplican en lote (actualiza status en `learnings` + guarda snapshot en `protocol_history`)

### Cómo funcionan los aprendizajes técnicamente
- Los aprendizajes viven como capa separada — el protocolo base NO se modifica automáticamente
- En cada llamada a la API, el sistema: (1) carga el protocolo base de Supabase, (2) busca learnings aprobados para ese protocolo, (3) los concatena en la sección [APRENDIZAJES], (4) inyecta todo como system prompt
- Periódicamente (cada 10-15 episodios), JP puede hacer un "protocol refresh" manual donde consolida los aprendizajes más consistentes en el protocolo base

### Dónde aplica "Editar con IA + Aprender"
- Títulos del episodio (feedback inline + "Aplicar cambios y aprender")
- Descripciones Spotify y YouTube (modal de dos columnas)
- Intros (modal de dos columnas)
- Sugerencias de thumbnail (feedback inline)
- Output de repurpose del episodio: reels (v2 con hooks/desarrollo/cierres/CTAs), LinkedIn (edición manual)
- Minado (feedback inline)
- Piezas generadas desde el Fixture (LinkedIn, Reel)
- **Newsletter (Sprint 3):** cada pieza del `repurpose_content` — reel, carrusel (con `CarruselBlock`), LinkedIn — tiene "Editar con IA y aprender" que crea learning con `newsletter_id` y `target_protocol_name` correspondiente
- **Medianos (Sprint Medianos):** títulos con feedback inline + `ApplyBar`, descripción YouTube con modal "Editar con IA y aprender". Todos crean learnings con `target_protocol_name = 'medianos'`

### "Pegar mi versión" (Sprint 3) — aprendizaje sin prompt
Cuando JP pega su propia versión sobre una pieza generada en el Fixture, el sistema:
1. Reemplaza el `cuerpo` (LinkedIn) o `guion` (Reel) con el texto de JP
2. Marca la pieza con `source: 'manual'` en `generated_content`
3. Crea automáticamente un `learning` draft con `original_content` = versión IA y `feedback` = texto de JP, contextualizado con el título de la idea
4. Ese learning entra al flujo normal de síntesis y revisión

Esto convierte cada reescritura silenciosa de JP en señal de entrenamiento sin que él tenga que escribir feedback explícito.

### Principio clave
SIEMPRE disponible tanto edición manual directa (click para editar cualquier texto) como "Editar con IA". El usuario siempre puede tocar el texto sin depender de IA.

---

## 9. BANCO DE IDEAS / FIXTURE (Sprint 3 — IMPLEMENTADO v0.5)

### Visualización Kanban
- Tres columnas en orden fijo: **💭 Sin definir** → **📱 Redes Sociales** → **📨 Newsletter**
- Dentro de cada columna, tres filas de temperatura siempre visibles:
  - **💡 Quiere ver la luz** (verde claro, arriba)
  - **🌤️ Tibio** (lila claro, medio)
  - **❄️ Frío** (azul-gris claro, abajo)
- Tarjetas arrastrables entre columnas (cambia `category`) y entre temperaturas (cambia `temperature`)
- Drop sobre tarjeta del mismo `category` → aparear; drop en espacio vacío de sección → mover
- Botón "+" Trello-style al fondo de cada columna → crea con categoría pre-asignada

### Tarjeta compacta
- Título editable inline (click)
- Descripción corta truncada (`line-clamp-2`)
- Badge de ángulo (si viene de episodio)
- Badge "🎙️ Desde episodio" si `origin_id` está seteado
- Chips de formatos activos (lectura, no clickeables desde la tarjeta — se editan en el panel)

### Panel lateral expandido (slide-in tipo Notion)
- Se desliza desde la derecha al clickear una tarjeta — ~60vw, altura completa de viewport, overlay con blur
- Renderizado vía `createPortal` a `document.body` para escapar contextos de apilamiento
- Cierre con X visible, click en overlay, o tecla Escape (disponible siempre, incluso después de generar)
- Header con título de la idea, badges de ángulo/origen, botón X
- Barra de controles persistente:
  - Toggles de formato (LinkedIn / Reel / Newsletter)
  - Selector de temperatura (3 botones con icono + label)
- Layout dos columnas:
  - **Izquierda:** notas + prompt con `AutoTextarea` (auto-resize), `text-base`, `leading-[1.75]` — sensación de bloc de notas
  - **Derecha:** contenido generado (aparece solo cuando hay contenido)
- Botón "Generar contenido (formatos)" usa los formatos activos en paralelo
- Cada pieza generada (`GeneratedBox`) tiene badge de patrón, "Editar con IA", copiar, y "📝 Pegar mi versión"
- Footer con botón "📋 Enviar a la parrilla"

### Funcionalidades especiales
- **Aparear ideas:** drag sobre tarjeta del mismo `category` → modal de confirmación → fusiona descripción, notas y formatos; fuente queda con `status='merged'` y se oculta
- **"Llevar al banco":** botón "Al banco" (icono Lightbulb) en cada ángulo del workspace, cada reel/LinkedIn de Repurpose, y cada momento de Minado → crea idea con `origin_id` y `origin_type='episode'`. Si la pieza ya tiene contenido (un post de LinkedIn de Repurpose), se guarda en `generated_content` desde el inicio.
- **"Enviar a la parrilla":** cambia `status` a `'ready'` → la idea sale del Fixture (filtro excluye `merged` y `ready`) y dispara `POST /api/parrilla/batch` que crea una pieza por cada formato activo en el inbox de la Parrilla (Sprint 3A).
- **"Pegar mi versión":** modal con la versión IA de referencia. Al guardar, hace patch en `generated_content[fmt]` con `source: 'manual'` y crea automáticamente un `learning` draft (original=IA, feedback=manual) para que el sistema aprenda de la diferencia. Si no había versión IA con la que comparar, solo guarda el texto sin crear learning.

### Lo que NO se construyó del spec original (decisiones de simplificación)
- ❌ Temperatura "🔥 Caliente" — eliminada para reducir a 3 niveles más claros (spotlight/warm/cold). Las ideas legacy con `temperature='hot'` se mapean a Tibio en runtime, sin migración destructiva.
- ❌ Generar Newsletter desde el Fixture — `newsletter` está en `FORMAT_OPTIONS` (toggle disponible) pero no en `GENERABLE_FORMATS`. Por ahora solo LinkedIn y Reel se generan; newsletter sigue siendo trabajo en Claude.

### Pendiente del spec original (no construido aún, JP lo quiere)
- 📋 **Botón "Copiar idea completa con contexto"** — genera un bloque markdown con título, descripción, notas, prompt, ángulo, origen y el contenido generado, listo para pegar en Claude. JP lo usa para newsletters que sigue escribiendo en Claude directo. Existía en el spec original del Sprint 3 y se quitó durante la reescritura del panel; pendiente de reagregar.

### Decisiones de UX del Sprint 3 (RESPETAR en sprints futuros)
- **Paneles laterales tipo Notion, no popups centrados.** JP no le gusta el modal centrado clásico. Cualquier vista de detalle nueva (Parrilla, Chat) debe deslizarse desde la derecha.
- **Los textareas se sienten como un bloc de notas, no como un formulario.** Tipografía grande (text-base/text-lg), `line-height` generoso, auto-resize con el contenido. Esto aplica a TODO campo de escritura larga del sistema.
- **Cuando un objeto está abierto, todo se edita desde adentro.** Formatos, temperatura, notas, prompt — sin obligar al usuario a cerrar el panel para tocar algo. Patrón a replicar en la Parrilla cuando se programe una pieza.
- **JP prefiere ver las cosas en producción (Vercel), no en localhost.** Hacer deploys rápidos por feature en vez de iterar local sin pushear.
- **Las temperaturas son herramienta de visualización, no estado clickeable.** Los headers de color son la guía; el cambio de temperatura ocurre por drag-and-drop a otra fila o desde el selector dentro del panel. Nada de emojis-botón en la tarjeta.
- **El orden de las columnas refleja el flujo de la idea.** Llegan a "Sin definir" (izq), se clasifican a "Redes Sociales" o "Newsletter" (centro / der), y cuando están listas salen a la parrilla. Mantener esta semántica izquierda-a-derecha en cualquier rediseño.
- **"Pegar mi versión" existe porque a veces JP escribe el contenido por fuera del sistema.** El objetivo es doble: (1) que todo el contenido viva en un solo lugar, (2) que el sistema aprenda comparando la versión IA con lo que JP escribió. Patrón a extender a otras secciones donde JP escribe por fuera (newsletter, intros).

---

## 10. PARRILLA — DISUELTA (Sprint Universo, v0.8)

**Decisión tomada en el Sprint Universo:** la Parrilla se **disuelve** como concepto de producto. Estaba confundiendo tres trabajos distintos:

1. **Planear / programar publicaciones** → se va a **Metricool** (JP ya tiene un plan Advanced con calendario y publicación cross-platform; no reconstruir lo que ya existe fuera).
2. **Seguimiento de producción / status** → es el estado del nodo en el Universo (§4 Sprint Universo), sin checklist de pipeline. Nada de "aprobado → grabado → editado → publicado" — la app **NO es un project manager** (§1.1 principio 6). El equipo ya tiene su Excel para el flujo operativo.
3. **Registro de lo publicado + resultados** → **es el Universo**. La bisagra que gradúa un episodio de taller a activo estratégico es el acto de publicación (pegar link vía `RegistrarPublicacionModal` / descartar con razón), y ocurre en el mapa.

**Estado del código:** el código completo del Sprint 3A sigue en el repo (`components/ParrillaView.jsx`, `app/api/parrilla/*`, tabla `parrilla_items`), pero está fuera del flujo de v0.8:

- Feature flag `SHOW_PARRILLA = false` en `app/page.js` y `components/ui.jsx` sigue apagado.
- El sidebar no lo muestra y el botón "Enviar a Parrilla" no aparece en Repurpose / Minado / Fixture / Newsletter.
- La vista sigue navegable si se fuerza `activeView='parrilla'` (útil solo para auditar el código antes de borrarlo).

**Roadmap del código:** no hay plan activo de reactivarla. Cuando llegue el momento de limpieza, se puede borrar sin bajar producción. La tabla `parrilla_items` se puede archivar/borrar (no la referencia nadie desde el flujo v0.8).

Ver §4 → "Sprint 3A" para la historia de qué construyó la Parrilla en su día. El schema vive en §3 → tabla `parrilla_items` (histórica).

---

## 11. CHAT EMBEBIDO (Sprint 4 — pendiente)

- Panel que se desliza desde la derecha, disponible desde cualquier pantalla
- Tiene contexto automático de dónde está el usuario (episodio, idea, protocolo, slot de parrilla)
- Permite conversaciones largas y exploratorias (como trabajar en Claude pero dentro del sistema)
- Botones de acción: "Crear idea en fixture", "Actualizar protocolo", "Aplicar cambio", "Programar en parrilla"
- JP lo valora porque no se pierde entre prompts — la IA ya sabe todo el contexto

---

## 12. ROADMAP DE SPRINTS

### Sprint 1 ✅ COMPLETO (v0.3, 17 Mayo 2026)
- ✅ Supabase conectado, episodios persisten
- ✅ Workspace funcional con 3 tabs
- ✅ Upload .txt con drag/drop
- ✅ Generación progresiva con API Anthropic server-side
- ✅ Feedback inline + badge de aprendizajes
- ✅ Protocolos cargados en Supabase (7 protocolos, arquitectura de 3 capas)
- ✅ Flujo correcto: ángulos primero → seleccionar → generar contenido
- ✅ Edición manual directa del texto en todas las secciones
- ✅ "Editar con IA" en descripciones e intros
- ✅ Minado reorientado a micro-contenido para redes (no trailers)
- ✅ Repurpose genera intros + reels + LinkedIn en paralelo

### Sprint 2 ✅ COMPLETO (v0.4, 18 Mayo 2026)
- ✅ Vista de revisión sintetizada (la IA agrupa aprendizajes por protocolo y los sintetiza con Claude)
- ✅ Aprobar / rechazar / circunstancial para cada patrón sintetizado
- ✅ Aplicación en lote a protocolos (actualizar tabla `learnings` status + guardar en `protocol_history`)
- ✅ Visor de protocolos: ver todos los protocolos, su contenido, aprendizajes inyectados en verde, historial de versiones
- ✅ Botón copiar cada protocolo (protocolo completo + aprendizajes, para usar en Claude)
- ✅ Edición directa del protocolo desde la app (con razón del cambio + versionado automático)
- ✅ Navegación por vistas en sidebar (Aprendizajes + Protocolos como items permanentes)

### Sprint 3A ✅ COMPLETO (v0.5, 27 Mayo 2026)
- ✅ Tabla `parrilla_items` en Supabase (con RLS deshabilitado)
- ✅ API routes: `GET/POST /api/parrilla`, `PATCH /api/parrilla/[id]`, `POST /api/parrilla/batch`
- ✅ Vista Parrilla en sidebar con split view (inbox + calendario)
- ✅ 3 vistas de calendario: Semana, Mes, Lista
- ✅ Drag and drop del inbox al calendario
- ✅ Checklist de producción por tipo de contenido (6 tipos con checks específicos)
- ✅ 3 estados de color: gris (sin iniciar), amarillo (en progreso), verde (listo)
- ✅ Ghost slots recurrentes en martes (Episodio/Newsletter alternando por semana ISO)
- ✅ "Enviar a Parrilla" desde Fixture, Repurpose y Minado
- ✅ Creación manual de piezas + descartar piezas
- ✅ Histórico visible en calendario

### Sprint 3B ✅ COMPLETO (v0.5, 26 Mayo 2026)
- ✅ Fixture Kanban con tres columnas: Sin definir (izq) / Redes Sociales (centro) / Newsletter (der) — el orden refleja el flujo de la idea
- ✅ Temperaturas como filas visuales (💡 Quiere ver la luz / 🌤️ Tibio / ❄️ Frío) — se eliminó 🔥 Caliente
- ✅ Drag-and-drop de tarjetas entre columnas y entre temperaturas (PUT category/temperature)
- ✅ Aparear: drop sobre tarjeta del mismo category → modal de confirmación → merge
- ✅ Drop en espacio vacío de sección → mover (no abre merge por accidente)
- ✅ Botón "+" Trello-style al fondo de cada columna con categoría pre-asignada
- ✅ Panel lateral deslizable tipo Notion (~60vw) renderizado vía createPortal, con slide-in animado
- ✅ Layout dos columnas en el panel: notas/prompt (auto-resize, text-base, line-height generoso) + contenido generado
- ✅ Toggles de formato y temperatura siempre visibles en el header del panel
- ✅ Cierre del panel siempre disponible: X + overlay + Escape (incluso después de generar)
- ✅ Generación de contenido desde la idea (LinkedIn + Reel) con **"Editar con IA" en cada pieza generada — diferenciador principal del producto**
- ✅ "Llevar al banco" desde ángulos, Repurpose (intros / reels / LinkedIn) y Minado en el workspace de episodios
- ✅ "📋 Enviar a la parrilla": PUT status='ready', idea sale del Fixture con feedback verde "Enviada a la parrilla"
- ✅ "📝 Pegar mi versión" con creación automática de learning draft (AI vs manual) — aprendizaje sin prompt
- 📋 Pendiente del Sprint 3: botón "Copiar idea completa con contexto" (bloque markdown listo para pegar en Claude) — se quitó al rediseñar el panel, JP lo sigue queriendo

> **Parrilla — ya implementada en Sprint 3A** (ver bloques Sprint 3A arriba y sección 4). Sale del roadmap pendiente. Hoy está oculta por feature flag; el código sigue en el repo.

### Sprint Newsletter ✅ COMPLETO (v0.5)
- ✅ Sidebar con Newsletter expandible al lado de Podcast
- ✅ Upload de artículo en `.txt`, `.md` o `.docx` (extracción con `mammoth` server-side)
- ✅ Fase `ideas`: mapa "plomería silenciosa" + lista de ideas validables (system prompt `adn + mapa-angulos`)
- ✅ Fase `repurpose`: 3 llamadas en paralelo (reels, carrusel, linkedin), 1 pieza por idea seleccionada
- ✅ Protocolo `carrusel` en Supabase con arquitectura de 8-10 slides (portada + desarrollo + CTA) y 5 patrones de gancho
- ✅ NewsletterView con edición manual, "Editar con IA y aprender" y CarruselBlock slide por slide
- ✅ Aprendizajes con `newsletter_id` en vez de `episode_id` — mismo circuito genérico

### Sprint Medianos ✅ COMPLETO (v0.6, 7 Julio 2026)
- ✅ Cuarto tab "Medianos 🎬" en el workspace
- ✅ 3 columnas JSONB nuevas en `episodes`: `medianos_candidatos`, `medianos_seleccionados`, `medianos`
- ✅ Protocolo `medianos` en Supabase (Capa 1, slug `medianos`, v1) con sección `[APRENDIZAJES]`
- ✅ Fase A `medianos-candidatos`: propone tramos de 4-12 min con rango, tipo de ángulo y razón, usando ángulos seleccionados como prioridad blanda
- ✅ Fase B `medianos-desarrollo`: convierte los aprobados en piezas completas (inicio/cierre textuales exactos, 5 títulos, descripción YouTube, 3 thumbnails)
- ✅ Guarda de timestamps: episodios sin marcas de tiempo muestran mensaje explicativo y no disparan generación
- ✅ Reglas duras reforzadas en el prompt: rango_inicio antes de rango_fin, duración coherente, citas textuales sin reformatear
- ✅ Circuito de aprendizaje conectado bajo `target_protocol_name='medianos'` (síntesis y batch son genéricos, no hubo que agregar el slug a ninguna lista)
- ✅ Fix colateral: `force-dynamic` + `no-store` en `/api/protocolos` para que el visor siempre refleje Supabase

### Sprint Descript ✅ COMPLETO (9 Julio 2026)
- ✅ Import por link de Descript (baja transcript SRT + txt automático); `.txt` queda como respaldo
- ✅ Tabla `descript_jobs` (cola persistente) + columnas Descript en `episodes` (`descript_project_id/composition_id/composition_name`, `transcript_srt`)
- ✅ Cortes de micros y medianos vía el agente de Descript, con nombres `MICRO_EP{n}_` / `MEDIANO_EP{n}_` y original intacto
- ✅ Cola serializada por proyecto (Descript solo permite 1 job por proyecto a la vez), con dedupe, reintento y cancelar pendientes
- ✅ Avance por webhook (prod) + heartbeat (pestaña abierta) + cron de Vercel (`/api/descript/jobs/cron`, `vercel.json`)
- ✅ Protocolo `minado` a v2 (gancho + frase_inicio/cierre + frase_iman para poder cortar)
- ✅ Tarjeta de micro rediseñada (gancho + punchline + "ver texto del clip" vía `/api/descript/clip-text`) y links que aterrizan en el clip exacto
- ✅ Medianos con un solo botón "Desarrollar y enviar a Descript"
- ✅ Env de producción: `DESCRIPT_API_TOKEN`, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`

### Sprint Estrategia ✅ COMPLETO (v0.7, 9 Julio 2026)
- ✅ Migración `migrations/sprint-estrategia.sql`: 3 tablas nuevas + vista `latest_metrics`, RLS off
- ✅ Capa de providers de métricas (`lib/metrics/index.js` + mock implementado + stubs YouTube/Metricool/Spotify)
- ✅ `lib/utm.js` genera UTMs; `RegistrarPublicacionModal` captura piezas publicadas
- ✅ API routes: `/api/published` (+ `/import` con papaparse), `/api/metrics` + `/sync`, `/api/subscribers` + `/import`, `/api/radar`, `/api/episodes/[id]/linaje`
- ✅ RadarView (pulso 7d + patrones), PublicoView (crecimiento + import CSV + panel latente de enriquecimiento), LineageTab (árbol madre → piezas → resultado)
- ✅ Feature flag `SHOW_ESTRATEGIA=true`; sidebar agrupado Estrategia/Producción; `activeView='radar'` por default
- ✅ `components/estrategia/` agregado al `content` de `tailwind.config.js`
- ✅ Seed opcional `scripts/seed-estrategia.mjs` para ver UI viva sin APIs reales

### Sprint Universo ✅ COMPLETO (v0.8, 12-17 Julio 2026)
- ✅ Migración `migrations/sprint-universo.sql`: `status` + `discard_reason` en `published_items`, tabla `products` (UUID fijo CMO), `product_id` en tablas core con DEFAULT + backfill; RLS off
- ✅ Universo del episodio con **3 estados** (publicada / propuesta / descartada) + clic-según-estado + filtro segmentado + cara por default según ciclo de vida
- ✅ Registrar/descartar piezas: modal con selector de status; descartar crea `learning` draft
- ✅ Navegabilidad del grafo: `PiezaPanel` (vecinos clickeables), `AnguloView` cross-episodios, Radar clickeable
- ✅ Endpoints nuevos: `GET /api/published/[id]`, `GET /api/angulos/[angle_type]`
- ✅ **Aprendizajes del mes** (preview de Narrar): carrusel full-screen de 8 insights DEMO hardcodeados (`isDemo:true`, chip DEMO removible)
- ✅ Costura multi-producto: `lib/product.js` + `CURRENT_PRODUCT_ID` + `withProduct`/`withProductPayload` aplicados en todos los inserts/reads core
- ✅ Provider YouTube real (Data API v3, API key sin OAuth) — se activa con `METRICS_PROVIDER != 'mock'` + `YOUTUBE_API_KEY`
- ✅ Provider Metricool real (IG reels, IG posts, LinkedIn, TikTok) — 4 endpoints correctos por red; cache por (endpoint, ventana); match por URL + shortcode + IDs largos; medido 91% match rate en producción
- ✅ Fix: plataformas sin provider devuelven `[]` (no caen al mock) — evita métricas falsas en newsletters de Substack
- ✅ Datos reales cargados: 4 episodios reales, 5 newsletters, 137 piezas importadas vía CSV, métricas YouTube (34) + Metricool (~99 IG/TT/LI)
- ✅ Desplegado a producción (Vercel auto-deploy desde `main` tras merge de `sprint-universo`)

### Sprint 4 — Chat embebido + pulido (PENDIENTE)
- Panel lateral con contexto automático (episodio / idea / protocolo / pieza del Universo)
- Botones de acción ("Crear idea en fixture", "Actualizar protocolo", "Aplicar cambio")
- Pulido general

### Futuro (actualizado tras Sprint Universo)
- **Motor real de insights** (los "Aprendizajes del mes" hoy son demo/inventados) — reemplaza `lib/aprendizajes-demo.js` con un cálculo real sobre `metric_snapshots + published_items + subscribers`
- **Modo Narrar completo** (hoy solo el preview) — convertir el Universo en historia caminada para clientes/equipo, superficie de venta/retención de la agencia
- **Encender la capa de identidad / target** (columnas `is_target/cargo/empresa` ya existen latentes) — cuando la comunidad crezca; agrega vistas de "quién entró por qué pieza"
- **Enriquecer la card madre** con métricas propias del episodio (CTR, % visto, watch time de YouTube — ya pulleables; profundidad de Spotify vía Rubén / manual). Ver §20.
- **El cruce diferenciador**: retención del episodio × desempeño de la pieza, unidos por el ángulo (algo que solo CMO puede computar). Ver §20.
- **Plataforma multi-producto** (auth, roles, onboarding, config por cliente, billing) — la costura `product_id` ya está lista
- **Autenticación / login** (deuda actual: la app es abierta al que tenga el URL)
- **LinkedIn matching completo**: registrar piezas con URLs `feed/update/urn:li:share:{ID}` para cerrar el gap (§18)
- **Chrome explícito de "modo producción"** (por ahora basta el default por ciclo de vida)
- **Sync de métricas programado** (cron diario) — hoy es manual (curl al endpoint)
- MCP para conectar Claude.ai con el sistema
- Bandeja de entrada / Google News interno
- Espacio de feedback agregado (comentarios, DMs, socia)
- Landing page y pricing para venta

---

## 13. PROTOCOLOS EN SUPABASE — ESTADO ACTUAL

Los **9 protocolos** están cargados en la tabla `protocolos` de Supabase. Los 7 originales se insertaron el 17 Mayo 2026; `carrusel` se agregó durante el sprint del Newsletter; `medianos` se agregó el 7 Julio 2026 durante el sprint homónimo. Los chars y versiones de abajo se confirmaron contra el endpoint `/api/protocolos` en producción; `reels` está en v2 porque se editó desde el visor, y `minado` pasó a v2 con el Sprint Descript (frases de inicio/cierre + gancho + frase_iman).

| Slug | Nombre | Versión | Chars | Descripción |
|------|--------|---------|-------|-------------|
| `adn` | ADN — Identidad y reglas globales | 1 | 3,472 | Identidad, audiencia, tono, idioma, checklist anti-IA. Se inyecta en TODA llamada. |
| `mapa-angulos` | Mapa del Episodio + Ángulos | 1 | 4,545 | Cómo extraer mapa estructurado + 20 ángulos con 10 patrones y marcos de evaluación. También lo usa el newsletter para armar el mapa "plomería silenciosa" del artículo. |
| `titulos` | Títulos y Descripciones | 1 | 3,372 | 10 títulos (formato fijo, máx 60 chars), descripciones Spotify/YouTube, keywords, pilares. |
| `intros` | Intros Leídos | 1 | 4,424 | 10 intros con 4 fórmulas narrativas, reglas de construcción, preferencias de Daniela. |
| `minado` | Minado — Micro-contenido para Redes | 2 | — | 15-20 clips autónomos, 6 categorías, clips con Daniela [+DANI], voz en off. v2 (Sprint Descript): cada clip emite `gancho`, `frase_inicio` y `frase_cierre` verbatim (anclas de corte), `frase_iman`, `duracion_seg`, `categoria`, `dani`, `por_que_funciona`, `sugerencia_caption`. |
| `medianos` | Contenido Mediano | 1 | 6,348 | Piezas de 4-12 min empaquetadas como mini-episodios. Rango temporal, tipo de ángulo, inicio/cierre textuales, 5 títulos, descripción YouTube, 3 thumbnails. Requiere transcript con timestamps. |
| `reels` | Reels de Ideas Propias | 2 | 6,716 | Guiones de reel con arquitectura 4 tiempos, voz de Daniela con expresiones colombianas. v2 se editó desde el visor. |
| `carrusel` | Carrusel de Instagram — Repurpose | 1 | 4,177 | 8-10 slides con portada + desarrollo + CTA. 5 patrones de gancho (dato_contundente, contraintuitivo, dolor_directo, promesa_lista, error_senalado). Se usa en el newsletter. |
| `linkedin` | LinkedIn Posts | 1 | 3,191 | Posts con 5 patrones de hook, estructura hook/desarrollo/cierre, tono intermedio. Se usa tanto en repurpose del episodio como del newsletter. |

### Protocolos en Notion (NO en el Engine)
- 📨 Newsletter (protocolo de escritura del artículo) — JP escribe el newsletter en Claude directo. El Engine solo repurposea el artículo terminado
- 📥 Bandeja de Entrada — futuro
- 🔍 Investigación — futuro
- 🧭 Criterio de Curaduría — su contenido relevante ya se absorbió en `adn` y `mapa-angulos`
- 📖 Protocolo General — su contenido relevante ya se absorbió en `adn`

---

## 14. REFERENTES DE UX

- **Castmagic** — Competidor directo. "Una fuente → múltiples outputs." Diferenciador de CMO Engine: workflow de selección de ángulos + aprendizaje.
- **Gamma** — Generación progresiva satisfactoria, secciones aparecen una por una.
- **Linear** — Navegación lateral, un objeto (episodio) con múltiples secciones.
- **Notion** — Panel lateral deslizable como patrón de edición de detalle sin perder contexto del listado (usado en el Fixture).
- **Trello** — Botón "+" al fondo de cada columna del Kanban (usado en el Fixture).
- **Descript** — Referente futuro para integración de minado de video.
- **NotebookLM** — Lógica de "subir fuentes" como punto de partida.
- **Elicit** — Mejor referente de "structured AI workflows donde el humano decide en puntos clave". Descompone tareas en micro-pasos revisables.

---

## 15. ERRORES A NO REPETIR

1. **NUNCA tema oscuro.** JP lo odia para este producto. Siempre tema claro cálido.
2. **NUNCA separar la generación en clicks manuales por fase.** La generación debe ser progresiva y automática (excepto donde JP debe seleccionar ángulos).
3. **NUNCA escribir un spec resumido esperando que otro chat lo interprete bien.** El spec debe ser tan detallado que un desarrollador que nunca habló con JP pueda construir lo que se necesita.
4. **NUNCA perder el código del MVP como referencia.** El MVP tiene el alma del proyecto — cualquier reconstrucción debe partir de su estética y UX.
5. **El Sprint 1 fallido usó tablas de Supabase distintas** (`generated_content`, `feedback_log`, `protocols`) que no coinciden con las que creamos. Siempre usar las tablas documentadas en la sección 3.
6. **Los protocolos NO deben tener redundancia entre sí.** El ADN tiene las reglas globales; los protocolos de fase solo tienen lo específico de su tarea. Si algo se actualiza (ej: definición de audiencia), se actualiza en UN solo lugar (ADN).
7. **Minado es para micro-contenido de redes, NO para trailers.** Los trailers se tercerizan. No meter lógica de trailer en el sistema.
8. **Presentar al invitado "con color" es preferencia, no regla rígida.** No forzar historias personales si la conversación no las tiene.
9. **SIEMPRE tener `.gitignore` con `node_modules/` ANTES de hacer `git init`.** Si se commitea `node_modules/`, GitHub rechaza el push por archivos > 100MB y hay que recrear el repo desde cero.
10. **El alias `@/` en imports requiere `jsconfig.json`** con `{ "compilerOptions": { "paths": { "@/*": ["./*"] } } }`. Sin este archivo, los imports `@/components/...` fallan en build.
11. **Modales y paneles fixed dentro de árboles con overflow/transform deben usar `createPortal`** a `document.body`. Sin esto, un ancestro puede crear un contexto de apilamiento que rompe el `position: fixed` (le pasó al panel del Fixture en su primera versión).
12. **El drop sobre un contenedor padre no debe gatear su lógica en `dragOverState` del hijo.** El `stopPropagation` del onDrop del hijo ya garantiza exclusividad. Mirar state que pudo quedar desactualizado por un hover viejo lleva a bugs como "el merge se dispara al soltar en espacio vacío".
13. **Siempre deshabilitar RLS en tablas nuevas de Supabase** con `ALTER TABLE nombre DISABLE ROW LEVEL SECURITY;` inmediatamente después de crearla. Por default Supabase crea tablas con RLS activo y sin políticas, lo que bloquea TODAS las operaciones (insert, select, update, delete) desde la anon key. Todas las tablas del proyecto CMO Engine usan RLS deshabilitado.
14. **Agregar nuevos directorios de componentes al `content` de `tailwind.config.js`.** Si un archivo `.jsx` vive en un directorio que no está en el array `content`, las clases Tailwind que SOLO aparecen en ese archivo no se generan en el CSS compilado y el layout se rompe silenciosamente (ej: `grid-cols-7` no se aplicaba porque `components/` no estaba en el scan).
15. **Los Route Handlers `GET` sin parámetros dinámicos se cachean por defecto en Next.js 14 App Router.** Si un endpoint devuelve datos que cambian por fuera del ciclo de request (ej: JP inserta una fila directo en el SQL editor de Supabase), la respuesta cacheada oculta esos cambios. Solución: `export const dynamic = 'force-dynamic'` en el route + `cache: 'no-store'` en el fetch cliente. Le pasó al visor de Protocolos con `medianos` recién agregado.
16. **`inicio_textual` y `cierre_textual` de los medianos son CITAS TEXTUALES.** El código no debe reformatear, limpiar puntuación, quitar muletillas ni normalizar espacios. El modelo los devuelve tal como aparecen en el transcript y así deben persistirse. Reformatear los rompe como pista para buscar el tramo en Descript.
17. **Aprendizajes: `POST /api/learnings` guarda `target_protocol_name` pero no `target_protocol_id`.** El circuito de síntesis funciona igual porque agrupa por nombre. La inyección en runtime (`loadProtocol`) y `protocol_history` sí dependen del `target_protocol_id`; si algún día se detecta que el badge de "learnings aprobados" cuenta 0 para todos, revisar si hay un trigger de Supabase que popule el id desde el name — el POST del route no lo hace.
18. **La respuesta de un job de Descript terminado es `job_state: "stopped"` + `result.status: "success"|"error"`**, NO un campo `status: "succeeded"`. El id de la composición creada viene DENTRO de `result.agent_response` como `compositionId="<uuid>"` (no hay campo aparte). Interpretarlo mal deja la cola atascada creyendo que el job sigue corriendo. Toda la interpretación vive en `interpretJob` (`lib/descript.js`) — el webhook y el poll la reusan. (Fue el bug que dejó la cola congelada en el primer test real.)
19. **Al delegar código a un agente con "la migración ya está corrida", el esquema real DEBE tener todas las columnas que el código asume.** El build pasa aunque falten columnas (compilar no toca la DB), pero explota en runtime al primer insert/update. Pasó con `descript_jobs` (le faltaban `descript_project_id`, `prompt`, `meta`, `started_at`, `completed_at`, `descript_response`) y con `episodes.descript_composition_name`. Verificar columnas contra el código antes de asumir que la migración quedó completa (`supabase-migration-descript-fix.sql` documenta el fix).
20. **Las URLs web de Descript usan un id corto de 5 caracteres**, no el UUID completo: `web.descript.com/{project_id}/{primeros 5 chars del composition_id}`. Con el UUID completo el link no aterriza en el clip. Y ojo: **el cron de Vercel solo corre en PRODUCCIÓN, no en preview** — en preview la cola avanza por el heartbeat de la pestaña abierta.
21. **Descript serializa por proyecto: solo un `/jobs/agent` a la vez por proyecto.** Un segundo job sobre el mismo proyecto se rechaza con "already running". Por eso la cola (`descript_jobs`) se procesa de a uno por `project_id`; nunca dispararlos en paralelo sobre el mismo episodio.
22. **Supabase reactiva RLS en tablas nuevas más de lo que uno espera.** Tras correr una migración que crea tablas, verificar `select relname, relrowsecurity from pg_class where relname in ('published_items','metric_snapshots','subscribers','products')` y volver a correr `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` si quedó en true (le pasó a las 3 tablas de v0.7 y a `products` de v0.8). El síntoma es que los inserts/selects no fallan pero devuelven 0 filas silenciosamente.
23. **Un script de Node "pelado" NO carga `.env.local`.** Correr con `node --env-file=.env.local script.mjs` (o exportar las vars antes). Next.js sí lo carga en runtime; un script suelto (ej. `scripts/seed-estrategia.mjs`) no. Sin esto, el script conecta con credenciales `undefined` y falla en la primera query.
24. **El endpoint de Metricool difiere por red y tipo de contenido** — NO es `/posts/{network}` genérico (esa era la referencia no oficial que teníamos). Ver §18. La primera implementación con path genérico devolvía métricas casi vacías para IG/TT/LI porque la mayoría del contenido de IG son **reels** y viven en un endpoint distinto (`/v2/analytics/reels/instagram`). Verificar siempre contra el swagger oficial (`https://app.metricool.com/api/swagger.json`).
25. **Plataformas sin provider deben devolver `[]`, NO caer al mock** — si no, muestran métricas falsas. Le pasó a los newsletters de Substack: el mock del provider genérico les inventaba alcance/engagement. Fix en `lib/metrics/index.js`: si no hay provider registrado para la plataforma, retornar `[]` directamente (el mock solo se usa con `METRICS_PROVIDER=mock` explícito, no como fallback).
26. **El importer matchea la madre por nombre EXACTO** — crear/renombrar los episodios/newsletters ANTES de importar, o las piezas entran huérfanas (`origin_id=null`) y no cuelgan del Universo. El importer normaliza el label pero no hace fuzzy: si el CSV dice "Ep. 001 · Silvia Ramirez" y la tabla `episodes.name` dice "Ep. 001 - Silvia Ramirez" (guion en vez de "·"), no matchea. Workflow: `truncate published_items cascade` para limpiar seed antes de re-importar real.
27. **La card "madre" del Universo solo muestra métricas propias del episodio si existe una `published_item` con `content_type='episodio'`** apuntando a ese episodio con URL de YouTube. Sin esa fila, la madre queda vacía aunque el episodio esté publicado. Fix: agregar una fila `content_type='episodio' + platform='youtube' + published_url` por cada episodio.
28. **Servidores `next dev` huérfanos ocupan puertos** (3000 → 3001 → 3002 → ...). Al terminar una sesión de dev, limpiar con `lsof -ti:3000,3001,3002,3003 | xargs kill -9` para arrancar limpio en 3000. Si no, Next.js elige el siguiente puerto libre y las URLs de referencia dejan de coincidir.

---

## 16. PREGUNTAS ABIERTAS

- ¿Cómo maneja JP la temperatura de las ideas? ¿Manual siempre o el sistema sugiere?
- ¿La socia Daniela va a tener acceso a la app? (JP dice que sí pero por ahora trabajan juntos)
- ¿Cómo entra el feedback de Daniela? (Un campo de "notas y comentarios" en cada idea — hoy entra en el textarea de notas del panel)
- ¿Cada cuántos episodios hacer el "protocol refresh" de consolidar aprendizajes al protocolo base? (Propuesta: 10-15 episodios)
- ¿Los intros deberían generarse en Fase 2 (junto con títulos) en vez de en Repurpose? Conceptualmente son producción del episodio, no repurpose. Actualmente están en Repurpose por simplicidad de UX.
- ~~¿La Parrilla debería integrarse con Buffer/Later/Metricool en una iteración futura?~~ → **Resuelto en Sprint Universo:** la Parrilla se disolvió (§10). Planear/programar se hace en Metricool (fuera de la app); registrar lo publicado + resultados vive en el Universo.
- ¿Newsletter sigue siendo no-generable desde el Fixture o se construye un protocolo de Newsletter para el Engine? (Nota: el Newsletter YA existe como flujo separado con su propio sidebar y sus fases de `ideas` + `repurpose`; la pregunta abierta es si además se puede disparar generación de newsletter desde una idea del Fixture.)
- **Medianos:** ~~¿los medianos desarrollados deberían enviarse a la Parrilla como pieza tipo `episodio` o content_type propio?~~ → Ya tienen `content_type='mediano'` en `published_items` (Sprint Universo). La pregunta muere con la Parrilla.
- **Medianos:** ¿el "protocol refresh" que consolida aprendizajes a base del protocolo debería contemplar dos cadencias distintas (una para protocolos calientes tipo `medianos` y otra para los estables tipo `adn`)?
- ~~¿Reactivar la Parrilla?~~ → Cerrado: se disolvió en Sprint Universo (§10). El código sigue en el repo pero fuera del flujo.

---

## 17. CREDENCIALES Y ACCESOS

- **Vercel:** proyecto naranja-engine, cuenta jpablort123
- **GitHub:** github.com/jpablort123/naranja-engine
- **Supabase:** proyecto cmo-engine, org Naranja Media, URL: vuujvuyxvsbcewbpdgae.supabase.co
- **API Key Anthropic:** clave "naranja-engine" en console.anthropic.com
- **Notion:** workspace de CMO Stories, protocolos bajo "📋 Protocolos"
- **Descript:** API token creado en Descript → Settings → API tokens, atado al Drive de Naranja Media (donde viven los episodios). Guardado en Vercel como `DESCRIPT_API_TOKEN`. La app usa la API REST directamente (server-side); en Cowork/Claude se usó el conector MCP de Descript para las pruebas
- **YouTube Data API:** API key creada en Google Cloud Console (proyecto asociado a la cuenta de Naranja). Sin OAuth (usa solo el endpoint `/videos?part=statistics`). Guardada en Vercel como `YOUTUBE_API_KEY`. Se activa cuando `METRICS_PROVIDER != 'mock'`
- **Metricool:** plan Advanced de la cuenta de Naranja. Token en Account Settings → API. `userId=4844353`, `blogId=6285498` (blog del brand CMO Latam). Endpoints en `https://app.metricool.com/api`; auth con header `X-Mc-Auth: <token>` + query `userId` + `blogId`. Ver §18 para el listado de endpoints por red

### Estado de despliegue y notas operativas
- **Rama principal:** `main` (deploy automático a Production en Vercel). Sprint Universo mergeado a `main` (fast-forward) el 17 Jul 2026
- **Preview deployments:** cada push a una rama arma un preview. El webhook de Descript (`NEXT_PUBLIC_SITE_URL`) solo apunta a Production, así que en preview la cola de Descript avanza por heartbeat / cron manual
- **Sync de métricas en producción es manual** por ahora — se dispara con `curl -X POST https://naranja-engine.vercel.app/api/metrics/sync -H 'content-type: application/json' -d '{}'`. Futuro: tarea programada diaria (`vercel.json` + un endpoint tipo `/api/metrics/cron`)
- **⚠️ Sin autenticación (deuda conocida):** la app no tiene login. Quien tenga el URL entra. Con RLS off en todas las tablas + anon key expuesta al cliente, el acceso es completamente abierto. Aceptable para uso interno (equipo de Naranja); **resolver auth antes de abrir a clientes o vender como SaaS**

---

## 18. ARQUITECTURA DE MÉTRICAS (v0.7-v0.8)

### Ruteo de providers (`lib/metrics/index.js`)
Un solo selector por `platform`. Con `METRICS_PROVIDER=mock` (default de dev) todo va al mock determinista. Con cualquier otro valor:

- `youtube` → `lib/metrics/youtube.js` (real)
- `instagram / linkedin / tiktok` → `lib/metrics/metricool.js` (real)
- `spotify` → `lib/metrics/spotify.js` (stub, sin API oficial)
- **cualquier otra plataforma** (ej. `substack`) → devuelve `[]` (NO cae al mock, ver error 25). El mock solo se activa con `METRICS_PROVIDER=mock` explícito.

Contrato uniforme: `fetchMetrics(item) → Promise<[{metric, value}]>`. Cada provider decide su ventana, cachea si conviene, y traduce a métricas normalizadas (`reach | impressions | views | likes | comments | shares | saves | engagement_rate | watch_time`).

### YouTube (`lib/metrics/youtube.js`)
- YouTube Data API v3 con **API key** (sin OAuth) — `GET https://www.googleapis.com/youtube/v3/videos?part=statistics&id={videoId}&key={KEY}`
- `extractVideoId(url)` soporta `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/shorts/`, `youtube.com/embed/`
- Mapea `viewCount → views`, `likeCount → likes`, `commentCount → comments`; deriva `engagement_rate = (likes + comments) / views × 100` (2 decimales)
- Futuro (fuera de v0.8): sumar YouTube Analytics API (retención, watch_time, tráfico) vía OAuth — requiere `YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN`

### Metricool (`lib/metrics/metricool.js`)
- **Auth**: header `X-Mc-Auth: <METRICOOL_TOKEN>` + query `userId` + `blogId`. El token NO va también como query (con el header basta).
- **Endpoints reales por red** (críticos — verificados contra `https://app.metricool.com/api/swagger.json` y probados con curl):
  - IG **reels** (la mayoría del contenido) → `GET /v2/analytics/reels/instagram`
  - IG posts/carruseles → `GET /v2/analytics/posts/instagram` (URLs `/p/{shortcode}/`)
  - LinkedIn → `GET /v2/analytics/posts/linkedin`
  - TikTok → `GET /v2/analytics/posts/tiktok` (devuelve JSON pese al `"CSV"` del summary del swagger)
- Query params obligatorios: `from`, `to` (ISO 8601 `2026-07-16T23:59:59`)
- **Ruteo por (plataforma + URL + content_type)** dentro del provider:
  - IG: `/reel/` o `/reels/` en el URL → endpoint de reels; `/p/` → endpoint de posts; sin URL clara, se decide por `content_type` (`reel/corto` → reels; `carrusel/carousel/post` → posts); último recurso, prueba ambos
  - LinkedIn / TikTok: endpoint único por red
- **Cache in-memory** por `(endpoint, ventana)` con TTL 5 min: un sync con 40 reels de IG pega a Metricool una sola vez, no 40
- **Matching pieza ↔ post** (prioridad):
  1. URL normalizada exacta (lowercase, sin `www.`, sin trailing slash, sin query, sin fragment)
  2. Última parte del path (shortcode de IG, videoId de TikTok)
  3. `platform_post_id` contra `postId/reelId/videoId/mediaId/activityId`
  4. IDs numéricos largos (≥15 dígitos) en URL vs `postId/url` de Metricool
- **Ventana** default 365 días (`METRICOOL_WINDOW_DAYS`), subir si se re-sincroniza contenido viejo

### Limitación conocida — LinkedIn
LinkedIn asigna IDs distintos (`activity-{X}` en el URL de "compartir" vs `urn:li:share:{Y}` que devuelve Metricool) para la misma publicación. Verificado empíricamente: **los URLs `/posts/{slug}-activity-{ID}-...` NO matchean por diseño**. Workaround: registrar la pieza con el URL `feed/update/urn:li:share:{ID}` cuando aparezca (algunas variantes del botón compartir lo dan). Los shortlinks de Metricool (`mtr.cool/...`) tampoco matchean — siempre URL canónica de la red. Impacto real hoy: ~13 posts de LinkedIn quedan sin métrica de un total de ~99 piezas cross-platform (~87% cobertura).

### Spotify
Sin API oficial de analíticas de creador (confirmado). La profundidad de consumo (horas, TCP, retención, seguidores) NO se puede jalar sola. Provider queda como stub retornando `[]`. Alternativas futuras: llenar a mano por CSV (Spotify for Podcasters exporta), o traer desde el sistema de Rubén (§20).

### Resultado real medido (16-17 Jul 2026)
- Sync completo del proyecto real: **137 piezas** procesadas → **~701 snapshots** insertados. Match rate ~91% (198 MATCH / 20 NO MATCH, casi todos LinkedIn por el gap de arriba).
- YouTube: 34 piezas con views/likes/comments/engagement reales
- Metricool (IG/TT/LI): ~99 piezas con reach/impressions/likes/comments/shares/saves/engagement reales

---

## 19. DATOS REALES CARGADOS (estado del proyecto)

- **Episodios reales** (renombrados desde nombres de prueba, NO se crearon vacíos, para conservar su producción — transcript/mapa/minado): **Ep. 001 · Silvia Ramirez**, **Ep. 002 · Andrés Jaramillo**, **Ep. 003 · Karla Traconis**, **Ep. 004 · Luis Godinez**. Se borraron los duplicados/prueba.
- **5 newsletters** creados (Newsletter #1–#5), con `articulo='(pendiente)'` (NOT NULL). Contenido real pendiente de cargar.
- **137 piezas reales importadas** vía `POST /api/published/import` desde el Excel de reconstrucción de linaje (`CMO-reconstruccion-linaje.xlsx`, pestaña "Piezas publicadas" → CSV). Columnas mapeadas a `published_items`. **136 con madre resuelta, 1 manual.**
- **Métricas reales vivas:** YouTube (34 piezas) + Metricool IG/TikTok/LinkedIn (~99). Ver §18 → resultado medido.

### Gap conocido: card "madre" del Universo sin métricas
La card oscura de "madre" en el Universo solo muestra métricas propias del episodio si existe una `published_item` con `content_type='episodio'` y `platform='youtube'` para ese episodio. Hoy solo el Ep. 001 la tiene. Para que las demás madres muestren sus vistas de YouTube, agregar una fila por episodio con esa combinación + URL del video completo (ver error 27). El sync levanta las métricas automáticamente.

### Workflow de reconstrucción (para futuros / otros productos)
1. Plantilla Excel con columnas: `madre_tipo` (episode|newsletter) · `madre` (nombre EXACTO del episodio/newsletter) · `titulo_pieza` · `tipo_contenido` (reel|mediano|linkedin|carrusel|corto|episodio|newsletter) · `plataforma` · `url_publicada` · `post_id` · `tipo_angulo` · `fuente_creacion` · `fecha_publicacion` · `notas`
2. **Antes de importar real**: `truncate published_items cascade` para limpiar seed, y **crear/renombrar las madres con el nombre EXACTO** que trae el CSV. El importer matchea `origin_label` contra `episodes.name` / `newsletters.name` (ver error 26)
3. Exportar la pestaña a CSV
4. `POST /api/published/import` (multipart file) — devuelve `{ importados, con_madre, sin_madre }`
5. Correr sync: `POST /api/metrics/sync {}` (levanta métricas reales para todas las piezas con URL matcheable)
6. Verificar en Radar / Universo / PiezaPanel

---

## 20. CONTEXTO ESTRATÉGICO — el sistema de métricas de Rubén (referencia)

Naranja tiene tableros internos propios (de Rubén) con métricas de **Spotify + YouTube** a nivel de **show y portafolio** (15+ shows de clientes de la agencia), con un índice compuesto ("Love Score"). Convive con CMO Engine; no lo reemplaza ni lo compite. Evaluación de cómo se relacionan:

### Miden cosas distintas (no son competencia)
- **Rubén** = consumo del **activo central** (el show en sí), a nivel show/portafolio. Es el termómetro del producto.
- **CMO Engine** = dispersión del **universo derivado** (piezas de repurpose), a nivel pieza, un producto. Es el mapa de la propagación.
- **Se tocan solo en "CMO Latam"** — que es *un* show del portafolio de Rubén *y* el producto único de CMO Engine hoy. En ese overlap es donde tiene sentido traer datos de un lado al otro.

### Qué traer a CMO (accionable, no ruido)
- **Palancas de consumo del episodio** para llenar la card "madre" del Universo (§19 gap conocido):
  - YouTube: **CTR, % medio visto, watch time** (jalable via YouTube Analytics API con OAuth — hoy tenemos solo Data API con key)
  - Spotify: **horas, TCP, seguidores** (no hay API oficial → vendría manual o desde el sistema de Rubén)
- **El cruce diferenciador** que solo CMO puede computar: **retención del episodio × desempeño de la pieza derivada, vía el ángulo**. Ejemplo: "los ángulos de 'errores/mitos' del Ep. 001 tuvieron 6.1% engagement en piezas, pero coinciden con la caída de retención del episodio en 12:34 — el ángulo engancha en el corto pero pierde en el largo". Ese hallazgo no vive en Rubén ni en Metricool ni en YouTube — solo emerge cuando unes ambos ejes por `angle_type`.

### Qué NO traer (scope creep)
- **El portafolio de 15 shows** — eso es el tablero de Rubén; CMO Engine es *un* producto. Cuando se active `product_id` como plataforma multi-producto (§12 futuro), la home multi-producto de CMO converge conceptualmente con el portafolio de Rubén — mismo destino, puerta distinta.
- **El "Love Score" como número** — es una caja negra relativa al portafolio (comparativo entre shows). Quedarse con la **filosofía / cuadrante** (consumo × comunidad, algo así), no con el número.
- **Las "Señales" del Termómetro** — bluff. **Los "Aprendizajes del mes" (§4 Sprint Universo)** ya son la versión resuelta de esa idea (claim + evidencia + acción).

### Nota sobre el mockup "más estratégico" que hizo Rubén
Los tableros nuevos que él está diseñando (veredicto → número → acción, show como unidad de análisis) **convergen en la misma filosofía** que CMO Engine v0.8 tomó: el valor no es el data lake, es la distilación en insight accionable. Cuando ambos sistemas empujen contenido a la app-portafolio, este documento va a necesitar una sección conjunta que describa cómo se sincronizan.
