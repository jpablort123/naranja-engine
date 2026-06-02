-- Sprint 2 — Newsletter (backend)
-- Correr en el SQL editor de Supabase (proyecto cmo-engine).
-- Idempotente: usa IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificación
  name TEXT NOT NULL,

  -- Input: el artículo final que carga JP (el Engine NO redacta)
  articulo TEXT NOT NULL,

  -- Plomería silenciosa: resumen optimizado para IA. Se guarda, NO se muestra en UI.
  resumen JSONB,

  -- Ideas validables extraídas del artículo: [{ titulo, descripcion, tipo }]
  ideas JSONB,

  -- Índices de las ideas que JP eligió para repurpose (mismo patrón que episodes.selected_ideas)
  selected_ideas JSONB,

  -- Output de la fase repurpose: { reels: [...], carrusel: [...], linkedin: [...] }
  repurpose_content JSONB,

  -- Estado: 'draft' | 'ideas_ready' | 'complete'
  status TEXT DEFAULT 'draft',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Regla #13 de la biblia: deshabilitar RLS en tablas nuevas.
ALTER TABLE newsletters DISABLE ROW LEVEL SECURITY;

-- Índices para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_newsletters_status  ON newsletters(status);
CREATE INDEX IF NOT EXISTS idx_newsletters_created ON newsletters(created_at DESC);
