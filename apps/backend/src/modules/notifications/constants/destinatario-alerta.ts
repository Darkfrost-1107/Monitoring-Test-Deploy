import type { DestinatarioAlerta } from '@sistema-monitoreo/shared-contracts';

/**
 * Clave de audiencia de una alerta manual (`DestinatarioAlerta` del contrato).
 *
 * No es un `RoleCode`: `director_ie` designa «el Director de la propia I.E.» y
 * se resuelve por cargo vigente, no por rol de usuario. `jefe_area` coincide con
 * `RoleCode.JEFE_AREA` sólo en el texto, pero acá nombra al Responsable de Nivel
 * del nivel de la I.E. Los valores viajan por la red: no cambiarlos.
 */
export const DESTINATARIO_ALERTA = {
  DIRECTOR_IE: 'director_ie',
  JEFE_AREA: 'jefe_area',
} as const satisfies Record<string, DestinatarioAlerta>;
