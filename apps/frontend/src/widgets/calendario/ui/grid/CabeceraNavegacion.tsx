import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';

/** Estados con color propio en el calendario, en el orden en que se leen. */
const LEYENDA = [
  { punto: 'bg-blue-500', etiqueta: 'Programado' },
  { punto: 'bg-rose-500', etiqueta: 'En Proceso' },
  { punto: 'bg-emerald-500', etiqueta: 'Realizado' },
  { punto: 'bg-amber-500', etiqueta: 'Reprogramado' },
];

interface CabeceraNavegacionProps {
  /** Rótulo del período visible, ya resuelto por `etiquetaDePeriodo`. */
  etiqueta: string;
  onAnterior: () => void;
  onSiguiente: () => void;
  onHoy: () => void;
}

/**
 * Navegación entre períodos y leyenda de colores.
 *
 * Presentación pura: recibe el rótulo ya calculado y no sabe qué vista está
 * activa ni cuánto salta cada flecha. Esa aritmética vive en `model/navegacion`.
 */
export const CabeceraNavegacion = ({
  etiqueta,
  onAnterior,
  onSiguiente,
  onHoy,
}: CabeceraNavegacionProps) => (
  <Card className="p-4 border border-border bg-surface flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        onClick={onHoy}
        className="text-xs font-semibold hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm cursor-pointer"
      >
        Hoy
      </Button>
      <div className="flex items-center border border-border rounded-lg bg-surface shadow-sm overflow-hidden">
        <button
          onClick={onAnterior}
          className="p-2 text-slate-600 hover:bg-slate-50 transition-colors border-r border-border cursor-pointer"
          title="Anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={onSiguiente}
          className="p-2 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          title="Siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <h2 className="text-lg font-bold text-slate-800 tracking-tight pl-2">{etiqueta}</h2>
    </div>

    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      {LEYENDA.map(({ punto, etiqueta: texto }) => (
        <div key={texto} className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${punto} inline-block shadow-sm`}></span>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{texto}</span>
        </div>
      ))}
    </div>
  </Card>
);
