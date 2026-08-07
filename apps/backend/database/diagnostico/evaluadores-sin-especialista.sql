-- Evaluadores sin registro de Especialista.
--
-- Fase 6 de PLAN_REMEDIACION.md. `puedeEvaluarVisita` decide quién puede
-- levantar la ficha de una visita. La vía correcta compara identificadores:
-- `usuario.especialistaId` contra `cronograma.monitor_id`. Cuando el usuario no
-- tiene registro de Especialista, cae a un respaldo histórico que compara
-- NOMBRES por inclusión de subcadenas, de modo que un nombre de pila corto
-- habilita sobre visitas ajenas: «Ana» coincide con «Juana».
--
-- Esta consulta cuenta a quiénes afecta ese respaldo hoy. El resultado decide
-- si se puede quitar sin dejar a nadie sin poder trabajar.
--
-- Cómo correrla:
--   psql "$DATABASE_URL" -f apps/backend/database/diagnostico/evaluadores-sin-especialista.sql
--
-- Interpretación:
--   0 filas  → nadie depende del respaldo; se elimina y se exige el vínculo.
--   >0 filas → esas personas quedarían sin poder levantar fichas. Hay que
--              crearles el registro de Especialista antes, o endurecer el
--              respaldo en lugar de quitarlo.

SELECT
  u.id                                        AS usuario_id,
  p.dni,
  p.nombres || ' ' || p.apellidos             AS nombre_completo,
  r.codigo                                    AS rol,
  u.is_active                                 AS usuario_activo,
  -- Visitas donde esta persona figura como monitor. Si es 0, el respaldo no
  -- le sirve de nada igual y quitarlo no le cambia nada.
  (
    SELECT COUNT(*)
    FROM cronogramas c
    JOIN especialistas e2 ON e2.id = c.monitor_id
    WHERE e2.persona_id = p.id
  )                                           AS visitas_como_monitor
FROM usuarios u
JOIN personas p ON p.id = u.persona_id
JOIN roles    r ON r.id = u.rol_id
LEFT JOIN especialistas e ON e.persona_id = p.id
WHERE
  -- Roles que pueden figurar como evaluador de una visita. Es el mismo
  -- conjunto que declara ROLES_EVALUADORES en el frontend.
  r.codigo IN (
    'especialista',
    'coordinador_pedagogico',
    'jefe_taller',
    'jefe_gestion',
    'jefe_area',
    'director_institucion'
  )
  -- Sin registro de Especialista: el token no lleva especialista_id y la
  -- autorización cae al respaldo por nombre.
  AND e.id IS NULL
ORDER BY r.codigo, p.apellidos, p.nombres;
