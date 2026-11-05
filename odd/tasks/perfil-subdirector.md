# Feature: Perfil y Rol de Subdirector de Institución Educativa

Implementación del rol y permisos del **Subdirector** dependiente del Director de I.E., con cuenta automática desde el padrón docente, capacidades de monitor institucional para todos los docentes de la escuela sin restricción de especialidad, y condición de evaluado por el Director de I.E.

## Specs
- **S1**: Creación y asignación por parte del Director de I.E. en el padrón de docentes al seleccionar el cargo `Subdirector`, resolviendo el rol a `RoleCode.SUBDIRECTOR` (`subdirector`) y generando su cuenta de acceso activa.
- **S2**: Definición formal del rol `RoleCode.SUBDIRECTOR` en contratos compartidos (`packages/shared-contracts`) y backend con ámbito institucional (`institucion`), integrándolo a `MONITOR_CAMPO_ROLES` con capacidades operativas (`Capability.MONITOREO_EXECUTE`, `Capability.DASHBOARD_READ`).
- **S3**: Alcance de monitoreo: el Subdirector puede monitorear a cualquier docente activo de su institución educativa, sin las restricciones sectorizadas por especialidad (ciencias, letras, EPT) que aplican al Coordinador o Jefe de Taller.
- **S4**: Supervisión interna: el Subdirector figura como evaluable dentro de la institución para que el Director de la I.E. pueda programarle visitas y evaluar su labor.
- **S5**: Frontend y Navegación: menú lateral institucional (Dashboard, Cronogramas, Monitoreo) y visibilidad de cronogramas correspondiente a personal directivo/monitor institucional.

## Tasks
- [x] **T1** (S2): Agregar `RoleCode.SUBDIRECTOR = 'subdirector'` y sus mappings (`ROLE_LABELS`, `ROLE_SCOPES`, `MONITOR_CAMPO_ROLES`, `INSTITUTION_ROLES`) en `packages/shared-contracts` y en backend (`role.enum.ts`, `capability-map.ts`).
- [x] **T2** (S1): Actualizar `resolveRoleCode` en `docente-shared.helper.ts` y sincronización de cargos en `docentes-cargos.service.ts` para que el cargo `Subdirector` resuelva a `RoleCode.SUBDIRECTOR` al crear o editar el docente.
- [x] **T3** (S3, S4): Adaptar reglas de evaluación y asignación en backend (`scheduling.service.ts`, validadores) y frontend (`use-opciones-de-evaluacion.ts`, `visibilidad.ts`) para que el Subdirector monitoree a toda la I.E. y sea evaluable por el Director.
- [x] **T4** (S5): Configurar permisos, navegación (`sidebar`), scope (`useScope`, `useCan`) y presentación en frontend para el rol `SUBDIRECTOR`.
- [x] **T5**: Pruebas unitarias en backend (teachers, auth, scheduling) y frontend (opciones de evaluación, visibilidad, roles).

## Allowed edit surfaces
packages/shared-contracts/src/constants/roles.constants.ts
packages/shared-contracts/src/constants/capabilities.constants.ts
packages/shared-contracts/src/index.ts
apps/backend/prisma/migrations/20261103210000_add_role_subdirector_and_rls/migration.sql
apps/backend/src/common/enums/role.enum.ts
apps/backend/src/common/enums/role.enum.spec.ts
apps/backend/src/shared/auth/capability-map.ts
apps/backend/src/shared/auth/capability-map.spec.ts
apps/backend/src/shared/auth/capabilities-contract.spec.ts
apps/backend/src/modules/teachers/repositories/docente-shared.helper.ts
apps/backend/src/modules/teachers/repositories/docente-shared.helper.spec.ts
apps/backend/src/modules/teachers/services/docentes-cargos.service.ts
apps/backend/src/modules/teachers/services/restablecer-contrasena.service.ts
apps/backend/src/modules/teachers/services/restablecer-contrasena.service.spec.ts
apps/backend/src/modules/scheduling/services/especialidad-monitoreo.helper.ts
apps/backend/src/modules/scheduling/services/especialidad-monitoreo.helper.spec.ts
apps/backend/src/modules/scheduling/services/scheduling-solicitud.helper.ts
apps/backend/src/modules/scheduling/services/scheduling.service.spec.ts
apps/frontend/src/entities/model-docentes/constants.ts
apps/frontend/src/entities/model-docentes/model.ts
apps/frontend/src/entities/model-docentes/validator.tsx
apps/frontend/src/features/cronogramas/hooks/use-opciones-de-evaluacion.ts
apps/frontend/src/features/cronogramas/hooks/use-opciones-de-evaluacion.test.ts
apps/frontend/src/features/cronogramas/lib/visibilidad.ts
apps/frontend/src/features/cronogramas/lib/visibilidad.test.ts
apps/frontend/src/pages/jefeGestion/CronogramaPage.tsx
apps/frontend/src/shared/constants/roles.ts
apps/frontend/src/shared/constants/getDefaultLandingPage.test.ts
apps/frontend/src/shared/constants/menu-capabilities.test.ts
database/seeders/auth.js

## Log
- L1: Petición original del usuario para implementar el rol y perfil del Subdirector según las definiciones del cliente educativo.
- L2: Implementación de contratos compartidos (`RoleCode.SUBDIRECTOR`, labels, scopes, monitors).
- L3: Migración Prisma RLS y actualización de seeders para PostgreSQL con `subdirector`.
- L4: Resolución de rol en padrón docente, creación de cuenta de acceso y sincronización con monitor institucional (40h).
- L5: Exoneración de especialidad de área para Subdirector en secundaria y habilitación de supervisión por parte del Director.
- L6: Menú institucional, capacidades y visibilidad de cronogramas integrados en frontend.
- L7: Integración de 'Subdirector' en modelo, validador y selector de cargos del padrón docente en frontend.
- L8: Validación completa de suites (typecheck, 68/68 backend test suites, 119/119 frontend test suites, linting sin errores).
