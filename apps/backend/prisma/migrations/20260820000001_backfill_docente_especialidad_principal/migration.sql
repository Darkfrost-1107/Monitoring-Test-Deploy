-- Los docentes registrados antes de `es_principal` quedaron con todas sus
-- especialidades en `false`. Se marca una como principal por docente (la de
-- menor id, determinística) para que tengan una principal definida; los que ya
-- tienen una principal no se tocan.
UPDATE "docente_especialidades" de
SET "es_principal" = true
WHERE de.id = (
  SELECT d2.id
  FROM "docente_especialidades" d2
  WHERE d2.docente_id = de.docente_id
  ORDER BY d2.id
  LIMIT 1
)
AND NOT EXISTS (
  SELECT 1 FROM "docente_especialidades" p
  WHERE p.docente_id = de.docente_id AND p.es_principal = true
);
