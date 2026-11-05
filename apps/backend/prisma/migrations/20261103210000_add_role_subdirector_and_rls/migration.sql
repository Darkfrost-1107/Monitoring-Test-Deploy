-- ============================================================================
-- Agregar rol 'subdirector' a roles y actualizar RLS policies
-- ============================================================================

-- 1. Insertar el rol 'subdirector' si no existe
INSERT INTO "roles" ("id", "codigo", "nombre", "descripcion", "is_active", "created_at", "updated_at")
VALUES (
  gen_random_uuid(),
  'subdirector',
  'Subdirector',
  'Subdirector de Institución Educativa',
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("codigo") DO NOTHING;

-- 2. Actualizar policy de fichas_monitoreo para incluir 'subdirector'
DROP POLICY IF EXISTS fichas_role_isolation ON fichas_monitoreo;
CREATE POLICY fichas_role_isolation ON fichas_monitoreo
    FOR ALL
    USING (
        -- ALL: jefe_gestion, director_ugel
        current_setting('app.user_rol', true) IN ('jefe_gestion', 'director_ugel')
        -- INSTITUCION: director_institucion, subdirector, coord_pedagogico, jefe_taller
        OR (
            current_setting('app.user_rol', true) IN (
                'director_institucion', 'subdirector', 'coordinador_pedagogico', 'jefe_taller'
            )
            AND EXISTS (
                SELECT 1 FROM cronogramas c
                WHERE c.id = fichas_monitoreo.cronograma_id
                  AND c.institucion_id::text = current_setting('app.user_institucion_id', true)
            )
        )
        -- MONITOR: especialista
        OR (
            current_setting('app.user_rol', true) = 'especialista'
            AND EXISTS (
                SELECT 1 FROM usuarios u
                JOIN especialistas e ON e.persona_id = u.persona_id
                JOIN cronogramas c ON c.id = fichas_monitoreo.cronograma_id
                WHERE u.id::text = current_setting('app.user_id', true)
                  AND c.monitor_id = e.id
            )
        )
        -- DOCENTE: solo las fichas FINALIZADAS
        OR (
            current_setting('app.user_rol', true) = 'docente'
            AND estado = 'FINALIZADO'
        )
    )
    WITH CHECK (
        -- Solo MONITOR, INSTITUCION monitor y ADMIN pueden INSERT
        current_setting('app.user_rol', true) IN (
            'jefe_gestion', 'director_ugel', 'especialista',
            'director_institucion', 'subdirector', 'coordinador_pedagogico', 'jefe_taller'
        )
    );

-- 3. Actualizar policy de cronogramas para incluir 'subdirector'
DROP POLICY IF EXISTS cronogramas_role_isolation ON cronogramas;
CREATE POLICY cronogramas_role_isolation ON cronogramas
    FOR ALL
    USING (
        -- ALL
        current_setting('app.user_rol', true) IN ('jefe_gestion', 'director_ugel')
        -- INSTITUCION
        OR (
            current_setting('app.user_rol', true) IN (
                'director_institucion', 'subdirector', 'coordinador_pedagogico', 'jefe_taller'
            )
            AND institucion_id::text = current_setting('app.user_institucion_id', true)
        )
        -- MONITOR
        OR (
            current_setting('app.user_rol', true) = 'especialista'
            AND EXISTS (
                SELECT 1 FROM usuarios u
                JOIN especialistas e ON e.persona_id = u.persona_id
                WHERE u.id::text = current_setting('app.user_id', true)
                  AND cronogramas.monitor_id = e.id
            )
        )
    )
    WITH CHECK (
        current_setting('app.user_rol', true) IN (
            'jefe_gestion', 'director_ugel', 'especialista',
            'director_institucion', 'subdirector', 'coordinador_pedagogico', 'jefe_taller'
        )
    );
