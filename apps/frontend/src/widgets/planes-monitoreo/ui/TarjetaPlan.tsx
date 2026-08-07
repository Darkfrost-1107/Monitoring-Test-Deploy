import { FileText } from 'lucide-react';
import type { IMonitoringPlanResponse } from '@sistema-monitoreo/shared-contracts';
import { Card, CardContent } from '@shared/ui/card';
import { formatearFechaAbreviada } from '@shared/lib/fecha/fecha';
import { descripcionDelAutor } from '@features/planes-monitoreo/lib/autor-plan';
import {
  claseSegunEstado,
  type AccionesSobrePlan,
} from '@features/planes-monitoreo/lib/vista-planes';
import { AccionesPlan } from './AccionesPlan';
import { EtiquetaEntidad, EtiquetaEstado } from './EtiquetasPlan';

/**
 * Un plan de monitoreo, en la vista de cuadrícula.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Eran ciento diez líneas dentro del `map` de
 * `PlanMonitoreoAnualPage`.
 */

interface TarjetaPlanProps extends AccionesSobrePlan {
  plan: IMonitoringPlanResponse;
}

export const TarjetaPlan = ({ plan, ...acciones }: TarjetaPlanProps) => {
  const autor = descripcionDelAutor(plan.rolAutorAlCrear, plan.autorNombre);

  return (
    <Card
      className={`border border-border/80 shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden flex ${claseSegunEstado(plan.estado)}`}
    >
      <CardContent className="p-4 w-full flex gap-4 items-start">
        <div className="w-[95px] h-[115px] bg-muted/40 border border-border/80 rounded-xl flex flex-col items-center justify-center gap-1.5 shrink-0 select-none">
          <FileText className="w-9 h-9 text-destructive/80" />
          <span className="text-[9px] font-extrabold tracking-wider text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
            PDF
          </span>
        </div>

        <div className="flex-1 flex flex-col min-w-0 min-h-[115px] gap-0.5">
          <div className="flex items-center gap-2 mb-1 shrink-0">
            <span className="text-xs font-bold text-text-muted">{plan.anioAcademico}</span>
            <EtiquetaEntidad tipoEntidad={plan.tipoEntidad} />
            <EtiquetaEstado estado={plan.estado} />
          </div>

          <h4 className="text-sm font-bold text-text leading-snug line-clamp-2" title={plan.titulo}>
            {plan.titulo}
          </h4>

          <span className="text-[11px] text-text-muted shrink-0">
            Registrado: {formatearFechaAbreviada(plan.createdAt, '—')}
          </span>
          {autor && (
            <span className="text-[11px] text-text-muted shrink-0">
              Subido por: <span className="font-semibold text-text">{autor}</span>
            </span>
          )}

          <div className="flex items-center gap-2 mt-2.5 shrink-0">
            <AccionesPlan activo={plan.estado === 'Activo'} compacto {...acciones} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
