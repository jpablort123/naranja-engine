-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN — Sprint Estrategia (v0.7)
-- Fuente: spec-sprint-estrategia.md §3
-- Correr en el SQL editor de Supabase de una sola pasada. Idempotente.
--
-- Crea 3 tablas + 1 vista y DESHABILITA RLS en las 3 tablas
-- (biblia §15, error #13). NO crear políticas: el proyecto entero trabaja
-- con RLS off y anon key.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 3.1 Piezas publicadas ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS published_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content_type TEXT NOT NULL,      -- 'reel'|'mediano'|'linkedin'|'carrusel'|'corto'|'episodio'|'newsletter'
  platform TEXT NOT NULL,          -- 'youtube'|'instagram'|'linkedin'|'spotify'|'tiktok'
  published_url TEXT,
  platform_post_id TEXT,           -- video id / media id / episode uri
  utm_campaign TEXT,               -- generado por lib/utm.js
  origin_type TEXT,                -- 'episode'|'newsletter'|'idea'|'manual'
  origin_id UUID,                  -- FK lógica a episodes/newsletters/ideas
  origin_label TEXT,               -- ej "Ep. 042 · Sofía Realpe"
  angle_type TEXT,                 -- ej 'errores_mitos'
  creation_source TEXT,            -- 'sistema'|'idea_propia'|'minado_sistema'|'mixto'
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE published_items DISABLE ROW LEVEL SECURITY;

-- Índices útiles para las consultas del Radar y Linaje
CREATE INDEX IF NOT EXISTS idx_published_items_origin
  ON published_items(origin_type, origin_id);
CREATE INDEX IF NOT EXISTS idx_published_items_published_at
  ON published_items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_published_items_platform_content
  ON published_items(platform, content_type);

-- ── 3.2 Métricas como serie temporal ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS metric_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  published_item_id UUID REFERENCES published_items(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  metric TEXT NOT NULL,            -- 'reach'|'impressions'|'views'|'likes'|'comments'|'shares'|'saves'|'watch_time'|'engagement_rate'
  value NUMERIC NOT NULL,
  captured_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE metric_snapshots DISABLE ROW LEVEL SECURITY;

-- Para latest_metrics y sync incrementales
CREATE INDEX IF NOT EXISTS idx_metric_snapshots_item_metric
  ON metric_snapshots(published_item_id, metric, captured_at DESC);

-- ── 3.3 Suscriptores (fuente = CSV de Substack) ─────────────────────────────
-- Nota: cargo/empresa/is_target quedan LATENTES en esta versión (spec §0,
-- §14). Existen para poder encender la capa de "target" en el futuro sin
-- reconstruir. La UI actual NO los muestra, mide ni nombra.
CREATE TABLE IF NOT EXISTS subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  subscribed_at DATE,
  source_platform TEXT,
  attributed_item_id UUID REFERENCES published_items(id) ON DELETE SET NULL,
  cargo TEXT,                      -- MANUAL, latente
  empresa TEXT,                    -- MANUAL, latente
  is_target BOOLEAN,               -- MANUAL, latente (null = sin clasificar)
  status TEXT DEFAULT 'nuevo',     -- 'nuevo'|'clasificado'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE subscribers DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_subscribers_subscribed_at
  ON subscribers(subscribed_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscribers_attributed
  ON subscribers(attributed_item_id);

-- ── 3.4 Vista "última métrica por pieza por tipo" ───────────────────────────
-- Para rollups rápidos (Radar, Linaje). Se refresca sola en cada select.
CREATE OR REPLACE VIEW latest_metrics AS
SELECT DISTINCT ON (published_item_id, metric)
  published_item_id, platform, metric, value, captured_at
FROM metric_snapshots
ORDER BY published_item_id, metric, captured_at DESC;
