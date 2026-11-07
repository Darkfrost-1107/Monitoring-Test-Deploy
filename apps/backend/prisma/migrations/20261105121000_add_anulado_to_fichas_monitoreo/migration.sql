-- Permitir estado ANULADO en fichas_monitoreo para trámites excepcionales de anulación total
ALTER TABLE "fichas_monitoreo" DROP CONSTRAINT IF EXISTS "fichas_monitoreo_estado_check";
ALTER TABLE "fichas_monitoreo" ADD CONSTRAINT "fichas_monitoreo_estado_check"
  CHECK ("estado" IN ('BORRADOR', 'FINALIZADO', 'MIGRADA', 'ANULADO'));
