import { Compass, User, GraduationCap, Clock, Hash } from 'lucide-react';
import type { Cronograma } from '@/entities/model-cronogramas';
import { formatearHoraVisita } from '../../lib/visita-presentacion';
import {
  AccionVerDetalles,
  EncabezadoDeListado,
  EncabezadoVisita,
  EstadoVacio,
  NotaObservaciones,
} from './piezas';

interface VistaDiariaProps {
  visitas: Cronograma[];
  fechaSeleccionada: string;
  visitaSeleccionadaId: string | null;
  onSeleccionarVisita: (visitaId: string, fecha: string) => void;
}

/** Cronograma del día en línea de tiempo, una tarjeta por visita. */
export const VistaDiaria = ({
  visitas,
  fechaSeleccionada,
  visitaSeleccionadaId,
  onSeleccionarVisita,
}: VistaDiariaProps) => (
  <div className="space-y-4">
    <EncabezadoDeListado
      titulo="Cronograma del Día"
      conteo={`${visitas.length} visitas registradas`}
    />

    {visitas.length > 0 ? (
      <div className="relative pl-6 border-l-2 border-slate-100 space-y-6 py-2">
        {visitas.map((visita) => {
          const seleccionada = visitaSeleccionadaId === visita.id;

          return (
            <div
              key={visita.id}
              onClick={() => onSeleccionarVisita(visita.id, fechaSeleccionada)}
              className={`relative p-4 rounded-xl border transition-all cursor-pointer ${
                seleccionada
                  ? 'border-primary bg-primary-light/5 shadow-md ring-1 ring-primary/30'
                  : 'border-border bg-surface hover:bg-slate-50 shadow-sm'
              }`}
            >
              <div
                className={`absolute -left-[31px] top-6 h-4 w-4 rounded-full border-2 border-white shadow-sm transition-transform ${
                  seleccionada ? 'scale-125 bg-primary' : 'bg-slate-300'
                }`}
              />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <EncabezadoVisita visita={visita} />
                  <div className="text-xs text-text-muted flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                    <span className="flex items-center gap-1 font-medium">
                      <User className="h-3.5 w-3.5 text-primary" />
                      Especialista: <strong className="text-slate-700">{visita.especialista}</strong>
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <GraduationCap className="h-3.5 w-3.5 text-primary" />
                      Evaluado: <strong className="text-slate-700">{visita.docenteDirectivo}</strong>
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      Hora:{' '}
                      <strong className="text-slate-700">
                        {formatearHoraVisita(visita.fechaHora)}
                      </strong>
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <Hash className="h-3.5 w-3.5 text-primary" />
                      Nº Visita: <strong className="text-slate-700">{visita.nroVisita}</strong>
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
        icono={<Compass className="h-12 w-12 text-slate-300 mx-auto stroke-1 mb-3" />}
        titulo="Sin monitoreo registrado"
        mensaje={`No existen visitas programadas ni registradas para el día ${fechaSeleccionada}.`}
      />
    )}
  </div>
);
