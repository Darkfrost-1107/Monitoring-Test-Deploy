import { FileText } from 'lucide-react';
import type { Plantilla } from '@entities/model-plantillas';
import { nivelNumericoARomano } from '@features/reportes/lib/nivel-logro';

/**
 * Los ejes e ítems tal como quedaron registrados.
 *
 * La conversión de nivel numérico a romano estaba escrita otra vez acá, como un
 * arreglo con un hueco al frente: `['', 'I', 'II', 'III', 'IV'][nivel]`.
 */

type Nivel = Plantilla['niveles'][number];

interface Props {
  items: NonNullable<Plantilla['ejesItems']>;
  niveles: readonly Nivel[];
  respuestas?: Record<string, number>;
  observaciones?: Record<string, string>;
}

export const EjesEItemsAuditados = ({ items, niveles, respuestas, observaciones }: Props) => (
  <div className="space-y-3 pt-4 border-t border-slate-100 mt-4">
    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
      <FileText className="h-3.5 w-3.5" />
      EJES E ITEMS
    </span>

    {items.map((item) => {
      const romano = nivelNumericoARomano(respuestas?.[item.id]);
      const observacion = observaciones?.[item.id];

      return (
        <div key={item.id} className="border border-slate-200 rounded-xl p-3 space-y-1">
          <div className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
              {item.numero}
            </span>
            <span className="text-xs text-slate-700">{item.descripcion}</span>
          </div>

          <div className="flex items-center gap-4 pl-7">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase">Nivel:</span>
            {romano ? (
              <InsigniaDeNivel romano={romano} niveles={niveles} />
            ) : (
              <span className="text-xs font-bold text-slate-400">—</span>
            )}
          </div>

          {observacion && (
            <p className="text-[11px] text-slate-600 leading-relaxed pl-7 whitespace-pre-wrap">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase block">
                Observaciones:
              </span>
              {observacion}
            </p>
          )}
        </div>
      );
    })}
  </div>
);

/** Color por omisión cuando la plantilla no declara ese nivel. */
const AZUL = '#3b82f6';

const InsigniaDeNivel = ({ romano, niveles }: { romano: string; niveles: readonly Nivel[] }) => (
  <span
    className="px-2 py-0.5 rounded text-[10px] font-black text-white"
    style={{ backgroundColor: niveles.find((n) => n.nivel === romano)?.color ?? AZUL }}
  >
    Nivel {romano}
  </span>
);
