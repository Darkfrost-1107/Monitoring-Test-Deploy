import { X, RefreshCw } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { Card } from '@shared/ui/card';
import type { Cronograma } from '@entities/model-cronogramas';
import type { SolicitudReprogramacion } from '@entities/model-reprogramaciones';
import { ResumenDeSolicitud } from './decidir/ResumenDeSolicitud';
import { LineaDeTiempo } from './decidir/LineaDeTiempo';
import { RevisionDeJefatura, EnRevisionPorOtro } from './decidir/RevisionDeJefatura';

/**
 * Detalle y resolución de una solicitud de reprogramación.
 *
 * Eran 346 líneas: el resumen de la visita, la bitácora con sus tres nodos y el
 * bloque de decisión, todo en un archivo. Acá queda el marco del diálogo.
 */

interface DecidirReprogramacionFormProps {
  isOpen: boolean;
  onClose: () => void;
  visit: Cronograma;
  request: SolicitudReprogramacion;
  canDecide: boolean;
  onApprove: (visitId: string, comment: string) => void;
  onReject: (visitId: string, comment: string) => void;
}

export const DecidirReprogramacionForm = ({
  isOpen,
  onClose,
  visit,
  request,
  canDecide,
  onApprove,
  onReject,
}: DecidirReprogramacionFormProps) => {
  if (!isOpen || !visit || !request) return null;

  const pendiente = request.estado === 'PENDIENTE';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-200">
      <Card className="bg-surface w-full max-w-[1000px] border border-border rounded-2xl shadow-xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-border bg-slate-50 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
              <RefreshCw className="h-3.5 w-3.5" />
              Gestión de Cronograma / Reprogramación
            </span>
            <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">
              Detalle de Solicitud de Cambio
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-2.5 bg-primary-light border-b border-primary/5 text-xs text-primary font-bold">
          Trazabilidad completa de la modificación de cronograma para {visit.institucion}
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          <ResumenDeSolicitud visita={visit} solicitud={request} />

          <div className="flex-1 p-6 overflow-y-auto space-y-5">
            <LineaDeTiempo solicitud={request} solicitante={visit.especialista} />

            {pendiente &&
              (canDecide ? (
                <RevisionDeJefatura
                  onAprobar={(comentario) => onApprove(visit.id, comentario)}
                  onRechazar={(comentario) => onReject(visit.id, comentario)}
                />
              ) : (
                <EnRevisionPorOtro solicitanteRol={request.solicitanteRolAlCrear} />
              ))}
          </div>
        </div>

        <div className="p-4 border-t border-border bg-slate-50 flex justify-end">
          <Button
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-sm cursor-pointer"
          >
            Volver al Calendario
          </Button>
        </div>
      </Card>
    </div>
  );
};
