import { ChevronLeft, ChevronRight, CheckCircle2, Clock } from 'lucide-react';

interface NavegacionPasosProps {
  /** Rótulo principal del paso, p. ej. «Criterio 3 de 3» o «Cierre · Sugerencias». */
  etiqueta: string;
  /** Línea secundaria opcional, p. ej. «3 de 3 evaluados». */
  subEtiqueta?: string;
  /** Píldora de estado; `null` no muestra ninguna (paso opcional sin llenar). */
  estado?: 'completado' | 'pendiente' | null;
  onAnterior?: () => void;
  onSiguiente?: () => void;
}

/**
 * Barra «Anterior / Siguiente» pegada al fondo del panel de la ficha.
 *
 * Se extrajo de la rúbrica para que criterios y pasos de cierre compartan la
 * misma navegación: el índice de la izquierda mueve un único escenario y el
 * evaluador avanza en línea recta —criterio a criterio y luego al cierre— sin
 * tener que scrollear para encontrar el botón.
 */
export const NavegacionPasos = ({
  etiqueta,
  subEtiqueta,
  estado = null,
  onAnterior,
  onSiguiente,
}: NavegacionPasosProps) => (
  <div className="sticky bottom-0 z-10 -mx-6 -mb-6 mt-6 border-t border-slate-200 flex items-center justify-between gap-3 bg-slate-50 px-6 py-3 shadow-[0_-6px_16px_-10px_rgba(0,0,0,0.3)]">
    <button
      type="button"
      disabled={!onAnterior}
      onClick={onAnterior}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
        onAnterior
          ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-2xs cursor-pointer active:scale-98'
          : 'bg-slate-100/60 text-slate-300 border border-transparent cursor-not-allowed'
      }`}
    >
      <ChevronLeft className="h-4 w-4" />
      <span>Anterior</span>
    </button>

    <div className="flex items-center gap-2.5">
      <div className="flex flex-col items-center">
        <span className="text-[11px] font-black text-slate-700 tracking-tight">{etiqueta}</span>
        {subEtiqueta && (
          <span className="text-[9.5px] font-bold text-slate-400">{subEtiqueta}</span>
        )}
      </div>
      {estado === 'completado' && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black">
          <CheckCircle2 className="h-3 w-3" />
          Completado
        </span>
      )}
      {estado === 'pendiente' && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black">
          <Clock className="h-3 w-3" />
          Pendiente
        </span>
      )}
    </div>

    <button
      type="button"
      disabled={!onSiguiente}
      onClick={onSiguiente}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
        onSiguiente
          ? 'bg-primary text-white hover:bg-primary-dark shadow-xs cursor-pointer active:scale-98'
          : 'bg-slate-100/60 text-slate-300 border border-transparent cursor-not-allowed'
      }`}
    >
      <span>Siguiente</span>
      <ChevronRight className="h-4 w-4" />
    </button>
  </div>
);
