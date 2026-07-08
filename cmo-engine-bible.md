# CMO ENGINE — Biblia del Proyecto
## (Archivo de contexto para cualquier sesión futura de desarrollo)
### Última actualización: 7 Julio 2026

---

## 1. QUÉ ES CMO ENGINE

Sistema de postproducción de podcasts construido para JP (Juan Pablo) de Naranja Media. Toma transcripciones de episodios de CMO Stories y genera todo el contenido de postproducción: títulos, descripciones, intros leídos, contenido para redes sociales, y minado de micro-contenido.

**El diferenciador principal** es un sistema de protocolos que aprende: el usuario da feedback sobre el contenido generado, los aprendizajes se acumulan silenciosamente durante la sesión, y al final el usuario revisa y aprueba cuáles son aprendizajes reales vs circunstanciales. Los aprobados se inyectan en los protocolos como capa adicional. Con cada episodio, el output mejora.

**Primero se construye para JP.** Si después de semanas es increíble, se evalúa vender como SaaS a otros podcasters y creadores de YouTube.

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

---

## 3. TABLAS DE SUPABASE (ya creadas)

```sql
episodes (id UUID PK, name TEXT, transcript TEXT, mapa JSONB, titulos JSONB, descripcion_spotify TEXT, descripcion_youtube TEXT, thumbnails JSONB, ideas JSONB, selected_ideas JSONB, repurpose_content JSONB, minado JSONB, medianos_candidatos JSONB, medianos_seleccionados JSONB, medianos JSONB, status TEXT, created_at, updated_at)

newsletters (id UUID PK, name TEXT, articulo TEXT, resumen JSONB, ideas JSONB, selected_ideas JSONB, repurpose_content JSONB, status TEXT, created_at, updated_at)

protocolos (id UUID PK, name TEXT, slug TEXT UNIQUE, content TEXT, version INTEGER, created_at, updated_at)

learnings (id UUID PK, episode_id UUID FK, newsletter_id UUID FK, section TEXT, original_content TEXT, feedback TEXT, proposed_change TEXT, target_protocol_id UUID FK, target_protocol_name TEXT, status TEXT default 'draft', created_at)

protocol_history (id UUID PK, protocol_id UUID FK, previous_content TEXT, new_content TEXT, learning_ids JSONB, summary TEXT, created_at)

ideas (id UUID PK, title TEXT, description TEXT, notes TEXT, category TEXT default 'undecided', temperature TEXT default 'cold', formats JSONB, angle TEXT, origin_url TEXT, origin_type TEXT, origin_id TEXT, status TEXT, generated_content JSONB, prompt_notes TEXT, parent_id UUID FK self, position INTEGER, created_at, updated_at)

parrilla_items (id UUID PK, title TEXT, content TEXT, content_type TEXT, origin_type TEXT, origin_id UUID, origin_label TEXT, idea_group_id TEXT, idea_group_title TEXT, scheduled_date DATE, position INTEGER, checklist JSONB, status TEXT default 'inbox', created_at, updated_at)
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

> Los schemas exactos (defaults, constraints) están en Supabase — esta lista refleja las columnas que efectivamente se leen/escriben desde el código. Si aparecen columnas nuevas en la tabla que no están acá, revisar contra `app/api/episodes/route.js`, `app/api/newsletters/route.js` y los generadores en `app/api/generate/` y `app/api/newsletters/generate/`.

---

## 4. LO QUE EXISTE HOY EN PRODUCCIÓN (v0.6)

La app está desplegada en Vercel con el flujo completo de ángulos + revisión de aprendizajes + visor de protocolos + banco de ideas (Fixture Kanban) + Newsletter (repurpose desde artículo) + Contenido Mediano (mini-episodios).

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

### Mejoras puntuales (17 Junio 2026)
- **Modelo de Anthropic actualizado a `claude-sonnet-4-6`** (antes `claude-sonnet-4-20250514`, que dejó de ser válido y rompía `/api/generate` en producción). Cambiado en `lib/generation.js` y `app/api/learnings/synthesize/route.js`.
- **Eliminar episodios y newsletters desde el sidebar:** botón basurita sutil en cada item, visible solo al hacer hover, con `confirm()` antes de borrar. Endpoints `DELETE /api/episodes?id=...` y `DELETE /api/newsletters?id=...` con limpieza en cascada previa: primero `learnings` (FK real probable), después `parrilla_items` e `ideas` filtrando por `origin_type` + `origin_id` (FK lógicas — limpieza para evitar huérfanos), y al final el recurso principal. Si el item borrado estaba seleccionado, `idx`/`nlIdx` se resetean y la vista cae al listado padre (`podcast` / `newsletter`).
- **Upload de newsletters en `.docx` además de `.txt`/`.md`:** nuevo endpoint `POST /api/newsletters/extract` (runtime Node) que parsea el Word con `mammoth` y devuelve `{ text }` plano. El modal acepta `.docx`, muestra un loader naranja mientras extrae y muestra el error si el parseo falla. El texto extraído llega al mismo campo `articulo` que antes — el resto del pipeline (`POST /api/newsletters` → `/api/newsletters/generate`) no se tocó.

### Lo que NO funciona todavía
- No hay chat embebido con contexto → Sprint 4
- No hay métricas reales de redes alimentando protocolos → Futuro
- **Parrilla oculta en UI:** el código completo del Sprint 3A (inbox + 3 vistas de calendario + drag-and-drop + checklists) sigue en el repo (`components/ParrillaView.jsx`, `app/api/parrilla/*`), pero un feature flag `SHOW_PARRILLA = false` en `app/page.js` y `components/ui.jsx` esconde el ítem del sidebar y el botón "Enviar a Parrilla" en las secciones que lo tenían. La vista sigue navegable si se fuerza `activeView='parrilla'`. Para reactivar: flipear el flag en ambos archivos.

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

### Estructura de archivos (v0.6)

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
    └── parrilla/                        → Endpoints activos aunque la vista esté oculta por feature flag
        ├── route.js                     → GET: items por status y rango de fechas. POST: crear item individual
        ├── [id]/route.js                → PATCH: actualizar item
        └── batch/route.js               → POST: enviar múltiples piezas de una vez
components/
├── FixtureBoard.jsx                     → Kanban del banco de ideas (3 columnas, 3 temperaturas, panel lateral, parrilla, pegar versión)
├── InicioView.jsx                       → Dashboard "Inicio" con cards de episodios, newsletters, ideas del Fixture y próximos programados
├── LearningsReview.jsx                  → Vista de revisión de aprendizajes (síntesis + decisiones)
├── NewsletterUploadModal.jsx            → Modal de subida de newsletter (acepta .txt, .md, .docx; extrae Word server-side)
├── NewsletterView.jsx                   → Workspace del newsletter (fase ideas + fase repurpose con reels, carrusel, linkedin)
├── ParrillaView.jsx                     → Vista de Parrilla completa. Oculta por SHOW_PARRILLA=false pero código conservado
├── ProtocolosViewer.jsx                 → Visor de protocolos (split view + edición + historial + aprendizajes inyectados en verde)
└── ui.jsx                               → Utilidades compartidas: EditableText, ApplyBar, EditModal, AIEditBtn, CopyBtn, BankBtn, Skel, Badge, SendToParrillaBtn/Modal, etc.
lib/
├── generation.js                        → loadProtocol (base + [APRENDIZAJES] aprobados), buildSystem (concat de protocolos), callClaude
└── supabase.js                          → Cliente de Supabase (anon key)
```

En la raíz del repo:
- `cmo-engine-bible.md` — este documento
- `spec-sprint-medianos.md` — spec de implementación del Sprint Medianos (referencia histórica)
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

## 10. PARRILLA — implementada en Sprint 3A, hoy OCULTA por feature flag

**Estado actual:** el código completo del Sprint 3A vive en el repo (inbox + 3 vistas de calendario, checklist por tipo, ghost slots, drag-and-drop), pero el feature flag `SHOW_PARRILLA = false` (en `app/page.js` y `components/ui.jsx`) esconde el ítem del sidebar y el botón "Enviar a Parrilla" en las secciones que lo tenían (Repurpose, Minado, Fixture, Newsletter). Los endpoints `/api/parrilla/*` siguen activos.

**Por qué está oculta:** decisión de producto puntual — la vista completa vive en el repo esperando reactivación cuando JP retome ese flujo. Para reactivarla: flipear el flag a `true` en los dos archivos.

Ver sección 4 → "Sprint 3A" para el detalle de lo construido. El flujo end-to-end está en sección 6 → "Flujo de Parrilla". El schema vive en sección 3 → tabla `parrilla_items`.

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

### Sprint 4 — Chat embebido + pulido (PENDIENTE)
- Panel lateral con contexto automático (episodio / idea / protocolo / slot de parrilla)
- Botones de acción ("Crear idea en fixture", "Actualizar protocolo", "Aplicar cambio", "Programar en parrilla")
- Pulido general

### Futuro
- Métricas reales de redes → alimentan protocolos automáticamente
- MCP para conectar Claude.ai con el sistema
- Integración con Descript para minado automático
- Bandeja de entrada / Google News interno
- Espacio de feedback agregado (comentarios, DMs, socia)
- Landing page y pricing para venta

---

## 13. PROTOCOLOS EN SUPABASE — ESTADO ACTUAL

Los **9 protocolos** están cargados en la tabla `protocolos` de Supabase. Los 7 originales se insertaron el 17 Mayo 2026; `carrusel` se agregó durante el sprint del Newsletter; `medianos` se agregó el 7 Julio 2026 durante el sprint homónimo. Los chars y versiones de abajo se confirmaron contra el endpoint `/api/protocolos` en producción; `reels` está en v2 porque se editó desde el visor.

| Slug | Nombre | Versión | Chars | Descripción |
|------|--------|---------|-------|-------------|
| `adn` | ADN — Identidad y reglas globales | 1 | 3,472 | Identidad, audiencia, tono, idioma, checklist anti-IA. Se inyecta en TODA llamada. |
| `mapa-angulos` | Mapa del Episodio + Ángulos | 1 | 4,545 | Cómo extraer mapa estructurado + 20 ángulos con 10 patrones y marcos de evaluación. También lo usa el newsletter para armar el mapa "plomería silenciosa" del artículo. |
| `titulos` | Títulos y Descripciones | 1 | 3,372 | 10 títulos (formato fijo, máx 60 chars), descripciones Spotify/YouTube, keywords, pilares. |
| `intros` | Intros Leídos | 1 | 4,424 | 10 intros con 4 fórmulas narrativas, reglas de construcción, preferencias de Daniela. |
| `minado` | Minado — Micro-contenido para Redes | 1 | 5,754 | 15-20 clips autónomos, 6 categorías, clips con Daniela [+DANI], voz en off. |
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

---

## 16. PREGUNTAS ABIERTAS

- ¿Cómo maneja JP la temperatura de las ideas? ¿Manual siempre o el sistema sugiere?
- ¿La socia Daniela va a tener acceso a la app? (JP dice que sí pero por ahora trabajan juntos)
- ¿Cómo entra el feedback de Daniela? (Un campo de "notas y comentarios" en cada idea — hoy entra en el textarea de notas del panel)
- ¿Cada cuántos episodios hacer el "protocol refresh" de consolidar aprendizajes al protocolo base? (Propuesta: 10-15 episodios)
- ¿Los intros deberían generarse en Fase 2 (junto con títulos) en vez de en Repurpose? Conceptualmente son producción del episodio, no repurpose. Actualmente están en Repurpose por simplicidad de UX.
- ¿La Parrilla debería integrarse con Buffer/Later/Metricool en una iteración futura, o se queda en flujo manual (JP copia el contenido y publica en cada plataforma)?
- ¿Newsletter sigue siendo no-generable desde el Fixture o se construye un protocolo de Newsletter para el Engine? (Nota: el Newsletter YA existe como flujo separado con su propio sidebar y sus fases de `ideas` + `repurpose`; la pregunta abierta es si además se puede disparar generación de newsletter desde una idea del Fixture.)
- **Medianos:** ¿los medianos desarrollados deberían poder enviarse a la Parrilla (cuando se reactive) como pieza tipo `episodio` o merecen su propio `content_type`?
- **Medianos:** ¿el "protocol refresh" que consolida aprendizajes a base del protocolo debería contemplar dos cadencias distintas (una para protocolos calientes tipo `medianos` y otra para los estables tipo `adn`)?
- ¿Es momento de reactivar la Parrilla (flipear `SHOW_PARRILLA`) ahora que Newsletter y Medianos alimentan el pipeline, o esperar a Sprint 4?

---

## 17. CREDENCIALES Y ACCESOS

- **Vercel:** proyecto naranja-engine, cuenta jpablort123
- **GitHub:** github.com/jpablort123/naranja-engine
- **Supabase:** proyecto cmo-engine, org Naranja Media, URL: vuujvuyxvsbcewbpdgae.supabase.co
- **API Key Anthropic:** clave "naranja-engine" en console.anthropic.com
- **Notion:** workspace de CMO Stories, protocolos bajo "📋 Protocolos"
