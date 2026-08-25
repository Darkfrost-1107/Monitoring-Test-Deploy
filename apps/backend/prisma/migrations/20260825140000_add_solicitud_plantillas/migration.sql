-- Solicitudes de plantilla: una I.E. pide autorización para crear instrumentos propios.
--
-- La cabecera lleva el PDF y la decisión del Jefe de Gestión; cada ítem es un
-- vale que habilita UNA plantilla y se consume al crearla.
CREATE TABLE "solicitudes_plantilla" (
    "id" UUID NOT NULL,
    "institucion_id" UUID NOT NULL,
    "solicitante_id" UUID NOT NULL,
    "anio_escolar" INTEGER NOT NULL,
    "justificacion_url" VARCHAR(500) NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    "resuelta_por_id" UUID,
    "resuelta_at" TIMESTAMP(3),
    "comentario" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitudes_plantilla_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "solicitud_plantilla_items" (
    "id" UUID NOT NULL,
    "solicitud_id" UUID NOT NULL,
    "instrumento" VARCHAR(20) NOT NULL,
    "cargo_beneficiario" VARCHAR(50) NOT NULL,
    "descripcion" VARCHAR(300) NOT NULL,
    "plantilla_id" UUID,

    CONSTRAINT "solicitud_plantilla_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "solicitudes_plantilla_estado_idx" ON "solicitudes_plantilla"("estado");
CREATE INDEX "solicitudes_plantilla_institucion_id_anio_escolar_idx"
    ON "solicitudes_plantilla"("institucion_id", "anio_escolar");
CREATE INDEX "solicitud_plantilla_items_solicitud_id_idx"
    ON "solicitud_plantilla_items"("solicitud_id");

-- Un vale se consume una sola vez: dos plantillas no pueden colgar del mismo item.
CREATE UNIQUE INDEX "solicitud_plantilla_items_plantilla_id_key"
    ON "solicitud_plantilla_items"("plantilla_id");

ALTER TABLE "solicitudes_plantilla"
    ADD CONSTRAINT "solicitudes_plantilla_institucion_id_fkey"
    FOREIGN KEY ("institucion_id") REFERENCES "instituciones_educativas"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "solicitudes_plantilla"
    ADD CONSTRAINT "solicitudes_plantilla_solicitante_id_fkey"
    FOREIGN KEY ("solicitante_id") REFERENCES "usuarios"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "solicitudes_plantilla"
    ADD CONSTRAINT "solicitudes_plantilla_resuelta_por_id_fkey"
    FOREIGN KEY ("resuelta_por_id") REFERENCES "usuarios"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "solicitud_plantilla_items"
    ADD CONSTRAINT "solicitud_plantilla_items_solicitud_id_fkey"
    FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes_plantilla"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "solicitud_plantilla_items"
    ADD CONSTRAINT "solicitud_plantilla_items_plantilla_id_fkey"
    FOREIGN KEY ("plantilla_id") REFERENCES "plantillas_monitoreo"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
