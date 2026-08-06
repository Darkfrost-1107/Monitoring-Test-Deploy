import { useMemo } from 'react';
import {
  Capability,
  hasAllCapabilities,
  hasAnyCapability,
} from '@sistema-monitoreo/shared-contracts';
import { useUser } from '@entities/model-user';

/**
 * Consulta de capacidades del usuario autenticado.
 *
 * Fase 2 de PLAN_REMEDIACION.md. Sustituye la comparación literal de rol que
 * estaba dispersa en 25 archivos de la capa de presentación. La pregunta
 * correcta no es qué rol tiene alguien, sino qué puede hacer: así, incorporar
 * un rol nuevo no obliga a recorrer la UI.
 *
 * ── Esto NO es un control de seguridad ──
 * Decide únicamente qué se muestra. Las capacidades viajan en el objeto de
 * usuario persistido en `localStorage` y son manipulables desde el navegador.
 * La autorización real la aplica `PermissionsGuard` del backend en cada
 * petición. Ocultar un botón no protege el endpoint que hay detrás.
 *
 * @example
 * const { can } = useCan();
 * if (can(Capability.DOCENTES_WRITE)) { … }
 *
 * @example
 * const { canAny } = useCan();
 * const puedeVerPadron = canAny([
 *   Capability.INSTITUCIONES_READ,
 *   Capability.DOCENTES_READ,
 * ]);
 */
export const useCan = () => {
  const { user } = useUser();
  const permissions = user?.permissions;

  return useMemo(
    () => ({
      /** Capacidades efectivas del usuario. Vacío si no hay sesión. */
      permissions: permissions ?? [],

      /** ¿Tiene esta capacidad? */
      can: (capability: Capability): boolean => hasAllCapabilities(permissions, [capability]),

      /** ¿Tiene TODAS estas capacidades? Misma semántica que `PermissionsGuard`. */
      canAll: (capabilities: readonly Capability[]): boolean =>
        hasAllCapabilities(permissions, capabilities),

      /** ¿Tiene AL MENOS UNA de estas capacidades? */
      canAny: (capabilities: readonly Capability[]): boolean =>
        hasAnyCapability(permissions, capabilities),
    }),
    [permissions],
  );
};
