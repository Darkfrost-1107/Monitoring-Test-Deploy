import { AlertCircle, Calendar, Clock, GraduationCap, Hash, User, UploadCloud } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import type { Cronograma } from '@/entities/model-cronogramas';
import { useVisitasPendientes } from '@features/offline/use-visitas-pendientes';
import { formatearFechaLarga, formatearHoraVisita } from '../../lib/visita-presentacion';
import {
  AccionVerDetalles,
  EncabezadoDeListado,
  EncabezadoVisita,
  EstadoVacio,
  NotaObservaciones,
} from './piezas';

interface VistaListaProps {
  /** Visitas ya ordenadas cronológicamente. */
  visitas: Cronograma[];
  visitaSeleccionadaId: string | null;
  hayFiltroActivo: boolean;
  onSeleccionarVisita: (visitaId: string, fecha: string) => void;
  onLimpiarFiltros: () => void;
}

/** Todas las visitas filtradas en orden cronológico, sin noción de período. */
export const VistaLista = ({
  visitas,
  visitaSeleccionadaId,
  hayFiltroActivo,
  onSeleccionarVisita,
  onLimpiarFiltros,
}: VistaListaProps) => {
  // Visitas cuya ficha/firma quedó en la cola de envío offline.
  const pendientes = useVisitasPendientes();

  return (
  <div className="space-y-4">
    <EncabezadoDeListado
      titulo="Lista de Visitas Filtradas (Cronológico)"
      conteo={`${visitas.length} visitas encontradas`}
    />

    {visitas.length > 0 ? (
      <div className="space-y-4">
        {visitas.map((visita) => {
          const seleccionada = visitaSeleccionadaId === visita.id;
          const fecha = visita.fechaHora.substring(0, 10);

          return (
            <div
              key={visita.id}
              onClick={() => onSeleccionarVisita(visita.id, fecha)}
              className={`p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
                seleccionada
                  ? 'border-primary bg-primary-light/5 ring-1 ring-primary/30'
                  : 'border-border bg-surface hover:bg-slate-50 shadow-sm'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <EncabezadoVisita visita={visita} />
                    {pendientes.has(visita.id) && (
                      <span
                        title="La ficha se guardó sin conexión y se enviará al recuperar internet"
                        className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[0.65rem] font-bold uppercase text-amber-700"
                      >
                        <UploadCloud className="h-3 w-3" />
                        Pendiente de envío
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-text-muted grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-0.5">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>
                        Fecha:{' '}
                        <strong className="text-slate-700">
                          {formatearFechaLarga(visita.fechaHora)}
                        </strong>
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>
                        Hora:{' '}
                        <strong className="text-slate-700">
                          {formatearHoraVisita(visita.fechaHora)}
                        </strong>
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <User className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate">
                        Especialista:{' '}
                        <strong className="text-slate-700" title={visita.especialista}>
                          {visita.especialista}
                        </strong>
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate">
                        Evaluado:{' '}
                        <strong className="text-slate-700" title={visita.docenteDirectivo}>
                          {visita.docenteDirectivo}
                        </strong>
                      </span>
                    </span>
                  </div>

                  <div className="text-xs text-text-muted flex gap-x-4">
                    <span className="flex items-center gap-1 font-medium">
                      <Hash className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>
                        Nº Visita: <strong className="text-slate-700">{visita.nroVisita}</strong>
                      </span>
                    </span>
                    <span className="font-medium">
                      Nivel/Mod:{' '}
                      <strong className="text-slate-700">
                        {visita.nivel} / {visita.modalidad}
                      </strong>
                    </span>
                  </div>
                </div>

                <AccionVerDetalles />
              </div>

              <NotaObservaciones observaciones={visita.observaciones} />
            </div>
          );
        })}
      </div>
    ) : (
      <EstadoVacio
        icono={
          <AlertCircle className="h-12 w-12 text-slate-300 mx-auto stroke-1 mb-3 animate-bounce" />
        }
        titulo="Sin visitas que coincidan con los filtros"
        mensaje="No existen registros programados o realizados que coincidan con los filtros activos."
      >
        {hayFiltroActivo && (
          <Button
            onClick={onLimpiarFiltros}
            className="mt-4 text-xs font-bold bg-primary text-white hover:bg-primary-hover px-4 py-2 rounded-lg cursor-pointer"
          >
            Limpiar Filtros
          </Button>
        )}
      </EstadoVacio>
    )}
  </div>
  );
};
