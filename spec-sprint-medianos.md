# CMO Engine — Sprint: Contenido Mediano
## Spec de implementación para Claude Code

> Este spec está escrito para que un desarrollador que nunca habló con el dueño del producto pueda construir la feature sin ambigüedad. Léelo completo antes de escribir código. El proyecto es un sistema de postproducción de podcasts en Next.js 14 (App Router) sobre Supabase, con generación vía la API de Anthropic. Respeta la arquitectura, los nombres de tablas y el diseño visual existentes.

---

## 1. Objetivo

Agregar una nueva capacidad al Engine: **producción de contenido mediano**. Son piezas de 4-12 minutos, cada una centrada en un tema desarrollado dentro del episodio, empaquetadas como mini-episodios (título, descripción de YouTube, thumbnails). Es una categoría **distinta y separada** del minado de micro-contenido (20-90 seg). Debe vivir en su **propio tab** y apoyarse en un **protocolo nuevo** (`medianos`) que ya está cargado en la tabla `protocolos`.

El flujo es de **dos pasos con decisión humana en medio** (igual que el flujo de ángulos): el sistema propone candidatos → el usuario selecciona los que quiere → el sistema desarrolla solo los aprobados.

---

## 2. Restricciones — qué NO hacer

- **NO rompas nada de lo existente.** Los tabs Contenido / Repurpose / Minado, el flujo de ángulos, la revisión de aprendizajes y el visor de protocolos deben seguir funcionando idénticos.
- **NO uses tema oscuro.** Mantén el tema claro cálido del sistema (fondo `#FAFAF9`, acento naranja `#EA580C`, tipografía DM Sans). Sigue el diseño visual de los otros tabs.
- **Esta feature aplica solo a episodios próximos.** No hay migración de episodios viejos. Como la generación corre bajo demanda desde el tab (no es automática al subir el transcript), los episodios viejos simplemente nunca la disparan. Ver la guarda de timestamps en la sección 7.
- **NO conviertas esto en el minado.** Son productos distintos. No reutilices el protocolo `minado` ni sus columnas.
- **NO uses las tablas de Supabase equivocadas.** Usa `episodes`, `protocolos`, `learnings`, `protocol_history` — las documentadas. No inventes tablas nuevas salvo las columnas indicadas abajo.

---

## 3. Base de datos — nuevas columnas en `episodes`

Agrega tres columnas JSONB a la tabla `episodes` (todas nullable, default null):

| Columna | Contenido |
|---|---|
| `medianos_candidatos` | Array de candidatos propuestos por el sistema (paso 1). |
| `medianos_seleccionados` | Array de índices/ids de los candidatos que el usuario aprobó (equivalente a cómo `selected_ideas` guarda la selección de ángulos). |
| `medianos` | Array de piezas desarrolladas (paso 2), con el paquete completo. |

**Shape de un candidato** (`medianos_candidatos[i]`):
```json
{
  "id": "m1",
  "titulo_trabajo": "Turbo y la barrera del aguacate",
  "rango_inicio": "43:00",
  "rango_fin": "48:47",
  "duracion_estimada_min": 6,
  "tipo_angulo": "Barrera emocional / mecanismo invisible",
  "razon": "Por qué la gente no pedía frutas por app y cómo rompieron esa barrera.",
  "angulos_relacionados": [3, 6]
}
```
`angulos_relacionados` es opcional: índices de los ángulos seleccionados por el usuario que este candidato toca (puede ir vacío).

**Shape de una pieza desarrollada** (`medianos[i]`):
```json
{
  "id": "m1",
  "titulo_trabajo": "Turbo y la barrera del aguacate",
  "rango_inicio": "43:00",
  "rango_fin": "48:47",
  "duracion_estimada_min": 6,
  "tipo_angulo": "Barrera emocional / mecanismo invisible",
  "inicio_textual": "¿sabes qué no-- qué nos pasa a veces? Que, eh, a veces se cree que Turbo...",
  "cierre_textual": "Y el mismo usuario nos fue diciendo: \"No, pues es que hay otras cosas...\" Como un cepillo de dientes.",
  "titulos": ["...", "...", "...", "...", "..."],
  "descripcion_youtube": "…",
  "thumbnails": [
    { "opcion": "A", "concepto": "…" },
    { "opcion": "B", "concepto": "…" },
    { "opcion": "C", "concepto": "…" }
  ]
}
```

---

## 4. API — dos fases nuevas de generación

Extiende la lógica de generación (misma mecánica que las fases existentes `angles`, `contenido`, `minado`, `repurpose` en `app/api/generate/route.js`, o crea rutas hermanas si es más limpio). Ambas fases construyen el system prompt como **`adn` + `medianos`** (Capa 0 + Capa 1), cargando ambos protocolos desde la tabla `protocolos`, e **inyectando en la sección `[APRENDIZAJES]` del protocolo `medianos` los learnings aprobados** para ese protocolo en runtime (exactamente como ya se hace con los otros protocolos de fase).

### Fase A — `medianos-candidatos`
- **Dispara:** bajo demanda, cuando el usuario entra al tab Medianos y pide generar candidatos.
- **System prompt:** `adn` + `medianos` (+ aprendizajes aprobados de `medianos`).
- **Input al modelo:** la transcripción **con timestamps** + el `mapa` del episodio + los ángulos seleccionados por el usuario (`episodes.selected_ideas` / `episodes.ideas`) como **prioridad blanda** ("prioriza tramos que toquen estos ángulos, pero no te limites a ellos").
- **Output:** array de candidatos con el shape de la sección 3. Guardar en `episodes.medianos_candidatos`.

### Fase B — `medianos-desarrollo`
- **Dispara:** bajo demanda, cuando el usuario ya seleccionó candidatos y pide desarrollarlos.
- **System prompt:** `adn` + `medianos` (+ aprendizajes aprobados de `medianos`).
- **Input al modelo:** la transcripción **con timestamps** + el `mapa` + los candidatos seleccionados (`medianos_seleccionados`).
- **Output:** array de piezas desarrolladas con el shape completo de la sección 3. Guardar en `episodes.medianos`.

**Regla de calidad a reforzar en el prompt de ambas fases** (el protocolo ya la trae, pero el código no debe romperla): el `rango_inicio` debe ser temporalmente anterior al `rango_fin`; la `duracion_estimada_min` debe corresponder al rango; `inicio_textual` y `cierre_textual` deben ser citas textuales de la transcripción. No hace falta validación dura en código, pero no reformatees ni "limpies" estos campos: guárdalos tal cual vienen del modelo.

---

## 5. UI — cuarto tab "Medianos"

Agrega un cuarto tab en el workspace del episodio, junto a los existentes: **Contenido / Repurpose / Minado / Medianos**. Dentro del tab, implementa el flujo de dos pasos:

**Estado vacío:** botón "Generar candidatos de contenido mediano". Al presionarlo, corre la Fase A y muestra los candidatos.

**Paso 1 — Candidatos:** lista de candidatos, cada uno mostrando título de trabajo, rango `[mm:ss – mm:ss]`, duración, badge del tipo de ángulo, y la línea de razón. Cada candidato tiene un **checkbox** (igual que la selección de ángulos). Si un candidato toca ángulos seleccionados, muéstralo con una nota discreta ("toca los ángulos que elegiste"). Barra inferior con contador y botón **"Desarrollar N medianos"** (habilitado cuando hay al menos uno marcado). Guardar la selección en `medianos_seleccionados`.

**Paso 2 — Piezas desarrolladas:** al desarrollar, corre la Fase B y muestra cada pieza como una card (estética consistente con los otros tabs) con: título de trabajo, rango + duración, tipo de ángulo, inicio textual, cierre textual, los 5 títulos, la descripción de YouTube, y los 3 conceptos de thumbnail. Cada pieza (y cada campo editable de texto) debe permitir:
- **Edición manual directa** (click para editar cualquier texto), igual que en el resto del sistema.
- **"Editar con IA"** en los campos donde ya existe en otras secciones (títulos, descripción), con su **feedback que aprende** (ver sección 6).
- **Botón de copiar** por pieza.

El usuario debe poder volver a generar candidatos o desarrollar más adelante; no es un flujo de un solo tiro.

---

## 6. Aprendizaje — el circuito completo (CRÍTICO)

Esta es la parte que más fácil se deja a medias, y es un requisito no negociable: **el protocolo `medianos` debe participar del circuito de aprendizaje exactamente igual que los otros siete protocolos.** No basta con que aparezca en el visor de protocolos; hay que conectar el cableado de aprendizaje.

Requisitos verificables:

1. El protocolo `medianos` (slug **`medianos`**) ya existe como fila en la tabla `protocolos`. **Debe aparecer en el tab de Protocolos** (visor), con su contenido, sus badges de learnings y su historial — sin ningún trabajo extra si el visor ya lista todos los protocolos de la tabla. Confírmalo.
2. Cuando el usuario da feedback en una pieza mediana (vía "Editar con IA y aprender" o "Aplicar cambios y aprender"), se debe crear un `learning` con `target_protocol_name = 'medianos'` (y su `target_protocol_id` correspondiente), `section = 'medianos'`, status `draft` — igual que hoy se crean para títulos, minado, etc.
3. **Registra `medianos` en la lista de protocolos "aprendibles"** que usa el flujo de learnings. Si en algún punto del código (por ejemplo en `learnings/synthesize` o donde se agrupan drafts por protocolo) existe una lista o mapeo de slugs válidos, agrega `medianos`. Si el flujo ya es genérico y toma cualquier `target_protocol_name`, verifica que `medianos` pase sin problema.
4. La vista de revisión de aprendizajes debe **sintetizar** los drafts de `medianos` agrupados bajo ese protocolo, con su badge de confianza y su cambio propuesto, como con los demás.
5. Al aprobar, el batch (`learnings/batch`) debe actualizar el status y **guardar snapshot en `protocol_history`** para `medianos`, igual que para el resto.
6. En la próxima generación de medianos, los aprendizajes aprobados de `medianos` se **inyectan en runtime** en la sección `[APRENDIZAJES]` de ese protocolo (ver sección 4).

**Prueba de aceptación de este circuito (la que hará el dueño):** dar feedback a una pieza mediana con "editar con IA y aprender" → ir al tab Aprendizajes → confirmar que aparece un aprendizaje pendiente **asignado a `medianos`**. Si aparece, el circuito quedó conectado. Si no aparece, quedó a medias.

---

## 7. Guarda para transcripciones sin timestamps

El contenido mediano **requiere** transcripción con timestamps (Descript). De ahora en adelante todos los episodios nuevos los tendrán, pero los viejos no.

- Antes de permitir generar candidatos, **detecta si el transcript del episodio contiene timestamps** (por ejemplo, buscando el patrón `[mm:ss]` o `[hh:mm:ss]` en `episodes.transcript`).
- Si **no** tiene timestamps: el tab Medianos muestra un mensaje claro y **deshabilita** la generación — algo como: *"El contenido mediano necesita una transcripción con marcas de tiempo (Descript). Este episodio no las tiene."* No intentes generar y fallar.
- Si **sí** tiene timestamps: flujo normal.

---

## 8. Diseño visual (obligatorio mantener)

- Fondo principal `#FAFAF9`; sidebar `#18181B`; acento `#EA580C`; acento light `#FFF7ED`; borde acento `#FED7AA`; success `#16A34A`; muted `#78716A`; cards `#FFFFFF`; bordes `#E7E5E4`; texto stone-700/800/900.
- Tipografía DM Sans. Nada de fonts display.
- Cards `rounded-xl`, espacios generosos, transiciones suaves, sensación editorial y cálida.
- **Nunca tema oscuro.**
- El tab Medianos y sus cards deben verse como parte natural del sistema, no como un módulo pegado.

---

## 9. Errores a no repetir (de la biblia del proyecto)

- Usa las tablas documentadas (`episodes`, `protocolos`, `learnings`, `protocol_history`), nunca variantes.
- No introduzcas redundancia de protocolos: las reglas globales viven en `adn`; `medianos` solo tiene lo suyo.
- Mantén el alias `@/` funcionando (requiere `jsconfig.json`).
- Generación progresiva y sin pasos manuales innecesarios, salvo el paso de selección humana que aquí es intencional (candidatos → seleccionar → desarrollar).

---

## 10. Criterios de aceptación (checklist final)

- [ ] Existen las columnas `medianos_candidatos`, `medianos_seleccionados`, `medianos` en `episodes`.
- [ ] Hay un cuarto tab "Medianos" en el workspace, con tema claro cálido consistente.
- [ ] La Fase A genera candidatos usando `adn` + `medianos` + transcript con timestamps + mapa + ángulos seleccionados como prioridad blanda.
- [ ] El usuario puede seleccionar candidatos con checkboxes y desarrollarlos.
- [ ] La Fase B desarrolla las piezas aprobadas con el paquete completo (rango, duración, tipo, inicio textual, cierre textual, 5 títulos, descripción YouTube, 3 thumbnails).
- [ ] Los campos `inicio_textual` y `cierre_textual` se guardan tal cual (sin reformatear).
- [ ] Cada pieza permite edición manual, "editar con IA" y copiar.
- [ ] El protocolo `medianos` aparece en el visor de Protocolos.
- [ ] Dar feedback a una pieza mediana crea un learning con `target_protocol_name = 'medianos'`, visible en el tab de Aprendizajes.
- [ ] La síntesis, aprobación (con `protocol_history`) e inyección en runtime funcionan para `medianos` igual que para los demás protocolos.
- [ ] Un episodio sin timestamps muestra el mensaje de guarda y no intenta generar.
- [ ] Nada de lo existente (ángulos, contenido, repurpose, minado, aprendizajes, visor) se rompió.
