import { FileText } from 'lucide-react';
import { romanoANivel } from '@sistema-monitoreo/shared-contracts';
import type { Plantilla } from '@/entities/model-plantillas';
import { NIVELES_ROMANOS } from '../../lib/ficha-estado';

type EjeItem = NonNullable<Plantilla['ejesItems']>[number];
type NivelPlantilla = Plantilla['niveles'][number];

/** Color de respaldo cuando la plantilla no define uno para el nivel. */
const COLOR_POR_DEFECTO = '#3b82f6';

interface EjesItemsSeccionProps {
  items: EjeItem[];
  niveles: NivelPlantilla[];
  respuestas: Record<string, number>;
  observaciones: Record<string, string>;
  onResponder: (itemId: string, nivel: number) => void;
  onObservar: (itemId: string, texto: string) => void;
  soloLectura: boolean;
}

/**
 * Ejes e ítems del instrumento: nivel de logro y observación por cada uno.
 *
 * Las observaciones son obligatorias para cerrar la ficha, según la regla de
 * `lib/validacion-ficha.ts`.
 */
export const EjesItemsSeccion = ({
  items,
  niveles,
  respuestas,
  observaciones,
  onResponder,
  onObservar,
  soloLectura,
}: EjesItemsSeccionProps) => (
  <div className="border-t border-border pt-6 mt-6 px-5 space-y-4">
    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block flex items-center gap-1.5">
      <FileText className="h-3.5 w-3.5" />
      EJES E ITEMS
    </span>

    {items.map((item) => (
      <div
        key={item.id}
        className="bg-slate-50/30 border border-slate-200/60 rounded-2xl p-5 space-y-4 hover:border-slate-300 hover:bg-slate-50/50 transition-all duration-200"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-black text-primary border border-primary/20 shadow-inner">
            {item.numero}
          </span>
          <p className="text-sm text-slate-800 font-semibold leading-relaxed">{item.descripcion}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pl-10">
          <div className="space-y-1.5">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
              Nivel de Logro
            </span>
            <div className="flex items-center gap-2">
              {NIVELES_ROMANOS.map((romano) => {
                const valor = romanoANivel(romano);
                const color = niveles.find((n) => n.nivel === romano)?.color || COLOR_POR_DEFECTO;
                const elegido = respuestas[item.id] === valor;

                return (
                  <button
                    key={romano}
                    type="button"
                    onClick={() => {
                      if (!soloLectura) onResponder(item.id, valor);
                    }}
                    disabled={soloLectura}
                    className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all border cursor-pointer select-none flex items-center justify-center min-w-[45px] h-8 ${
                      soloLectura
                        ? 'opacity-70 cursor-not-allowed'
                        : 'hover:scale-[1.03] active:scale-[0.98]'
                    }`}
                    style={{
                      backgroundColor: elegido ? color : `${color}08`,
                      borderColor: elegido ? color : `${color}30`,
                      color: elegido ? '#ffffff' : color,
                      boxShadow: elegido ? `0 4px 10px ${color}35` : undefined,
                    }}
                  >
                    {romano}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
              Observaciones
            </span>
            <textarea
              value={observaciones[item.id] || ''}
              onChange={(e) => onObservar(item.id, e.target.value)}
              disabled={soloLectura}
              placeholder="Escriba las observaciones para este eje/ítem..."
              className="w-full bg-surface border border-slate-200 rounded-xl p-3 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary shadow-inner h-[72px] resize-none leading-relaxed disabled:opacity-70"
            />
          </div>
        </div>
      </div>
    ))}
  </div>
);
