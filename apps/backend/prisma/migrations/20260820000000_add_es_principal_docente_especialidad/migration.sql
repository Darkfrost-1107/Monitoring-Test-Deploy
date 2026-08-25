-- Un docente de Secundaria tiene una especialidad principal y puede sumar
-- especialidades extras (cuando la plana docente es corta y cubre más áreas).
-- La marca `es_principal` distingue la principal de las extras, igual que en
-- `especialista_especialidades`, para no depender del orden de la relación.
ALTER TABLE "docente_especialidades" ADD COLUMN "es_principal" BOOLEAN NOT NULL DEFAULT false;
