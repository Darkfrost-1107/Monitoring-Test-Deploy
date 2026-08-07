import { Check } from 'lucide-react';
import type { Plantilla } from '@/entities/model-plantillas';

type Desempeno = Plantilla['desempenos'][number];

interface ListaDesempenosProps {
  desempenos: Desempeno[];
  seleccionadoId: string;
  /** Nivel elegido por desempeño; su ausencia es «sin evaluar». */
  nivelesElegidos: Record<string, string>;
  onSeleccionar: (desempenoId: string) => void;
}

/**
 * Índice de criterios a evaluar, con su avance.
 *
 * La marca de evaluado importa: la ficha no se puede cerrar con desempeños sin
 * calificar, y esta lista es donde el evaluador ve cuáles le faltan.
 */
export const ListaDesempenos = ({
  desempenos,
  seleccionadoId,
  nivelesElegidos,
  onSeleccionar,
}: ListaDesempenosProps) => (
  <div className="w-full md:w-80 border-r border-border p-4 overflow-y-auto space-y-2 bg-slate-50/50">
    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">
      Criterios / Desempeños a Evaluar
    </span>

    {desempenos.map((desempeno, indice) => {
      const seleccionado = seleccionadoId === desempeno.id;
      const nivel = nivelesElegidos[desempeno.id];

      return (
        <div
          key={desempeno.id}
          onClick={() => onSeleccionar(desempeno.id)}
          className={`p-3 border rounded-xl cursor-pointer transition-all flex items-start gap-2 shadow-xs leading-snug text-left select-none relative ${
            seleccionado
              ? 'border-primary ring-1 ring-primary/40 bg-primary-light/50 font-extrabold text-primary shadow-sm'
              : 'border-border bg-surface text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span
            className={`h-5 w-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black ${
              seleccionado ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {indice + 1}
          </span>

          <div className="space-y-0.5 pr-4">
            <div className="text-[11px] font-bold tracking-tight line-clamp-2">
              {desempeno.nombre}
            </div>
            <div className="text-[9px] font-semibold text-slate-400 flex items-center gap-1">
              <span>Nivel:</span>
              <strong className={nivel ? 'text-primary' : 'text-slate-400 font-normal italic'}>
                {nivel ? `Nivel ${nivel}` : 'Sin evaluar'}
              </strong>
            </div>
          </div>

          {nivel && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center rounded-full">
              <Check className="h-2.5 w-2.5 font-bold" strokeWidth={3} />
            </span>
          )}
        </div>
      );
    })}
  </div>
);
