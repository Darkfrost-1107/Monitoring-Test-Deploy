-- Drop the single-ficha-per-visit unique index if it exists
DROP INDEX IF EXISTS "fichas_monitoreo_cronograma_id_key";

-- Ensure composite unique index on (cronograma_id, plantilla_id) exists
CREATE UNIQUE INDEX IF NOT EXISTS "uq_ficha_visita_plantilla" ON "fichas_monitoreo"("cronograma_id", "plantilla_id");

-- Ensure normal index on cronograma_id exists for fast lookups
CREATE INDEX IF NOT EXISTS "fichas_monitoreo_cronograma_id_idx" ON "fichas_monitoreo"("cronograma_id");
