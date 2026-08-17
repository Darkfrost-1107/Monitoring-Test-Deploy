-- AlterTable
ALTER TABLE "cronogramas" DROP CONSTRAINT IF EXISTS "cronogramas_tipo_monitoreo_check";
ALTER TABLE "cronogramas" ADD CONSTRAINT "cronogramas_tipo_monitoreo_check" CHECK ("tipo_monitoreo" IN ('DOCENTE', 'DIRECTIVO', 'DOCENTE_EIB'));

-- AlterTable
ALTER TABLE "plantillas_monitoreo" DROP CONSTRAINT IF EXISTS "plantillas_monitoreo_tipo_monitoreo_check";
ALTER TABLE "plantillas_monitoreo" ADD CONSTRAINT "plantillas_monitoreo_tipo_monitoreo_check" CHECK ("tipo_monitoreo" IN ('DOCENTE', 'DIRECTIVO', 'DOCENTE_EIB'));
