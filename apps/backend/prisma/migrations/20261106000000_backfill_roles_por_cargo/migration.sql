-- ============================================================================
-- Backfill: alinear usuarios.rol_id con el cargo principal vigente.
--
-- Los docentes registrados antes de que existiera el rol 'subdirector' quedaron
-- con rol 'docente' aunque su cargo es Subdirector. El rol solo se recalcula al
-- guardar la ficha, así que nunca se corrigió. Idempotente: solo toca usuarios
-- que hoy tienen rol 'docente' y cuyo cargo principal vigente exige otro rol.
-- ============================================================================

UPDATE "usuarios" u
SET "rol_id" = r_nuevo."id",
    "updated_at" = NOW()
FROM "docentes" d
JOIN "docente_cargos" dc
  ON dc."docente_id" = d."id"
 AND dc."es_principal" = true
 AND dc."fecha_fin" IS NULL
JOIN "cargos" c ON c."id" = dc."cargo_id"
JOIN "roles" r_nuevo
  ON r_nuevo."codigo" = CASE c."nombre"
       WHEN 'Subdirector' THEN 'subdirector'
       WHEN 'Coordinador Pedagógico' THEN 'coordinador_pedagogico'
       WHEN 'Jefe de Taller' THEN 'jefe_taller'
       WHEN 'Director' THEN 'director_institucion'
     END
WHERE d."persona_id" = u."persona_id"
  AND u."rol_id" = (SELECT "id" FROM "roles" WHERE "codigo" = 'docente');
