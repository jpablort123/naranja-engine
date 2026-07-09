# SPEC — Integración Descript → CMO Engine

## (Generación automática de composiciones de micro-contenido y contenido mediano)

### Para: Claude Code · Autor del contexto: JP (Naranja Media) · Versión 1 · Julio 2026

---

## 0. Cómo leer este spec

Este documento asume que ya conoces el CMO Engine descrito en la biblia del proyecto (Next.js 14 App Router en Vercel, Supabase, generación con la API de Anthropic, arquitectura de protocolos de 3 capas, sistema de aprendizajes). Este spec **agrega una función nueva**; no reescribe lo existente. Donde diga "ya existe", no lo toques salvo lo indicado.

**Regla de oro:** todo lo que se validó en las pruebas previas (ver sección 9) es un hecho, no una suposición. Respétalo al pie de la letra, especialmente el bloqueo por proyecto de Descript y la persistencia del lado del servidor.

---

## 1. Qué estamos construyendo y por qué

Hoy, una persona entra manualmente a Descript, busca con Ctrl+F la frase de inicio y de cierre de cada clip, selecciona, clic derecho, y duplica a una composición nueva — para cada micro-contenido y cada mediano. Es 1-2 horas de trabajo por episodio.

El CMO Engine ya genera el **texto** de esos clips (qué cortar y por qué). Lo que falta es cerrar el ciclo: que el Engine **le ordene a Descript crear las composiciones automáticamente** a partir del episodio madre que JP ya carga manualmente en Descript.

**Resultado esperado:** JP revisa lo que el sistema propone, aprueba lo que le gusta, da un clic, y las composiciones aparecen cortadas dentro del proyecto de Descript, listas para que la editora de video las pula.

---

## 2. Principio de arquitectura (no romper)

- **El CMO Engine es el cerebro.** Genera todo el contenido editorial (candidatos, títulos, descripciones, thumbnails, anclas de inicio/cierre) usando la API de Anthropic + los protocolos de Supabase. Esto no cambia.
- **Descript es (a) la fuente del transcript con timestamps y (b) el ejecutor de los cortes.** Descript NO genera contenido editorial. Solo entrega el transcript y ejecuta la instrucción de cortar.
- **El corte lo hace el servidor de Descript, de forma asíncrona.** El navegador de JP solo dispara la orden y luego lee el estado. Ver sección 6 (persistencia).

---

## 3. Integración con la API de Descript

### 3.1 Autenticación y configuración

- API base: `https://descriptapi.com/v1`
- Autenticación: header `Authorization: Bearer <DESCRIPT_API_TOKEN>`
- El token se crea en Descript → Settings → API tokens, y queda **atado a un solo Drive** (el Drive de Naranja Media donde viven los episodios).
- Guardar el token como variable de entorno en Vercel: `DESCRIPT_API_TOKEN`. **Nunca** en el cliente ni en el repo. Todas las llamadas a Descript son server-side (API routes), igual que las de Anthropic.
- Nota: en las pruebas se usó el conector MCP de Descript; en producción el Engine llama la **API REST directamente** con el token. Mismo backend, mismos endpoints.

### 3.2 Endpoints que se usan

| Acción | Endpoint | Uso |
|---|---|---|
| Listar proyectos | `GET /projects` | Ubicar el proyecto por nombre (fallback si no hay link) |
| Detalle de proyecto | `GET /projects/{project_id}` | Confirmar composiciones y duración; verificar que un corte se creó |
| Exportar transcript | `POST /export/transcript` | Traer el transcript del episodio (ver 3.3) |
| Agente (crear corte) | `POST /jobs/agent` | Crear la composición recortada (ver 3.4) |
| Estado de job | `GET /jobs/{job_id}` | Polling del estado de cada corte |
| Webhook | `callback_url` en el body del agente | Descript avisa cuando el job termina (ver 6) |

### 3.3 Exportar transcript

`POST /export/transcript` con body:
```json
{
  "project_id": "<uuid>",
  "format": "srt",
  "include_speaker_labels": "changes",
  "timecodes": { "on_speakers": true, "on_paragraphs": true }
}
```
- Se pide **dos veces** (o una vez SRT y se deriva): (a) `format: "srt"` → segmentos verbatim con timestamps, que se guardan para anclar cortes y timestamps; (b) `format: "txt"` → texto plano para la Fase 1 (mapa + ángulos), que ya existe y espera texto.
- Exportar transcript **no consume créditos de IA** (solo importar consume media minutes y las ediciones del agente consumen créditos).

### 3.4 Crear un corte (agente)

`POST /jobs/agent` con `project_id` + un `prompt` en lenguaje natural. Devuelve `job_id` de inmediato; el corte corre en segundo plano.

**Plantilla de prompt** (probada, funciona; rellenar `{...}`):
```
Create a NEW composition in this project. Do NOT modify or trim the existing
full-episode composition named "{NOMBRE_COMPOSICION_MADRE}" — leave it intact.

Name the new composition: "{NOMBRE_CLIP}"

It should contain ONLY the continuous segment of the main episode video
("{NOMBRE_COMPOSICION_MADRE}") that:
- STARTS where the speaker says: "{FRASE_INICIO_VERBATIM}"
- ENDS where the speaker says: "{FRASE_CIERRE_VERBATIM}"

This corresponds to roughly {mm:ss} to {mm:ss}. IMPORTANT: err on the side of
leaving the clip a little loose — start a second or two BEFORE the start phrase
and end a second or two AFTER the end phrase, so no word gets clipped. A human
editor will tighten it later. Keep video and audio intact, no other edits
(no filler-word removal, no studio sound). Just isolate that one continuous
section into its own new composition.
```
- El buffer "un poquito suelto" es intencional: JP prefiere que sobre a que corte una palabra (la editora limpia después).
- Modelo: usar el default (`auto`). Opcional futuro: probar `claude-haiku` para abaratar créditos.
- Costo observado: ~7-10 créditos de IA por corte. Tiempo: ~35-45 seg por corte.

### 3.5 Restricción crítica: un job por proyecto a la vez

**Descript rechaza un segundo `POST /jobs/agent` sobre el mismo proyecto si ya hay uno corriendo** (error "A job is already running for this project"). Por lo tanto los cortes de un episodio se procesan **en fila, secuencialmente**, no en paralelo. Ver sección 6 para cómo se maneja la cola.

Implicación de tiempo: un episodio de ~25 clips ≈ **15-20 min de procesamiento secuencial**. Esto es aceptable porque corre en segundo plano; la UI debe reflejar una cola, no un resultado instantáneo.

### 3.6 Convención de nombres de composición

- Micros: `MICRO_EP{n}_{slug}` (ej. `MICRO_EP3_ROAS-trampa`)
- Medianos: `MEDIANO_EP{n}_{slug}` (ej. `MEDIANO_EP3_Pandemia-13marcas`)
- El `{n}` y el `{slug}` salen del episodio y del título de trabajo del clip. Alinear con la convención que JP ya usa a mano (`CMO_ReelX_EP3_...`).

---

## 4. Cambios en el modelo de datos (Supabase)

Cambios mínimos, reutilizando lo existente.

### 4.1 Tabla `episodes` — columnas nuevas
- `descript_project_id TEXT` — el UUID del proyecto de Descript (extraído del link).
- `descript_composition_id TEXT` — la composición madre (el episodio completo dentro del proyecto).
- `transcript_srt TEXT` — el transcript en SRT (segmentos verbatim + timestamps) para anclar cortes.
- `medianos JSONB` — candidatos y paquete desarrollado de medianos (análogo a `minado`).
- (Se sigue usando `transcript` para el texto plano y `minado` para los micros, como hoy.)

### 4.2 Tabla nueva `descript_jobs` — la cola persistente
Cada corte que se manda a Descript es una fila. Esto es lo que hace que JP pueda salirse y volver.
```sql
descript_jobs (
  id UUID PK,
  episode_id UUID FK,
  clip_type TEXT,            -- 'micro' | 'mediano'
  clip_ref TEXT,             -- índice/id del clip dentro de episodes.minado o .medianos
  composition_name TEXT,     -- MICRO_EP3_... / MEDIANO_EP3_...
  descript_job_id TEXT,      -- job_id devuelto por Descript
  descript_composition_id TEXT, -- id de la composición creada (cuando termina)
  status TEXT,               -- 'queued' | 'running' | 'done' | 'error'
  error_message TEXT,
  ai_credits_used INTEGER,
  created_at, updated_at
)
```

### 4.3 Protocolos (ya existen en Supabase, no crear)
- `minado` — ya actualizado por JP para emitir **frase de inicio** + **frase de cierre** (anclas de corte).
- `medianos` (slug `medianos`) — ya existe, con Paso 1 (candidatos) y Paso 2 (desarrollo) y reglas duras de anclaje.

---

## 5. Flujo de trabajo end-to-end

### 5.1 Entrada: el link de Descript (ya no se sube transcript a mano)
1. JP pega el **link del episodio madre en Descript** (`https://web.descript.com/{project_id}/{short_id}`) — o lo elige de una lista de proyectos vía `GET /projects`. Se mantiene el upload de `.txt` como respaldo opcional.
2. El Engine extrae `project_id` (y `composition_id` del short id), y llama `POST /export/transcript` (SRT + txt). Guarda `transcript`, `transcript_srt`, `descript_project_id`, `descript_composition_id`.
3. Sigue el flujo que YA existe: Fase 1 genera mapa + 20 ángulos → JP selecciona ángulos → se genera contenido (títulos/descripciones/thumbnails) + minado. **Novedad:** también se generan los **candidatos de medianos** (Etapa 1, automática).

### 5.2 Tab MICROS (minado) — curación de una etapa
- Aparecen los 15-20 micros ya generados (cada uno con frase de inicio + cierre gracias al protocolo actualizado).
- Tarjeta (ver 7): gancho, badge de categoría, [+DANI] si aplica, duración, "por qué funciona", caption, y frase-imán. Las frases de inicio/cierre y el timestamp viven backstage (payload de corte), no dominan la tarjeta.
- JP: **✓ Publicar / ✗ Descartar** por clip. Descartar captura motivo opcional → learning del protocolo `minado`. Edición manual y "Editar con IA" disponibles (feed learnings).
- La voz en off aparece como texto en este tab, **sin** botón de Descript (es guión, no corte).
- Barra sticky: "{X} seleccionados · Generar en Descript" → dispara la cola de cortes (sección 6). Modal de confirmación con estimado de créditos (X clips × ~9).

### 5.3 Tab MEDIANOS — curación de dos etapas
- **Etapa 1 (automática):** al seleccionar ángulos, el Engine ya generó entre 5 y 8 **candidatos ligeros** vía Paso 1 del protocolo `medianos` (título de trabajo, rango aproximado, duración, tipo de ángulo, una línea de por qué). Aparecen en el tab.
- **Etapa 2 (selección):** JP marca favoritos (✓) y descarta (✗ + motivo opcional → learning). En esta etapa también hay **edición manual** y **"Editar con IA" + aprender** sobre cada candidato (título/línea).
- **Etapa 3 (un solo botón):** "Generar seleccionados". Con un clic, en paralelo:
  - (a) **Genera el paquete completo** de cada mediano aprobado vía Paso 2 del protocolo `medianos` (frase de inicio/cierre textual, 5 títulos, descripción YouTube, 3 thumbnails A/B/C) usando Anthropic.
  - (b) **Encola los cortes en Descript** (sección 6) usando las frases de inicio/cierre.
  - El CTA se toma del banco de opciones (elección/rotación) y se muestra como texto de referencia; no genera corte.
- Mientras Descript corta en fila, el paquete de texto se va completando; la UI muestra ambos progresos.

---

## 6. El subsistema de cola de cortes (lo más importante técnicamente)

**Requisito duro: la cola es persistente y del lado del servidor.** JP debe poder navegar a otra parte del sistema, cerrar la pestaña, y volver, sin que se rompa nada. (Hoy, otras generaciones viven en el navegador y se pierden al salir; esto NO puede comportarse así.)

Diseño:
1. Al dar "Generar en Descript" / "Generar seleccionados", el servidor inserta una fila en `descript_jobs` por cada clip con `status = 'queued'`. La respuesta al navegador es inmediata (no espera a que corten).
2. Un **procesador de cola server-side** toma los `queued` de un mismo `episode_id`/`project_id` y los procesa **uno a uno** (recordar: Descript bloquea por proyecto). Por cada uno: `POST /jobs/agent` → guarda `descript_job_id`, marca `running`.
3. **Preferir webhook sobre polling:** pasar `callback_url` en el body del agente. Cuando Descript termina, hace `POST` a esa URL con el estado; el Engine actualiza la fila a `done` (guardando `descript_composition_id` y `ai_credits_used`) o `error`, y dispara el siguiente de la cola. Como respaldo, un polling a `GET /jobs/{job_id}` para jobs colgados.
4. La UI **solo lee `descript_jobs`** para pintar el estado por clip: `esperando → creando → listo ✓ (link a Descript)` o `error ↻ reintentar`. Al volver JP, lee la tabla y ve el estado real.
5. **Reintento:** un clip en `error` se re-encola con un botón, sin afectar los demás.

Nota de implementación: la forma exacta del procesador (cron de Vercel, ruta que se auto-invoca al terminar cada webhook, o cola tipo QStash) queda a criterio del desarrollador, pero DEBE sobrevivir al cierre del navegador y respetar el bloqueo por proyecto.

---

## 7. Diseño de la tarjeta de clip (cambio de UX)

Lo que antes eran **instrucciones para el humano que cortaba** (inicio textual, cierre textual, rango) pasa a ser **payload de corte, oculto**. La tarjeta ahora muestra lo que JP necesita para **decidir si publica**:

**Micro (compacta):** gancho/título · badge de categoría · [+DANI] · duración (~45s) · frase-imán (la línea más citable) · una línea de "por qué funciona". Expandir: caption sugerido, edición manual/IA, timestamp de referencia chiquito.

**Mediano (compacta, Etapa 1):** título de trabajo · badge de tipo de ángulo · duración (~8 min) · una línea de por qué merece ser pieza. Expandir tras desarrollo (Etapa 3): 5 títulos, descripción YouTube, 3 thumbnails A/B/C, CTA elegido.

Ambos: **✓ Publicar / ✗ Descartar** (descarte con motivo opcional → learning), edición manual directa y "Editar con IA + aprender".

Mantener la estética de la biblia: tema claro cálido (#FAFAF9), acento naranja (#EA580C), DM Sans, cards rounded-xl. **Nunca tema oscuro.**

---

## 8. Alcance v1 y fuera de alcance

**En v1:**
- Entrada por link de Descript + export de transcript automático.
- Micros: curación de una etapa + cortes en Descript.
- Medianos: candidatos automáticos → selección (con edición manual/IA + aprender) → un botón que genera paquete + encola cortes.
- Cola persistente server-side con estado por clip y reintento.
- Learnings alimentados por descartes y ediciones (reusa el sistema existente).

**Fuera de v1:**
- Roles/logins separados por revisor (todos hacen todo por ahora).
- Publicar a link web / exportar mp4 vía API (no lo necesitamos; la editora trabaja dentro de Descript).
- Métricas de redes que retroalimenten protocolos (futuro, ya en la biblia).
- Ajuste fino de los límites de corte desde la app (la editora los pule en Descript).

---

## 9. Qué ya se validó (hechos, no supuestos)

Probado en vivo sobre el proyecto real de Andrés Jaramillo:
1. **Leer transcript:** `export/transcript` funciona y da SRT con timestamps.
2. **Crear un corte:** el agente crea la composición recortada dándole solo las frases de inicio/cierre. Original intacto. ~9 créditos, ~40 seg.
3. **Tanda de varios:** 3 cortes seguidos, todos exitosos, con buffer aplicado. Costo consistente (~7-10 c/u).
4. **Bloqueo por proyecto:** confirmado — solo un job a la vez por proyecto → cola secuencial obligatoria.
5. **Persistencia:** el corte ocurre en los servidores de Descript, independiente del navegador → habilita salir y volver si la cola es server-side.
6. **Costo vs plan:** ~225 créditos/episodio; plan Business de JP trae 1.500/mes + 40 horas media; a 2 episodios/mes (quincenal) usa <1/3 de la bolsa. No es un factor.

---

## 10. Criterios de aceptación

- [ ] Pegar un link de Descript importa el transcript y arranca el flujo sin subir .txt.
- [ ] Los micros aparecen con frase de inicio/cierre (protocolo `minado` v2) y se cortan en Descript con "Generar en Descript".
- [ ] Los medianos siguen el embudo de 2 etapas; "Generar seleccionados" produce paquete + encola cortes con un clic.
- [ ] La composición madre NUNCA se modifica; los cortes salen "un poquito sueltos".
- [ ] Cerrar la pestaña a mitad de una cola y volver: el estado por clip sigue correcto (queued/running/done/error).
- [ ] Descartes y ediciones con IA crean learnings para `minado` y `medianos`.
- [ ] Confirmación con estimado de créditos antes de disparar cortes.
- [ ] Nombres de composición siguen la convención `MICRO_EP{n}_` / `MEDIANO_EP{n}_`.
```
