import { AlertCircle } from 'lucide-react';
import type { SolicitudReprogramacion } from '@entities/model-reprogramaciones';

interface AvisoSolicitudPendienteProps {
  solicitud: SolicitudReprogramacion | null;
  /** ¿Este usuario es quien resuelve la solicitud? */
  puedeDecidir: boolean;
}

/**
 * Aviso de solicitud de reprogramación esperando resolución.
 *
 * Se muestra sólo a quien puede resolverla: para el resto es ruido, porque no
 * tiene ninguna acción asociada.
 */
export const AvisoSolicitudPendiente = ({
  solicitud,
  puedeDecidir,
}: AvisoSolicitudPendienteProps) => {
  if (!solicitud || solicitud.estado !== 'PENDIENTE' || !puedeDecidir) return null;

  return (
    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-bold flex items-start gap-2 shadow-sm animate-pulse">
      <AlertCircle className="h-4.5 w-4.5 text-amber-600 mt-0.5 shrink-0" />
      <span>Solicitud de Reprogramación Pendiente</span>
    </div>
  );
};
