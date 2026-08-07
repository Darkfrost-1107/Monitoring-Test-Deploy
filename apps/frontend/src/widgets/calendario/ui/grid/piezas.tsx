import type { ReactNode } from 'react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import type { Cronograma } from '@/entities/model-cronogramas';
import { claseBadgeEstado } from '../../lib/visita-presentacion';

/**
 * Piezas compartidas entre las vistas del calendario.
 *
 * Fase 5 de PLAN_REMEDIACION.md. Las vistas diaria y de lista repetían el mismo
 * encabezado de tarjeta y el mismo bloque de observaciones. No se unifican las
 * tarjetas enteras porque los campos que muestran difieren de verdad; sólo lo
 * que era idéntico.
 */

/** Nombre de la institución con los distintivos de estado y tipo. */
export const EncabezadoVisita = ({ visita }: { visita: Cronograma }) => (
  <div className="flex flex-wrap items-center gap-2">
    <span className="text-sm font-extrabold text-slate-800">{visita.institucion}</span>
    <Badge className={claseBadgeEstado(visita.estado)}>{visita.estado}</Badge>
    <Badge
      variant="outline"
      className="text-[10px] uppercase font-bold tracking-wider text-slate-500"
    >
      {visita.tipo}
    </Badge>
  </div>
);

/** Indicaciones de la visita. No se muestra nada cuando no las hay. */
export const NotaObservaciones = ({ observaciones }: { observaciones?: string }) => {
  if (!observaciones) return null;

  return (
    <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-100">
      <strong>Detalles:</strong> {observaciones}
    </div>
  );
};

/** Botón de detalle, presente en las tarjetas de las vistas diaria y de lista. */
export const AccionVerDetalles = () => (
  <div className="shrink-0 flex items-center gap-2">
    <Button
      variant="outline"
      size="sm"
      className="text-xs border-slate-200 text-slate-600 font-semibold cursor-pointer"
    >
      Ver detalles
    </Button>
  </div>
);

interface EstadoVacioProps {
  icono: ReactNode;
  titulo: string;
  mensaje: string;
  children?: ReactNode;
}

/** Marco común de los mensajes de «no hay nada que mostrar». */
export const EstadoVacio = ({ icono, titulo, mensaje, children }: EstadoVacioProps) => (
  <div className="text-center py-20 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
    {icono}
    <h3 className="text-slate-700 font-bold text-sm">{titulo}</h3>
    <p className="text-text-muted text-xs mt-1 max-w-xs mx-auto leading-relaxed">{mensaje}</p>
    {children}
  </div>
);

/** Contador de resultados que encabeza las vistas diaria y de lista. */
export const EncabezadoDeListado = ({ titulo, conteo }: { titulo: string; conteo: string }) => (
  <div className="border-b border-border pb-2 mb-4 flex items-center justify-between">
    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{titulo}</span>
    <span className="text-xs font-extrabold text-primary bg-primary-light px-2 py-0.5 rounded">
      {conteo}
    </span>
  </div>
);
