import { useState } from 'react';
import { Check, ClipboardList, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ISolicitudPlantilla } from '@sistema-monitoreo/shared-contracts';
import { Card } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { Input } from '@shared/ui/input';
import { ErrorDeApi } from '@shared/config/api';
import {
  useAprobarSolicitudPlantilla,
  useRechazarSolicitudPlantilla,
} from '../api/use-solicitudes-plantilla-api';
import { ResumenDelPedido } from './detalle/ResumenDelPedido';
import { LineaDeTiempoSolicitud } from './detalle/LineaDeTiempoSolicitud';

/**
 * Detalle y trazabilidad de un pedido de plantillas.
 *
 * Sigue el mismo formato que el detalle de una reprogramación de cronograma:
 * resumen a la izquierda, línea de tiempo a la derecha, decisión al pie. Es el
 * mismo acto administrativo —alguien pide, la Jefatura resuelve— y presentarlo
 * distinto obligaría a la misma persona a aprender dos lenguajes visuales para
 * leer lo mismo.
 *
 * ── Por qué la decisión vive acá y no en la tarjeta de la bandeja ──
 * Aprobar desde la lista invita a resolver sin abrir el PDF, y entonces el
 * trámite es un sello. Acá el documento está a un clic, arriba del botón.
 */

interface Props {
  solicitud: ISolicitudPlantilla | null;
  /** Si esta sesión puede resolver. El backend lo exige igual. */
  puedeDecidir: boolean;
  onClose: () => void;
}

const motivoDelFallo = (error: unknown, respaldo: string): string =>
  error instanceof ErrorDeApi && error.message ? error.message : respaldo;

export function DetalleSolicitudDialog({ solicitud, puedeDecidir, onClose }: Props) {
  const [motivo, setMotivo] = useState('');
  const [rechazando, setRechazando] = useState(false);

  const aprobar = useAprobarSolicitudPlantilla();
  const rechazar = useRechazarSolicitudPlantilla();

  if (!solicitud) return null;

  const pendiente = solicitud.estado === 'PENDIENTE';
  const trabajando = aprobar.isPending || rechazar.isPending;

  const cerrar = () => {
    setMotivo('');
    setRechazando(false);
    onClose();
  };

  const onAprobar = async () => {
    try {
      await aprobar.mutateAsync({ id: solicitud.id });
      toast.success('Solicitud aprobada. La institución ya puede crear esas plantillas.');
      cerrar();
    } catch (error) {
      toast.error(motivoDelFallo(error, 'No se pudo aprobar la solicitud.'));
    }
  };

  const onRechazar = async () => {
    try {
      await rechazar.mutateAsync({ id: solicitud.id, body: { comentario: motivo.trim() } });
      toast.success('Solicitud rechazada.');
      cerrar();
    } catch (error) {
      toast.error(motivoDelFallo(error, 'No se pudo rechazar la solicitud.'));
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-200">
      <Card className="bg-surface w-full max-w-[1000px] border border-border rounded-2xl shadow-xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-border bg-slate-50 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
              <ClipboardList className="h-3.5 w-3.5" />
              Plantillas de Monitoreo / Autorización
            </span>
            <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">
              Detalle de Solicitud de Plantilla
            </h2>
          </div>
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-2.5 bg-primary-light border-b border-primary/5 text-xs text-primary font-bold">
          Trazabilidad completa del pedido de {solicitud.institucionNombre}
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          <ResumenDelPedido solicitud={solicitud} />

          <div className="flex-1 p-6 overflow-y-auto space-y-5">
            <LineaDeTiempoSolicitud solicitud={solicitud} />

            {pendiente && puedeDecidir && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <h3 className="text-sm font-extrabold text-slate-800">Revisión de la Jefatura</h3>
                <p className="text-[11px] text-slate-500">
                  Lea la justificación antes de decidir. Aprobar habilita un cupo por cada
                  plantilla del pedido.
                </p>

                {!rechazando ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={onAprobar} disabled={trabajando}>
                      {aprobar.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Aprobar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setRechazando(true)}
                      disabled={trabajando}
                    >
                      <X className="h-4 w-4" />
                      Rechazar
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Input
                      aria-label="Motivo del rechazo"
                      placeholder="Explique por qué se rechaza, para que el director sepa qué corregir"
                      maxLength={1000}
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        variant="destructive"
                        onClick={onRechazar}
                        disabled={motivo.trim() === '' || trabajando}
                      >
                        {rechazar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        Confirmar rechazo
                      </Button>
                      <Button variant="ghost" onClick={() => setRechazando(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-border bg-slate-50 flex justify-end">
          <Button
            onClick={cerrar}
            className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-sm cursor-pointer"
          >
            Cerrar
          </Button>
        </div>
      </Card>
    </div>
  );
}
