-- Carpeta pedagógica: enlace al portafolio del docente en Google Drive.
--
-- El sistema guarda la referencia, no los archivos. Un enlace por docente y
-- por año escolar.
CREATE TABLE "carpetas_pedagogicas" (
    "id" UUID NOT NULL,
    "docente_id" UUID NOT NULL,
    "anio_escolar" INTEGER NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "descripcion" VARCHAR(500),
    "actualizado_por_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carpetas_pedagogicas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "carpetas_pedagogicas_docente_id_anio_escolar_key"
    ON "carpetas_pedagogicas"("docente_id", "anio_escolar");

CREATE INDEX "carpetas_pedagogicas_anio_escolar_idx"
    ON "carpetas_pedagogicas"("anio_escolar");

ALTER TABLE "carpetas_pedagogicas"
    ADD CONSTRAINT "carpetas_pedagogicas_docente_id_fkey"
    FOREIGN KEY ("docente_id") REFERENCES "docentes"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "carpetas_pedagogicas"
    ADD CONSTRAINT "carpetas_pedagogicas_actualizado_por_id_fkey"
    FOREIGN KEY ("actualizado_por_id") REFERENCES "usuarios"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
