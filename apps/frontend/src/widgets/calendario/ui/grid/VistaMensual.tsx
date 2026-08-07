import type { Cronograma } from '@/entities/model-cronogramas';
import { WEEK_DAYS, type CeldaCalendario } from '@shared/lib/calendario/grid';
import { claseEtiquetaVisita, clasePuntoEstado } from '../../lib/visita-presentacion';

/** Cuántas visitas caben en una celda antes de resumir el resto. */
const VISITAS_VISIBLES_POR_CELDA = 2;

interface VistaMensualProps {
  celdas: CeldaCalendario[];
  visitas: Cronograma[];
  fechaSeleccionada: string;
  hoy: string;
  onSeleccionarDia: (fecha: string) => void;
  onSeleccionarVisita: (visitaId: string, fecha: string) => void;
}

/**
 * Cuadrícula de seis semanas con las visitas resumidas en cada día.
 *
 * La construcción de la cuadrícula es aritmética de fechas y vive en
 * `shared/lib/calendario/grid`; acá sólo se pinta.
 */
export const VistaMensual = ({
  celdas,
  visitas,
  fechaSeleccionada,
  hoy,
  onSeleccionarDia,
  onSeleccionarVisita,
}: VistaMensualProps) => (
  <div className="space-y-2">
    <div className="grid grid-cols-7 border-b border-border pb-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
      {WEEK_DAYS.map((dia) => (
        <div key={dia} className="py-1">
          {dia}
        </div>
      ))}
    </div>

    <div className="grid grid-cols-7 grid-rows-6 gap-px bg-slate-100 border border-border rounded-xl overflow-hidden shadow-inner">
      {celdas.map((celda, idx) => {
        const visitasDelDia = visitas.filter((v) => v.fechaHora.substring(0, 10) === celda.dateStr);
        const seleccionada = fechaSeleccionada === celda.dateStr;
        const esHoy = celda.dateStr === hoy;
        const ocultas = visitasDelDia.length - VISITAS_VISIBLES_POR_CELDA;

        return (
          <div
            key={idx}
            onClick={() => onSeleccionarDia(celda.dateStr)}
            className={`min-h-[110px] p-2 flex flex-col justify-between transition-all duration-200 relative cursor-pointer select-none group ${
              celda.isCurrentMonth
                ? 'bg-surface hover:bg-slate-50/70'
                : 'bg-slate-50/40 text-slate-400'
            } ${
              seleccionada
                ? 'ring-2 ring-primary border-transparent bg-primary-light/10 z-10'
                : 'border-b border-r border-slate-100'
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              {esHoy ? (
                <span className="text-[10px] font-bold text-primary bg-primary-light border border-primary/20 px-1.5 py-0.5 rounded-md">
                  HOY
                </span>
              ) : (
                <span></span>
              )}
              <span
                className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-colors ${
                  esHoy
                    ? 'bg-primary text-white shadow-sm'
                    : seleccionada
                      ? 'text-primary bg-primary-light/80 font-black'
                      : celda.isCurrentMonth
                        ? 'text-slate-700'
                        : 'text-slate-300'
                }`}
              >
                {celda.dayNumber}
              </span>
            </div>

            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[70px] pr-0.5 scrollbar-thin">
              {visitasDelDia.slice(0, VISITAS_VISIBLES_POR_CELDA).map((visita) => (
                <div
                  key={visita.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeleccionarVisita(visita.id, celda.dateStr);
                  }}
                  className={`w-full px-2 py-1 rounded-md text-[10px] font-bold text-left truncate border flex items-center gap-1.5 transition-all hover:translate-x-0.5 shadow-sm ${claseEtiquetaVisita(
                    visita.estado,
                  )}`}
                  title={`${visita.especialista} - ${visita.institucion}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${clasePuntoEstado(visita.estado)} shrink-0`}
                  ></span>
                  <span className="truncate">Esp. {visita.especialista.split(' ')[0]}</span>
                </div>
              ))}

              {ocultas > 0 && (
                <div className="text-[9.5px] font-extrabold text-slate-500 pl-1 group-hover:text-primary transition-colors">
                  + {ocultas} más
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
