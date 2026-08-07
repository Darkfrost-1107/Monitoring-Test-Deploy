import { Compass, RefreshCw, PlusCircle } from 'lucide-react';
import { Button } from '@shared/ui/button';
import {
  ESTADOS_DE_SOLICITUD,
  TODOS_LOS_ESTADOS,
  type FiltroDeEstado,
} from '@features/reprogramaciones/lib/bandeja';

/**
 * Encabezado, filtros y estado vacío de la bandeja de reprogramaciones.
 *
 * Fase 7 de PLAN_REMEDIACION.md.
 */

interface CabeceraProps {
  descripcion: string;
  /** Sólo quien solicita registra solicitudes nuevas. */
  onNuevaSolicitud?: () => void;
}

export const CabeceraDeBandeja = ({ descripcion, onNuevaSolicitud }: CabeceraProps) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
    <div>
      <h3 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
        <RefreshCw className="h-5 w-5 text-primary animate-spin-hover" />
        <span>Bandeja de Solicitudes de Reprogramación</span>
      </h3>
      <p className="text-xs text-text-muted mt-1">{descripcion}</p>
    </div>

    {onNuevaSolicitud && (
      <Button
        onClick={onNuevaSolicitud}
        className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 h-10 rounded-xl flex items-center gap-1.5 shadow cursor-pointer"
      >
        <PlusCircle className="h-4.5 w-4.5" />
        <span>Nueva Solicitud</span>
      </Button>
    )}
  </div>
);

interface FiltrosProps {
  estado: FiltroDeEstado;
  onCambiar: (estado: FiltroDeEstado) => void;
}

export const FiltrosDeBandeja = ({ estado, onCambiar }: FiltrosProps) => (
  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 shrink-0">
      Filtrar Estado:
    </span>
    {([TODOS_LOS_ESTADOS, ...ESTADOS_DE_SOLICITUD] as const).map((opcion) => (
      <button
        key={opcion}
        type="button"
        onClick={() => onCambiar(opcion)}
        className={`px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
          estado === opcion
            ? 'bg-primary text-white border-primary shadow-sm'
            : 'bg-surface text-slate-600 border-slate-200 hover:bg-slate-50'
        }`}
      >
        {opcion}
      </button>
    ))}
  </div>
);

export const SinSolicitudes = () => (
  <div className="text-center py-24 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
    <Compass className="h-12 w-12 text-slate-300 mx-auto stroke-[1.2] mb-3" />
    <h3 className="text-slate-700 font-bold text-sm">Sin solicitudes encontradas</h3>
    <p className="text-text-muted text-xs mt-1.5 max-w-xs mx-auto leading-relaxed">
      No existen solicitudes de reprogramación que coincidan con el estado seleccionado.
    </p>
  </div>
);
