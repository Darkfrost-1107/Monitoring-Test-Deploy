import { RoleCode } from '@sistema-monitoreo/shared-contracts';

/**
 * Quién puede gestionar cada plan de monitoreo.
 *
 * Fase 7 de PLAN_REMEDIACION.md. `PlanMonitoreoAnualPage` decidía esto con una
 * sola regla:
 *
 * ```ts
 * if (isJefeGestion && plan.tipoEntidad === 'IE') return false;
 * return true;
 * ```
 *
 * El backend tiene **dos** —`monitoring-plan.service.ts`, en `toggleEstado` y
 * en `hardDelete`—: además de esa, el director de institución tampoco puede
 * tocar los planes de la UGEL. Al faltar la segunda, al director se le
 * mostraban los botones de desactivar y de eliminar definitivamente sobre
 * planes que el servidor le iba a rechazar con un 403.
 *
 * ── Qué NO es esto ──
 * No es control de acceso: el servidor valida cada operación. Acá se decide qué
 * botones tiene sentido dibujar, y la regla se mantiene igual a la del servidor
 * para que no vuelvan a separarse.
 */

export type TipoDeEntidad = 'UGEL' | 'IE';

export interface PlanGestionable {
  tipoEntidad: string;
}

export interface UsuarioDePlanes {
  role: string;
}

/**
 * ¿Puede desactivar, reactivar o eliminar este plan?
 *
 * Réplica de las restricciones del servidor: el jefe de gestión no toca los
 * planes de las II.EE., y el director de institución no toca los de la UGEL.
 * El resto de los roles con `monitoreo:execute` puede con ambos.
 */
export function puedeGestionarPlan(
  plan: PlanGestionable,
  usuario: UsuarioDePlanes | null | undefined,
): boolean {
  if (!usuario) return false;

  if (usuario.role === RoleCode.JEFE_GESTION) return plan.tipoEntidad !== 'IE';
  if (usuario.role === RoleCode.DIRECTOR_INSTITUCION) return plan.tipoEntidad === 'IE';

  return true;
}
