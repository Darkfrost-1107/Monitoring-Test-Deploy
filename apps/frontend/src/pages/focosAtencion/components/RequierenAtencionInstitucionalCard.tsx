import { Card } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { IUgelDashboardCriticaIe } from '@sistema-monitoreo/shared-contracts';
import { NotificarInstitucionDialog } from '@features/notifications';
import { SolicitarVisitaButton } from '@features/visit-requests';

interface Props {
  items: IUgelDashboardCriticaIe[];
  distritoFiltrado?: string | null;
  onLimpiarDistrito?: () => void;
}

/**
 * "Requieren atención" en versión detallada por institución: lista las II.EE.
 * con sus docentes/directivos en nivel crítico (INICIO) y las acciones de
 * notificar y solicitar visita por cada uno. Usado por el módulo Focos de Atención.
 */
export const RequierenAtencionInstitucionalCard = ({
  items,
  distritoFiltrado,
  onLimpiarDistrito,
}: Props) => {
  const totalDocentes = items.reduce((acc, ie) => acc + ie.docentes.length, 0);

  return (
    <Card className="flex flex-col h-full border-border shadow-xs overflow-hidden">
      <div className="p-4 border-b border-border flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
          <h3 className="text-lg font-bold">Requieren atención</h3>
        </div>
        {distritoFiltrado && (
          <Badge
            variant="outline"
            className="text-[10px] font-bold text-slate-600 uppercase border-slate-300"
          >
            {distritoFiltrado}
          </Badge>
        )}
        {totalDocentes > 0 && (
          <Badge variant="destructive" className="ml-auto font-bold">
            {totalDocentes}
          </Badge>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 p-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
          <p className="text-sm text-text-muted">
            {distritoFiltrado
              ? `Ningún docente en nivel crítico en ${distritoFiltrado}.`
              : 'Ningún docente en nivel crítico. Buen trabajo.'}
          </p>
          {distritoFiltrado && onLimpiarDistrito && (
            <button
              type="button"
              onClick={onLimpiarDistrito}
              className="text-xs text-primary font-bold hover:underline mt-2 cursor-pointer"
            >
              Ver todos los distritos
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0 divide-y divide-border overflow-y-auto">
          {items.map((ie) => (
            <div key={ie.institucionId} className="px-4 py-3">
              {/* Encabezado de la IE */}
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold truncate">{ie.nombre}</div>
                  <div className="text-[11px] text-text-muted uppercase tracking-wide">
                    {ie.distrito} · {ie.nivelEducativo}
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px] font-bold shrink-0">
                  {ie.docentes.length} crítico{ie.docentes.length > 1 ? 's' : ''}
                </Badge>
              </div>

              {/* Docentes críticos de la IE */}
              <ul className="mt-2 flex flex-col gap-2">
                {ie.docentes.map((d) => (
                  <li
                    key={d.docenteId}
                    className="rounded-lg bg-destructive/5 px-3 py-2 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">{d.nombre}</span>
                        <Badge variant="outline" className="text-[9px] uppercase shrink-0">
                          {d.cargo}
                        </Badge>
                        {d.especialidad && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] uppercase shrink-0 font-semibold"
                          >
                            {d.especialidad}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3">
                        <NotificarInstitucionDialog
                          institucionId={ie.institucionId}
                          institucionNombre={ie.nombre}
                          docenteId={d.docenteId}
                          docenteNombre={d.nombre}
                        />
                        <SolicitarVisitaButton
                          institucionId={ie.institucionId}
                          institucionNombre={ie.nombre}
                          docenteId={d.docenteId}
                          docenteNombre={d.nombre}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-lg font-extrabold text-destructive tabular-nums leading-none">
                        {d.promedio.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-text-muted font-medium whitespace-nowrap mt-1">
                        {d.monitoreosCompletados} monitoreo{d.monitoreosCompletados === 1 ? '' : 's'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
