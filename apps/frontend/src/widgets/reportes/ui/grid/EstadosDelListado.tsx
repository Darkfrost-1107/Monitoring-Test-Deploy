import { AlertCircle } from 'lucide-react';
import { Card } from '@/shared/ui/card';
import { Spinner } from '@/shared/ui/Spinner';

/**
 * Los estados del listado de reportes que no muestran fichas.
 *
 * Fase 7 de PLAN_REMEDIACION.md.
 */

/** No hay fichas completadas que mostrar. */
export const SinReportes = () => (
  <Card className="text-center py-20 border border-dashed border-slate-200 bg-slate-50/50 rounded-xl">
    <AlertCircle className="h-12 w-12 text-slate-300 mx-auto stroke-1.5 mb-3" />
    <h3 className="text-slate-700 font-bold text-sm">Sin reportes registrados</h3>
    <p className="text-text-muted text-xs mt-1.5 max-w-xs mx-auto leading-relaxed">
      No existen fichas de monitoreo completadas hasta el momento. Completa visitas en el calendario
      para poblar esta sección.
    </p>
  </Card>
);

/**
 * La ficha de una visita se está trayendo, o no se pudo traer.
 *
 * Antes, mientras la ficha viajaba —y también si el viaje fallaba— se mostraba
 * una evaluación inventada: treinta y cinco aspectos marcados, todos los
 * niveles en III y IV y un párrafo de observaciones escrito a mano. El usuario
 * leía una ficha que nadie había llenado.
 */
export const FichaNoDisponible = ({
  cargando,
  onCerrar,
}: {
  cargando: boolean;
  onCerrar: () => void;
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
    onClick={onCerrar}
  >
    <Card
      className="max-w-sm w-full text-center py-10 px-6 bg-surface"
      onClick={(e) => e.stopPropagation()}
    >
      {cargando ? (
        <>
          <Spinner />
          <p className="text-sm text-text-muted mt-4">Cargando la ficha...</p>
        </>
      ) : (
        <>
          <AlertCircle className="h-10 w-10 text-slate-300 mx-auto stroke-1.5 mb-3" />
          <h3 className="text-slate-700 font-bold text-sm">No se encontró la ficha</h3>
          <p className="text-text-muted text-xs mt-1.5 leading-relaxed">
            Esta visita no tiene una ficha de monitoreo registrada, o no se pudo obtener del
            servidor. Intente nuevamente en unos momentos.
          </p>
        </>
      )}
    </Card>
  </div>
);
