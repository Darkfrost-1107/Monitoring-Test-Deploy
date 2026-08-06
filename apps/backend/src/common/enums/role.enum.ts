/**
 * Códigos de rol del backend.
 *
 * Fase 1 de PLAN_REMEDIACION.md: este archivo declaraba su propio `enum RoleCode`
 * con los mismos diez valores que el frontend mantenía por separado. Ahora
 * reexporta la declaración canónica de `@sistema-monitoreo/shared-contracts`
 * para que exista una sola definición en todo el repositorio.
 *
 * El punto de importación se conserva porque `RoleCode` tiene 37 consumidores en
 * el backend; el acceso `RoleCode.DIRECTOR_UGEL` no cambia.
 */

export {
  RoleCode,
  ROLE_LABELS,
  ALL_ROLE_CODES,
  isRoleCode,
} from '@sistema-monitoreo/shared-contracts';
