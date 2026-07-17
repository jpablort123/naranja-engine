-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN — Sprint Publicación (v0.9)
-- Fuente: spec-sprint-publicacion.md §4
-- Correr entera en el SQL editor de Supabase. Idempotente.
-- Depende de las migraciones anteriores:
--   migrations/sprint-estrategia.sql (v0.7)
--   migrations/sprint-universo.sql   (v0.8)
--
-- Objetivo: sólo 3 columnas nuevas en `published_items` + índice. NO hay
-- tablas nuevas. RLS ya está deshabilitado en `published_items` desde v0.7
-- (biblia §15 error #13 / #22).
--
-- Columnas:
--   content_group_id  → agrupa "hermanas" del mismo video en varias redes.
--                       Cuando la PM publica un solo video en IG+TikTok+YT,
--                       las 3 filas nacen con el mismo UUID (spec Módulo E).
--                       Nullable — piezas sueltas sin hermanas lo dejan NULL.
--   libreto           → texto original del contenido (idea_propia). Semilla
--                       para el futuro motor de aprendizaje. Sin procesar
--                       más allá de sugerir el ángulo (spec Módulo C).
--   origin_ref        → identifica el ítem de producción que originó la
--                       propuesta (ej. 'ep:<uuid>/mediano/m3', 'ep:<uuid>/minado/7',
--                       'ep:<uuid>/reel/DZ.../desarrollo'). Sirve para
--                       idempotencia: si la PM manda dos veces el mismo
--                       ítem "a publicaciones", NO se crea una segunda
--                       propuesta (spec Módulo A).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE published_items ADD COLUMN IF NOT EXISTS content_group_id UUID;
ALTER TABLE published_items ADD COLUMN IF NOT EXISTS libreto TEXT;
ALTER TABLE published_items ADD COLUMN IF NOT EXISTS origin_ref TEXT;

-- Índices útiles para las consultas del Universo y de Publicaciones.
CREATE INDEX IF NOT EXISTS idx_published_items_content_group
  ON published_items(content_group_id);

CREATE INDEX IF NOT EXISTS idx_published_items_origin_ref
  ON published_items(origin_ref);
