import type { ReactNode } from 'react';
import type { Capability } from '@sistema-monitoreo/shared-contracts';
import { useCan } from './use-can';

interface CanProps {
  /** Capacidad requerida. Excluyente con `all` y `any`. */
  capability?: Capability;
  /** Requiere TODAS las capacidades listadas. */
  all?: readonly Capability[];
  /** Requiere AL MENOS UNA de las capacidades listadas. */
  any?: readonly Capability[];
  /** Contenido a mostrar cuando el usuario no cumple. Por defecto, nada. */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Guarda declarativa de capacidades para la capa de presentación.
 *
 * Prefiera este componente sobre un `&&` con `useCan()` cuando lo condicionado
 * sea un bloque de JSX: deja explícito en el marcado qué capacidad lo gobierna.
 *
 * No es un control de seguridad — ver la advertencia en `use-can.ts`.
 *
 * @example
 * <Can capability={Capability.DOCENTES_WRITE}>
 *   <Button onClick={crearDocente}>Registrar docente</Button>
 * </Can>
 *
 * @example
 * <Can any={[Capability.VISITAS_GESTIONAR, Capability.VISITAS_SOLICITAR]}>
 *   <BandejaSolicitudes />
 * </Can>
 */
export const Can = ({ capability, all, any, fallback = null, children }: CanProps) => {
  const { can, canAll, canAny } = useCan();

  let permitido = true;
  if (capability) permitido = can(capability);
  else if (all) permitido = canAll(all);
  else if (any) permitido = canAny(any);

  return <>{permitido ? children : fallback}</>;
};
