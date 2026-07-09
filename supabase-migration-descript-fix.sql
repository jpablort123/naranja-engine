-- ═══════════════════════════════════════════════════════════════════
-- MIGRACIÓN CORRECTIVA — columnas que el código de la integración Descript
-- asume pero que faltaron en la migración inicial.
-- Segura e idempotente (if not exists). Correr en el editor SQL de Supabase.
-- ═══════════════════════════════════════════════════════════════════

-- Faltante en episodes (la usa el import y el enqueue para el prompt de corte)
alter table episodes add column if not exists descript_composition_name text;

-- Faltantes en descript_jobs (las usa la cola: lib/descript-queue.js y rutas)
alter table descript_jobs add column if not exists descript_project_id text;
alter table descript_jobs add column if not exists prompt text;
alter table descript_jobs add column if not exists meta jsonb;
alter table descript_jobs add column if not exists started_at timestamptz;
alter table descript_jobs add column if not exists completed_at timestamptz;
alter table descript_jobs add column if not exists descript_response jsonb;

-- Índice para buscar la cola por proyecto (la consulta más frecuente)
create index if not exists idx_descript_jobs_project on descript_jobs(descript_project_id);
