import { useEffect } from 'react';
import { FileText } from 'lucide-react';
import { romanoANivel } from '@sistema-monitoreo/shared-contracts';
import type { Plantilla } from '@/entities/model-plantillas';
import { NIVELES_ROMANOS } from '../../lib/ficha-estado';
import { NavegacionPasos } from './NavegacionPasos';

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
  /** Todos los ítems con nivel y observación. */
  completa: boolean;
  /**
   * Ítem al que llevar la vista al entrar desde la barra lateral. Es un objeto y
   * no un id para que volver a tocar el mismo ítem también navegue.
   */
  foco?: { id: string } | null;
  onAnterior?: () => void;
  onSiguiente?: () => void;
}

/**
 * Planificación y diseño de evaluación: nivel de logro y observación por ítem.
 *
 * Así se titula la sección en la ficha de monitoreo al docente; «ejes e items»
 * es el encabezado de su columna, no el nombre de la sección. Sólo existe en el
 * instrumento docente: la ficha directiva no la lleva.
 *
 * Las observaciones son obligatorias para cerrar la ficha, según la regla de
 * `lib/validacion-ficha.ts`.
 *
 * Es un paso del panel, entre los criterios y el cierre: antes vivía debajo del
 * formulario, fuera del recorrido y de la barra lateral.
 */
export const EjesItemsSeccion = ({
  items,
  niveles,
  respuestas,
  observaciones,
  onResponder,
  onObservar,
  soloLectura,
  completa,
  foco,
  onAnterior,
  onSiguiente,
}: EjesItemsSeccionProps) => {
  useEffect(() => {
    if (!foco) return;
    document
      .getElementById(`plan-item-${foco.id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [foco]);

  return (
    <div className="flex-1 p-6 bg-white">
      <div className="space-y-4 animate-in fade-in duration-200">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          PLANIFICACIÓN Y DISEÑO DE EVALUACIÓN
        </span>

        {items.map((item) => (
          <div
            key={item.id}
            id={`plan-item-${item.id}`}
            className="scroll-mt-4 bg-slate-50/30 border border-slate-200/60 rounded-2xl p-5 space-y-4 hover:border-slate-300 hover:bg-slate-50/50 transition-all duration-200"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-black text-primary border border-primary/20 shadow-inner">
                {item.numero}
              </span>
              <p className="text-sm text-slate-800 font-semibold leading-relaxed">
                {item.descripcion}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pl-10">
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                  Nivel de Logro
                </span>
                <div className="flex items-center gap-2">
                  {NIVELES_ROMANOS.map((romano) => {
                    const valor = romanoANivel(romano);
                    const color =
                      niveles.find((n) => n.nivel === romano)?.color || COLOR_POR_DEFECTO;
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

        <NavegacionPasos
          etiqueta="Planificación y diseño de evaluación"
          subEtiqueta={`${items.length} ${items.length === 1 ? 'ítem' : 'ítems'}`}
          estado={completa ? 'completado' : 'pendiente'}
          motivoSinAvance="Elija el nivel y escriba la observación de cada ítem para continuar"
          onAnterior={onAnterior}
          onSiguiente={onSiguiente}
        />
      </div>
    </div>
  );
};
