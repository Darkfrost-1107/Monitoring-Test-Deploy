/**
 * Cuándo NO se puede inactivar un plan de monitoreo.
 *
 * Un plan activo es la base del monitoreo de la institución: sobre él se
 * apoyan las plantillas que definen las fichas y los cronogramas de visita.
 * Inactivarlo mientras esa base está en uso deja el trabajo en curso sin plan
 * activo y —por la regla de `PrerrequisitosDirectorService`— vuelve a bloquear
 * al Coordinador y al Jefe de Taller. Por eso se impide, igual que no se puede
 * eliminar un plan con dependencias.
 *
 * La reactivación (Inactivo → Activo) no pasa por acá: esa la gobierna la regla
 * de un solo plan activo por año.
 */

/** Lo que cuelga de un plan y lo mantiene en uso. */
export interface DependenciasDePlan {
  /** Plantillas vigentes de la institución para el año del plan. */
  plantillasVigentes: number;
  /** Cronogramas (visitas) atados a este plan, sin contar los anulados. */
  cronogramas: number;
}

/** Si el plan sostiene monitoreo activo y no debe inactivarse. */
export function tieneDependenciasActivas(deps: DependenciasDePlan): boolean {
  return deps.plantillasVigentes > 0 || deps.cronogramas > 0;
}

/**
 * El mensaje que explica por qué no se puede inactivar, o cadena vacía.
 *
 * Nombra qué lo sostiene para que el usuario sepa qué desmontar primero, en
 * lugar de un rechazo opaco.
 */
export function motivoInactivacionBloqueada(deps: DependenciasDePlan): string {
  if (!tieneDependenciasActivas(deps)) return '';

  const partes: string[] = [];
  if (deps.plantillasVigentes > 0) partes.push('plantillas vigentes');
  if (deps.cronogramas > 0) partes.push('cronogramas de visita');

  return `No se puede inactivar el plan porque la institución tiene ${partes.join(
    ' y ',
  )} que dependen de él. Desactívelos primero.`;
}
