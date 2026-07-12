-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN — Sprint Universo (v0.8)
-- Fuente: spec-sprint-universo.md §3
-- Correr entera en el SQL editor de Supabase. Idempotente.
-- Depende de la migración del Sprint Estrategia (migrations/sprint-estrategia.sql).
--
-- Objetivo:
--  A) Estados propuesta / publicada / descartada en published_items.
--  B) Costura multi-producto (barata): tabla products + product_id en tablas
--     core, con UUID fijo para "CMO Stories" como default.
--
-- Guardrales:
--  · RLS OFF en tablas nuevas (biblia §15 #13).
--  · product_id NULLABLE con DEFAULT al UUID de CMO — así los inserts viejos
--    del flujo de producción (que no conocen la columna) NO se rompen.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 3.1 Estados en published_items ──────────────────────────────────────────
ALTER TABLE published_items
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'publicada';
  -- 'publicada' | 'propuesta' | 'descartada'

ALTER TABLE published_items
  ADD COLUMN IF NOT EXISTS discard_reason TEXT;
  -- solo relevante cuando status='descartada'; también alimenta un learning

-- Backfill: piezas creadas con v0.7 (sin la columna) deben quedar como 'publicada'
UPDATE published_items SET status = 'publicada' WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_published_items_status ON published_items(status);

-- ── 3.2 Costura multi-producto ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Insert determinístico del producto CMO con UUID fijo.
-- Este mismo UUID vive en lib/product.js como CURRENT_PRODUCT_ID (default).
INSERT INTO products (id, name, slug)
VALUES ('c0000000-0000-4000-8000-000000000001', 'CMO Stories', 'cmo-stories')
ON CONFLICT (id) DO NOTHING;

-- product_id en tablas core (nullable + DEFAULT al UUID de CMO).
-- Nota importante: los inserts existentes del flujo de producción NO tocan
-- esta columna → la default aplica sola. Los inserts nuevos (v0.8+) sí la
-- setean explícitamente vía lib/product.js.
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

-- Índices para las lecturas más frecuentes filtradas por producto.
CREATE INDEX IF NOT EXISTS idx_episodes_product         ON episodes(product_id);
CREATE INDEX IF NOT EXISTS idx_newsletters_product      ON newsletters(product_id);
CREATE INDEX IF NOT EXISTS idx_published_items_product  ON published_items(product_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_product      ON subscribers(product_id);
CREATE INDEX IF NOT EXISTS idx_ideas_product            ON ideas(product_id);
