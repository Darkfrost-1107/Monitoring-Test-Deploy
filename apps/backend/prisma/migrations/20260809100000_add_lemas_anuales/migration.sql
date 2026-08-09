-- Lema oficial del Estado peruano, uno por año académico.
--
-- Lo fija un decreto supremo cada enero y es el mismo para todo el país, de
-- modo que es propiedad del año y no de la plantilla registrada en él. El año
-- es la clave primaria: no hay forma de guardar dos lemas para el mismo año.
--
-- Se conserva el histórico completo en vez de un único «lema vigente» porque
-- una ficha de 2025 reimpresa en 2027 debe encabezarse con el decreto que
-- regía cuando se levantó.

CREATE TABLE "lemas_anuales" (
    "anio" INTEGER NOT NULL,
    "lema" VARCHAR(250) NOT NULL,
    "autor_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lemas_anuales_pkey" PRIMARY KEY ("anio")
);

ALTER TABLE "lemas_anuales"
    ADD CONSTRAINT "lemas_anuales_autor_id_fkey"
    FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Semilla: los tres lemas que hasta ahora vivían escritos a mano en
-- `apps/frontend/src/features/reportes/lib/lema-del-anio.ts`. Se trasladan tal
-- cual para que las fichas ya archivadas sigan imprimiendo su encabezado.
-- `autor_id` queda nulo: los cargó el sistema, no una persona.
INSERT INTO "lemas_anuales" ("anio", "lema") VALUES
    (2023, 'Año de la unidad, la paz y el desarrollo'),
    (2024, 'Año del Bicentenario, de la consolidación de nuestra Independencia, y de la conmemoración de las heroicas batallas de Junín y Ayacucho'),
    (2025, 'Año de la recuperación y consolidación de la economía peruana')
ON CONFLICT ("anio") DO NOTHING;
