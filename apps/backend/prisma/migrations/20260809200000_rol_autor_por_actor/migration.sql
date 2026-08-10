-- Cada actor de la institución tiene su propia plantilla.
--
-- La cascada de clonación es: el Jefe de Gestión crea la plantilla de la UGEL,
-- el Director de I.E. la clona y la adapta, y el Jefe de Taller y el Coordinador
-- Pedagógico clonan la del Director. Al monitorear, cada uno usa la suya.
--
-- `rol_autor_al_crear` sólo admitía 'jefe_gestion' y 'director_ie', de modo que
-- los tres actores de la I.E. compartían el mismo valor. La regla que impide dos
-- plantillas vigentes del mismo autor los tomaba por uno solo: el segundo que
-- intentaba activar la suya chocaba con la del primero.
--
-- Las filas existentes se quedan en 'director_ie'. No hay forma de recuperar
-- quién las creó, y atribuirlas al Director es lo más cercano a la realidad.

ALTER TABLE "plantillas_monitoreo"
    DROP CONSTRAINT IF EXISTS "plantillas_monitoreo_rol_autor_check";

ALTER TABLE "plantillas_monitoreo"
    ADD CONSTRAINT "plantillas_monitoreo_rol_autor_check"
    CHECK ("rol_autor_al_crear" IN (
        'jefe_gestion',
        'director_ie',
        'coordinador_pedagogico',
        'jefe_taller'
    ));
