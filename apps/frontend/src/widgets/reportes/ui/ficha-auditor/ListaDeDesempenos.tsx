import { Check, AlertCircle } from 'lucide-react';
import type { DesempenoAuditado } from '@features/reportes/lib/auditoria-ficha';

/**
 * La lista lateral de desempeños de la auditoría.
 *
 * La marca verde de verificado se dibujaba sin condición alguna, para todos:
 * un desempeño sin calificar aparecía como «Nivel III ✓». Ahora la marca sólo
 * sale cuando hay nivel registrado, y la ausencia se dice.
 */

interface Props {
  desempenos: readonly DesempenoAuditado[];
  seleccionadoId: string;
  onSeleccionar: (id: string) => void;
}

export const ListaDeDesempenos = ({ desempenos, seleccionadoId, onSeleccionar }: Props) => (
  <div className="w-full md:w-80 border-r border-border p-4 overflow-y-auto space-y-2 bg-slate-50/50">
    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">
      Desempeños Evaluados
    </span>

    {desempenos.map((desempeno) => {
      const activo = seleccionadoId === desempeno.id;

      return (
        <button
          key={desempeno.id}
          type="button"
          onClick={() => onSeleccionar(desempeno.id)}
          className={`w-full p-3 border rounded-xl cursor-pointer transition-all flex items-start gap-2 text-left select-none relative ${
            activo
              ? 'border-primary ring-1 ring-primary/40 bg-primary-light/50 font-extrabold text-primary shadow-sm'
              : 'border-border bg-surface text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span
            className={`h-5 w-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black ${
              activo ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {desempeno.orden}
          </span>

          <div className="space-y-0.5 pr-4">
            <div className="text-[11px] font-bold tracking-tight line-clamp-2">
              {desempeno.nombre}
            </div>
            <div className="text-[9px] font-semibold text-slate-400 flex items-center gap-1">
              {desempeno.calificado ? (
                <>
                  <span>Nivel Calificado:</span>
                  <strong className="text-primary font-black">Nivel {desempeno.nivel}</strong>
                </>
              ) : (
                <strong className="text-amber-600 font-black">Sin calificar</strong>
              )}
            </div>
          </div>

          <MarcaDeEstado calificado={desempeno.calificado} />
        </button>
      );
    })}
  </div>
);

/** Antes esta marca se dibujaba siempre, calificado o no. */
const MarcaDeEstado = ({ calificado }: { calificado: boolean }) => (
  <span
    title={calificado ? 'Desempeño calificado' : 'Desempeño sin calificar'}
    className={`absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 flex items-center justify-center rounded-full border ${
      calificado
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
        : 'bg-amber-50 border-amber-200 text-amber-700'
    }`}
  >
    {calificado ? (
      <Check className="h-2.5 w-2.5" strokeWidth={3} />
    ) : (
      <AlertCircle className="h-2.5 w-2.5" strokeWidth={3} />
    )}
  </span>
);
