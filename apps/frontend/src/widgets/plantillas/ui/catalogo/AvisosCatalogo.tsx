import { FileText } from 'lucide-react';
import { Button } from '@shared/ui/button';

/**
 * Los estados sin tarjetas del catálogo: error de carga, avisos y vacío.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Estaban intercalados entre la barra de filtros
 * y la grilla de `PlantillasCatalog`.
 */

/** No se pudo traer el listado. */
export const ErrorDeCarga = ({ error, onReintentar }: { error: unknown; onReintentar: () => void }) => (
  <div className="text-center py-12 border border-rose-200 rounded-2xl bg-rose-50/50">
    <p className="text-rose-700 font-semibold text-sm">
      No se pudieron cargar las plantillas: {error instanceof Error ? error.message : 'Error desconocido'}
    </p>
    <Button variant="outline" onClick={onReintentar} className="mt-3 text-xs">
      Reintentar
    </Button>
  </div>
);

/** Resultado de la última acción, descartable por el usuario. */
export const AvisoDeAccion = ({
  mensaje,
  tono,
  onCerrar,
}: {
  mensaje: string;
  tono: 'error' | 'exito';
  onCerrar: () => void;
}) => {
  const esError = tono === 'error';

  return (
    <div
      className={`p-4 border rounded-lg mb-4 flex justify-between items-start ${
        esError ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'
      }`}
    >
      <p className={`text-sm font-semibold ${esError ? 'text-rose-700' : 'text-emerald-700'}`}>
        {mensaje}
      </p>
      <button
        onClick={onCerrar}
        aria-label="Cerrar aviso"
        className={esError ? 'text-rose-500 hover:text-rose-700' : 'text-emerald-500 hover:text-emerald-700'}
      >
        ✕
      </button>
    </div>
  );
};

/** No hay plantillas que mostrar con los filtros puestos. */
export const CatalogoVacio = () => (
  <div className="text-center py-24 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
    <FileText className="h-14 w-14 text-slate-300 mx-auto stroke-1 mb-4" />
    <h3 className="text-slate-700 font-bold text-base">No se encontraron plantillas</h3>
    <p className="text-text-muted text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
      No existen plantillas de monitoreo que coincidan con los filtros seleccionados en este
      momento. Intente modificando los parámetros.
    </p>
  </div>
);
