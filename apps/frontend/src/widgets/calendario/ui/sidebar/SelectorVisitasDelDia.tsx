import type { Cronograma } from '@entities/model-cronogramas';

interface SelectorVisitasDelDiaProps {
  visitas: Cronograma[];
  visitaSeleccionadaId: string | null;
  onSeleccionar: (id: string) => void;
}

/**
 * Conmutador entre las visitas programadas para el mismo día.
 *
 * Sólo aparece cuando hay más de una: con una sola visita el selector no ofrece
 * ninguna elección y el panel de detalle ya muestra esa misma información.
 */
export const SelectorVisitasDelDia = ({
  visitas,
  visitaSeleccionadaId,
  onSeleccionar,
}: SelectorVisitasDelDiaProps) => {
  if (visitas.length <= 1) return null;

  return (
    <div className="space-y-1.5 border-b border-border pb-3.5 mb-2.5">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
        Visitas del día ({visitas.length})
      </span>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {visitas.map((visita) => (
          <button
            key={visita.id}
            onClick={() => onSeleccionar(visita.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap border transition-all shadow-sm cursor-pointer ${
              visitaSeleccionadaId === visita.id
                ? 'bg-primary text-white border-primary shadow'
                : 'bg-surface text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Visita {visita.nroVisita} ({visita.especialistaInitials})
          </button>
        ))}
      </div>
    </div>
  );
};
