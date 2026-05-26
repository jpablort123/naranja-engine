-- Sprint 4 — Parrilla de Contenidos
-- Correr esto en el SQL editor de Supabase (proyecto cmo-engine).
-- Idempotente: usa IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS parrilla_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contenido
  title TEXT NOT NULL,
  content TEXT,
  content_type TEXT NOT NULL,            -- 'episodio' | 'linkedin' | 'reel' | 'tiktok' | 'newsletter' | 'carrousel'

  -- Origen
  origin_type TEXT,                      -- 'episode' | 'newsletter' | 'fixture' | 'manual'
  origin_id UUID,                        -- FK lógica al episodio / idea / etc.
  origin_label TEXT,                     -- texto visible: "Ep. 52", "NL #14", "Fixture", etc.

  -- Agrupación por idea (varias piezas pueden venir de la misma idea)
  idea_group_id TEXT,
  idea_group_title TEXT,

  -- Programación
  scheduled_date DATE,                   -- NULL = inbox, con fecha = en calendario
  position INTEGER DEFAULT 0,

  -- Estado de producción
  checklist JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'inbox',           -- 'inbox' | 'scheduled' | 'complete' | 'discarded'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_parrilla_status     ON parrilla_items(status);
CREATE INDEX IF NOT EXISTS idx_parrilla_scheduled  ON parrilla_items(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_parrilla_group      ON parrilla_items(idea_group_id);
