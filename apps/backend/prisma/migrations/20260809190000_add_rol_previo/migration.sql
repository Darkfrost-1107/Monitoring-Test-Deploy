-- Rol que un usuario ocupaba antes de asumir un cargo único.
--
-- Director de UGEL y Jefe de Gestión se ganan por examen: puede quedarlos un
-- especialista en ejercicio o alguien que nunca trabajó como tal. Al relevar al
-- saliente se lo devolvía siempre al rol de especialista, lo que convertía al
-- segundo en un especialista que nunca fue y lo dejaba en el padrón como
-- personal activo, disponible para asignarle monitoreos.
--
-- Nulo significa que no vino de ningún rol previo: al relevarlo corresponde
-- darlo de baja, no inventarle un puesto.

ALTER TABLE "usuarios" ADD COLUMN "rol_previo" VARCHAR(50);

-- Los cargos ya ocupados no dejaron rastro de su origen. Se los marca como
-- venidos del padrón —que es como el sistema los venía tratando— para no
-- dar de baja por sorpresa a quien hoy ocupa el cargo.
UPDATE "usuarios" u
SET "rol_previo" = 'especialista'
FROM "roles" r
WHERE u."rol_id" = r."id"
  AND r."codigo" IN ('director_ugel', 'jefe_gestion');
