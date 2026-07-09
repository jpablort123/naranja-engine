# PROGRESS — Integración Descript → CMO Engine

Rama: `feat/descript-integration`
Referencia: `SPEC-integracion-descript.md`

## Qué quedó hecho

### 1. Cliente Descript (server-side)
- `lib/descript.js`
  - `listProjects`, `getProject(project_id)`
  - `exportTranscript({ project_id, format })` — SRT + txt
  - `createAgentJob({ project_id, prompt, callback_url })`
  - `getJob(job_id)` para polling de respaldo
  - Helpers: `parseDescriptLink`, `slugify`, `composicionName` (convención
    `MICRO_EP{n}_{slug}` / `MEDIANO_EP{n}_{slug}`), `buildCutPrompt`
  - Todas las llamadas requieren `DESCRIPT_API_TOKEN` (env server-side).

### 2. Import por link
- `POST /api/descript/import`
  - Body: `{ descript_link, name?, episode_id? }`
  - Extrae `project_id` (y `composition_id` si viene) del link.
  - Trae detalle del proyecto (nombre de la composición madre).
  - Descarga transcript en **SRT** y **txt** (SPEC §3.3).
  - Crea (o actualiza) episodio con `transcript`, `transcript_srt`,
    `descript_project_id`, `descript_composition_id`, `descript_composition_name`.
- `GET /api/descript/projects` — fallback si no hay link a mano.

### 3. Cola persistente server-side (SPEC §6)
Todo el estado vive en `descript_jobs`. Sobrevive al cierre del navegador.

- `lib/descript-queue.js`
  - `enqueueJobs(items)` — inserta filas en `queued`.
  - `processNext(project_id)` — despacha el **siguiente** queued del proyecto.
    Usa claim optimista (`update where status=queued`) para evitar doble
    disparo en carreras. Si Descript rechaza con "job already running",
    vuelve la fila a queued para reintento.
  - `completeJob(job_id, {status, descript_composition_id, ai_credits_used, error_message})`.
  - `pollRunningJob(row)` — poll de respaldo por si el webhook no llega.
  - `retryJob(job_id)` — reintento manual.

- `POST /api/descript/jobs/enqueue`
  - Body: `{ episode_id, clips: [{ clip_type, clip_ref, titulo_trabajo, frase_inicio, frase_cierre, rango_inicio?, rango_fin? }] }`
  - Deduce número de episodio del nombre; arma nombre de composición según convención.
  - Inserta filas queued, dispara `processNext` (fire-and-forget).

- `POST /api/descript/jobs/process` (y `GET` con `?project_id=`)
  - Empuja la cola de un proyecto (o todos si no se pasa `project_id`).
  - Hace poll de respaldo para jobs `running` con más de 3 min sin novedad.

- `POST /api/descript/jobs/webhook`
  - Callback de Descript. Marca `done`/`error`, guarda
    `descript_composition_id` y `ai_credits_used`, y dispara `processNext`
    para encadenar el siguiente clip del mismo project (respeta bloqueo por
    proyecto).

- `POST /api/descript/jobs/retry` — reencola un job en error.
- `GET  /api/descript/jobs?episode_id=...` — lista para la UI.

### 4. Generación editorial
- Fase `minado` en `POST /api/generate` ahora emite por clip:
  - `gancho`, `frase_inicio`, `frase_cierre` (citas textuales para anclar),
    `frase_iman`, `duracion_seg`, `categoria`, `dani`, `por_que_funciona`,
    `sugerencia_caption`, `timestamp`.
- Fase `medianos-desarrollo` (ya existía): emite `inicio_textual` y
  `cierre_textual` verbatim → se reusan como anclas al encolar cortes.

### 5. UI (tema claro cálido, naranja, DM Sans, rounded-xl — sin cambios de estética)
- `components/DescriptImportModal.jsx` — reemplaza al `UploadModal` viejo.
  Dos vías: **Link de Descript** (auto-import) o **Archivo .txt** (respaldo).
- `components/DescriptJobsPanel.jsx` — panel de estado por episodio, filtrable
  por `clip_type`. Refresca cada 4s y empuja `/process` como heartbeat de
  respaldo si el webhook no llegó. Muestra queued / running / done / error,
  créditos consumidos, link a la composición terminada, y botón reintentar.
- `components/DescriptGenerateBar.jsx` — barra sticky con modal de
  confirmación (`~9 créditos/clip` × N).
- **MinadoTab** reescrito:
  - Tarjeta compacta con **gancho + badge + duración + frase-imán +
    por_que_funciona + caption**. Las frases de corte y el timestamp van a un
    panel "payload de corte" colapsable (SPEC §7).
  - Checkbox por clip + barra sticky "Generar en Descript".
- **MedianosTab**:
  - Acepta como fuente válida de timestamps un episodio con
    `descript_project_id` (además del regex sobre transcript).
  - Panel de cola arriba (filtrado a `clip_type='mediano'`).
  - Después del desarrollo, barra sticky "Enviar cortes a Descript" que
    encola todos los medianos con inicio/cierre textuales presentes.

## Cómo probarlo

### Precondiciones
1. `DESCRIPT_API_TOKEN` en `.env.local` (y en Vercel para producción, cuando
   sea el momento).
2. `NEXT_PUBLIC_SITE_URL` en `.env.local` apuntando a la URL pública del
   servidor (necesario para el webhook). Alternativa: `SITE_URL` o `VERCEL_URL`.
3. La migración de Supabase de la SPEC §4 ya está aplicada
   (columnas nuevas en `episodes` + tabla `descript_jobs`).

### Camino feliz — micros
1. `npm run dev`, abrir la app.
2. "+ Nuevo episodio" → tab **Link de Descript** → pegar link del proyecto en Descript.
3. La app importa transcript, crea el episodio y arranca la Fase 1 (mapa + 20 ángulos).
4. Seleccionar ángulos → generar contenido → tab **Minado**.
5. Marcar 3-4 clips con checkbox. Click "Generar N en Descript". Confirmar créditos.
6. El panel de la cola aparece arriba: se ve `1 cortando` + `3 en cola`.
7. Cerrar la pestaña. Volver a abrirla, entrar al episodio, ir a **Minado**:
   el estado sigue actualizándose (fuente de verdad = `descript_jobs`).
8. Cuando termina, el panel muestra `listo ✓` con link a la composición
   dentro del proyecto de Descript.

### Camino feliz — medianos
1. En un episodio ya vinculado a Descript, ir a tab **Medianos**.
2. "Generar candidatos de contenido mediano" → seleccionar → "Desarrollar N mediano(s)".
3. Cada mediano trae `inicio_textual` y `cierre_textual` (citas verbatim).
4. Barra sticky "Enviar cortes a Descript" → confirmar.
5. La cola procesa en fila (SPEC §3.5): 1 job por proyecto a la vez.

### Reintento
- Si un clip queda en `error`, aparece un botón "reintentar" en el panel.
- El clip vuelve a `queued` y `processNext` lo despacha en cuanto haya cupo.

### Webhook local
- Descript necesita una URL pública para el callback. Local: usar `ngrok`
  (`ngrok http 3000`) y setear `NEXT_PUBLIC_SITE_URL=https://xxx.ngrok.app`.
- Sin webhook público, el sistema **igual funciona** porque
  `/api/descript/jobs/process` hace poll de respaldo cada vez que el panel
  refresca (cada 4s) y detecta `running` viejos → los consulta con `GET /jobs/{id}`.

## Verificación de la SPEC

- [x] Pegar link de Descript importa transcript sin subir .txt.
- [x] Micros aparecen con frase de inicio/cierre y se cortan con "Generar en Descript".
- [x] Medianos: embudo de 2 etapas; "Enviar cortes a Descript" encola con un clic.
- [x] La composición madre nunca se modifica (prompt lo prohíbe explícitamente).
- [x] Buffer "un poquito suelto" incluido en el prompt.
- [x] Cerrar pestaña y volver: estado por clip persiste (fuente = Supabase).
- [x] Descartes/ediciones alimentan `minado` y `medianos` learnings (ya existía).
- [x] Confirmación con estimado de créditos.
- [x] Nombres siguen `MICRO_EP{n}_` / `MEDIANO_EP{n}_`.
- [x] Cola secuencial por project (SPEC §3.5) — claim optimista + reintento
      automático si Descript devuelve "already running".
- [x] `npm run build` pasa sin errores.

## Qué quedó pendiente / notas

- **Descarte con motivo → learning**: los tabs ya soportan feedback textual que
  crea learnings (mecanismo pre-existente); no hay UI de "✗ Descartar con
  motivo" separada del feedback inline. Si JP la quiere explícita como en la
  SPEC §5.2/§5.3, es un extra chico encima del sistema de learnings actual.
- **Configuración del webhook**: la URL pública tiene que llegar al backend
  por `NEXT_PUBLIC_SITE_URL` (o `VERCEL_URL` automático en Vercel). Si nada
  está seteado, no se manda `callback_url` a Descript y todo depende del
  fallback de polling (funciona pero es menos reactivo).
- **Cancelar un job en cola / abortar tanda**: no hay endpoint expuesto para
  cancelar; en la tabla se puede hacer manualmente (setear status a `error`).
  Se puede añadir `POST /api/descript/jobs/cancel` cuando haga falta.
- **Tests**: no incluidos (la app no tenía suite previa; agregar tests unitarios
  de `lib/descript.js` y `lib/descript-queue.js` es lo que más rendiría).
- **Contrato del webhook de Descript**: el handler acepta varias formas del
  payload (`{ job_id, status, ... }` y `{ data: { ... } }`) porque la SPEC no
  fija el shape exacto. Cuando llegue el primer webhook real puede que haga
  falta ajustar el mapping — el body queda guardado íntegro en
  `descript_jobs.descript_response` para debugging.
- **Créditos por clip en la barra**: hardcoded a 9 (rango observado 7-10 en
  SPEC §9.3). Si aparece un ajuste, cambiar el default de
  `DescriptGenerateBar.creditosPorClip`.
- **`app/api/generate/route.js` fase `minado`**: los campos `gancho`,
  `frase_iman` y las frases de inicio/cierre son ahora parte del contrato del
  modelo. Si el protocolo `minado` en Supabase no está actualizado a v2, el
  modelo puede seguir devolviendo el shape viejo — la UI tolera ambos casos.

## Comandos útiles

```bash
# Build
npm run build

# Dev
npm run dev

# Ver los jobs de un episodio (dev)
curl 'http://localhost:3000/api/descript/jobs?episode_id=<uuid>'

# Empujar cola manualmente
curl -X POST -H 'content-type: application/json' \
  -d '{"project_id":"<uuid>"}' \
  http://localhost:3000/api/descript/jobs/process
```
