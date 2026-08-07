import { Compass, User } from 'lucide-react';
import type { Cronograma } from '@/entities/model-cronogramas';
import type { DiaSemana } from '@shared/lib/calendario/grid';
import {
  claseEtiquetaVisita,
  clasePuntoEstado,
  formatearHoraVisita,
} from '../../lib/visita-presentacion';

interface VistaSemanalProps {
  dias: DiaSemana[];
  visitas: Cronograma[];
  fechaSeleccionada: string;
  visitaSeleccionadaId: string | null;
  hoy: string;
  onSeleccionarDia: (fecha: string) => void;
  onSeleccionarVisita: (visitaId: string, fecha: string) => void;
}

/** Los siete días de la semana en columnas, con sus visitas completas. */
export const VistaSemanal = ({
  dias,
  visitas,
  fechaSeleccionada,
  visitaSeleccionadaId,
  hoy,
  onSeleccionarDia,
  onSeleccionarVisita,
}: VistaSemanalProps) => (
  <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
    {dias.map((dia, idx) => {
      const visitasDelDia = visitas.filter((v) => v.fechaHora.substring(0, 10) === dia.dateStr);
      const seleccionado = fechaSeleccionada === dia.dateStr;
      const esHoy = dia.dateStr === hoy;

      return (
        <div
          key={idx}
          onClick={() => onSeleccionarDia(dia.dateStr)}
          className={`border rounded-xl p-3 min-h-[300px] flex flex-col transition-all cursor-pointer ${
            seleccionado
              ? 'border-primary ring-1 ring-primary bg-primary-light/5 shadow-md'
              : esHoy
                ? 'border-primary/40 bg-slate-50'
                : 'border-border bg-surface hover:bg-slate-50/50'
          }`}
        >
          <div className="text-center pb-2 border-b border-border mb-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {dia.name}
            </div>
            <div
              className={`text-lg font-extrabold w-8 h-8 mx-auto flex items-center justify-center rounded-full mt-1 ${
                esHoy
                  ? 'bg-primary text-white shadow-sm'
                  : seleccionado
                    ? 'text-primary bg-primary-light font-black'
                    : 'text-slate-800'
              }`}
            >
              {dia.dayNumber}
            </div>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto">
            {visitasDelDia.map((visita) => (
              <div
                key={visita.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSeleccionarVisita(visita.id, dia.dateStr);
                }}
                className={`p-2.5 rounded-lg border text-xs text-left transition-all hover:scale-[1.02] shadow-sm flex flex-col gap-1.5 cursor-pointer ${claseEtiquetaVisita(
                  visita.estado,
                )} ${visitaSeleccionadaId === visita.id ? 'ring-1 ring-primary/40 border-primary' : ''}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-extrabold truncate">
                    {visita.institucion.split(' - ')[0]}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 shrink-0">
                    {formatearHoraVisita(visita.fechaHora)}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  <User className="h-3 w-3 inline text-slate-400" />
                  <span className="truncate">{visita.especialista}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded font-black bg-white/70 shadow-sm border border-slate-100">
                    {visita.tipo}
                  </span>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${clasePuntoEstado(visita.estado)}`}
                  ></span>
                </div>
              </div>
            ))}

            {visitasDelDia.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-lg py-12 text-slate-300">
                <Compass className="h-6 w-6 stroke-1 mb-1" />
                <span className="text-[10px] font-semibold">Sin visitas</span>
              </div>
            )}
          </div>
        </div>
      );
    })}
  </div>
);
