/**
 * Constantes de rol de la entidad usuario.
 *
 * Fase 1 de PLAN_REMEDIACION.md: este archivo declaraba una copia literal del
 * tipo `UserRole` y un segundo diccionario de etiquetas. La duplicación ya había
 * derivado —rotulaba `director_ugel` como 'Director de UGEL' mientras
 * `shared/constants/roles.ts` decía 'Director UGEL'—, así que ahora reexporta la
 * declaración canónica de `@sistema-monitoreo/shared-contracts`.
 *
 * El rol `'admin'` desapareció del tipo: no existe en `RoleCode`, no lo siembra
 * `database/seeders/auth.js` y el backend nunca podía emitirlo. El rol que
 * gestiona altos cargos (Director UGEL y Jefe de Gestión) es `superusuario`, que
 * se conserva sin cambios.
 *
 * Este punto de importación se mantiene por compatibilidad y se retira en la
 * Fase 7, cuando los consumidores apunten directamente al contrato.
 */

export {
  RoleCode,
  ROLE_LABELS,
  ALL_ROLE_CODES,
  INSTITUTION_ROLES,
  READ_ONLY_ROLES,
  isRoleCode,
  type UserRole,
} from '@sistema-monitoreo/shared-contracts';

import { ROLE_LABELS, UGEL_ROLES, type UserRole } from '@sistema-monitoreo/shared-contracts';

/** @deprecated Usar `ROLE_LABELS` del contrato compartido. */
export const USER_ROLES_LABELS: Record<UserRole, string> = ROLE_LABELS;

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
