-- Sprint 2 — Protocolo Carrusel (capa de fase)
-- Correr DESPUÉS de newsletters.sql, en el SQL editor de Supabase.
-- Idempotente: si ya existe la fila con slug='carrusel', no la pisa.
--
-- Nota sobre el formato: la sección [APRENDIZAJES] final está normalizada
-- (sin línea en blanco, prefijada con "Sección vacía.") para que matchee el
-- regex de inyección en lib/generation.js → loadProtocol():
--   /\[APRENDIZAJES\]\n_Sección vacía.*?_/

INSERT INTO protocolos (slug, name, content, version)
VALUES (
  'carrusel',
  'Carrusel de Instagram — Repurpose',
  $protocolo$# Carrusel de Instagram — Repurpose

**slug:** `carrusel` · **versión:** 1 · **capa:** protocolo de fase

> Identidad del show, audiencia, tono, reglas de idioma/dialecto, "números como arma" y checklist anti-IA viven en el **ADN** y se inyectan en toda llamada. Este protocolo solo carga lo específico del carrusel. No repetir lo del ADN.

---

## Propósito

Tomar las **ideas ya validadas** (del newsletter o de un episodio) y convertir cada una en un carrusel de Instagram listo para diseñar: texto slide por slide, con gancho, desarrollo y cierre. El Engine entrega el **copy y la estructura**; el armado visual se hace aparte (Canva, etc.).

Output por defecto: **1 carrusel por idea seleccionada**, de 8 a 10 slides. Si una idea da para dos enfoques claramente distintos, proponer 2 opciones.

---

## Por qué el formato es así (principios)

- El carrusel es una **mini landing page en el feed**: cada slide gana un micro-compromiso (un swipe más). El objetivo de diseño es maximizar *completion* (que lleguen a la última), *saves* y *sends* (compartidos por DM) — esas son las señales que más premia el algoritmo.
- **Segunda oportunidad:** si no hay interacción, Instagram re-muestra el carrusel empezando por la slide 2. Por eso la slide 1 y la slide 2 tienen que enganchar por separado.
- **Una sola idea por slide.** Nada de párrafos densos. El que diseña necesita texto escaneable.
- El contenido **educativo y de referencia** (datos, frameworks, errores comunes, listas) es el que más se guarda. Si la idea lo permite, llevarla hacia ahí.

---

## Arquitectura del carrusel

**Slide 1 — Portada / gancho.** La más importante: es la única que aparece en el feed y decide si hay swipe o no. Una frase corta y contundente que detenga el scroll. Opcional: una señal sutil de "desliza →".

**Slide 2 — Confirmar la promesa.** Abre el loop, valida que vale la pena seguir. Engancha por sí sola (por el re-serve del algoritmo).

**Slides 3 a 8 — Desarrollo.** Una idea por slide, construyendo el argumento como **una sola historia continua**. Cada slide deja ganas de la siguiente.

**Slide final — Cierre + CTA.** Un solo llamado a la acción, claro. Preferir los que disparan guardado/compartido o comentario. Cuando aplique, conectar de vuelta al ecosistema ("esto salió de nuestra última newsletter").

---

## Patrones de gancho para la slide 1

Elegir el que mejor le calce a la idea (no forzar):

1. **Dato contundente** — una cifra que sorprende o incomoda.
2. **Contraintuitivo** — afirmar lo contrario de lo que todos asumen.
3. **Dolor directo** — una pregunta o frase que toca un problema real de la audiencia.
4. **Promesa de lista** — "N cosas que…", "N errores que…".
5. **Error señalado** — "Estás haciendo X mal (y cómo arreglarlo)".

---

## Construcción de las slides de desarrollo

- Un titular fuerte por slide + apoyo breve. Jerarquía clara.
- Continuidad narrativa: el carrusel se lee como un solo argumento, no como bullets sueltos.
- Si la idea trae datos, una cifra por slide pega fuerte.
- Evitar el relleno: si una slide no aporta, se elimina. Mejor 8 slides afiladas que 10 con paja.

---

## Slide de cierre / CTA

- **Un solo CTA.** No apilar varios.
- Preferir CTAs que generen alcance: invitar a guardar, a compartir con alguien, o a comentar una palabra.
- Si la idea viene del newsletter, cerrar el círculo apuntando a suscribirse o a leer la edición completa.

---

## Notas de producción (para quien diseña, no para el copy)

- **8 a 10 slides** es el punto óptimo.
- Formato **vertical 4:5 (1080x1350)**. El formato de la slide 1 manda para todas; no se mezclan proporciones.
- El Engine entrega texto slide por slide; el diseño visual y el armado son un paso posterior.

---

## Formato de salida

Por cada idea, devolver un bloque así:

- **Título del carrusel** (referencia interna, no va en la pieza)
- **Slide 1 (portada):** [texto del gancho]
- **Slide 2:** [texto]
- **Slide 3 … N:** [texto, una idea cada una]
- **Slide final (CTA):** [texto del cierre]

Marcar siempre cuál es portada y cuál es CTA.

---

## [APRENDIZAJES]
_Sección vacía. Aquí el Engine concatena en runtime los aprendizajes aprobados para este protocolo._
$protocolo$,
  1
)
ON CONFLICT (slug) DO NOTHING;
