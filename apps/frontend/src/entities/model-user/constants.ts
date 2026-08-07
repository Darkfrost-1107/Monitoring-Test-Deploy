/**
 * Constantes de rol propias de la entidad usuario.
 *
 * Fase 1 de PLAN_REMEDIACION.md unificó el tipo `UserRole` y las etiquetas en
 * el contrato compartido, y este archivo los reexportaba por compatibilidad.
 * Fase 7 retiró esa reexportación: lo que quedó es lo único que este archivo
 * declara por derecho propio.
 */

import { UGEL_ROLES, type UserRole } from '@sistema-monitoreo/shared-contracts';

/**
 * Roles con privilegios administrativos sobre el padrón.
 *
 * Se conserva el conjunto exacto que tenía antes de la unificación
 * (`director_ugel` y `jefe_area`) para no alterar el comportamiento de
 * `userValidator.isAdmin`. Nótese que nunca incluyó `'admin'`, lo que confirma
 * que ese valor era residuo.
 */
export const ADMIN_ROLES: readonly UserRole[] = UGEL_ROLES.filter(
  (rol) => rol === 'director_ugel' || rol === 'jefe_area',
);
