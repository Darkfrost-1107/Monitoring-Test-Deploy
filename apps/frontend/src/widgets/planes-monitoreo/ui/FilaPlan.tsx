import { FileText } from 'lucide-react';
import type { IMonitoringPlanResponse } from '@sistema-monitoreo/shared-contracts';
import { Card, CardContent } from '@shared/ui/card';
import { formatearFechaAbreviada } from '@shared/lib/fecha/fecha';
import { descripcionDelAutor } from '@features/planes-monitoreo/lib/autor-plan';
import { AccionesPlan } from './AccionesPlan';
import { EtiquetaEntidad, EtiquetaEstado } from './EtiquetasPlan';
import {
  claseSegunEstado,
  type AccionesSobrePlan,
} from '@features/planes-monitoreo/lib/vista-planes';

/**
 * Un plan de monitoreo, en la vista de lista.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Eran ciento quince líneas dentro del segundo
 * `map` de `PlanMonitoreoAnualPage`, con las acciones copiadas de la vista de
 * cuadrícula.
 */

const Separador = () => <span className="w-1 h-1 rounded-full bg-border" />;

interface FilaPlanProps extends AccionesSobrePlan {
  plan: IMonitoringPlanResponse;
}

export const FilaPlan = ({ plan, ...acciones }: FilaPlanProps) => {
  const autor = descripcionDelAutor(plan.rolAutorAlCrear, plan.autorNombre);

  return (
    <Card
      className={`border border-border/80 shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden ${claseSegunEstado(plan.estado)}`}
    >
      <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-12 bg-muted/40 border border-border/80 rounded-xl flex flex-col items-center justify-center shrink-0 select-none">
            <FileText className="w-5 h-5 text-destructive/80" />
          </div>

          <div className="min-w-0">
            <h4
              className="text-sm font-bold text-text truncate max-w-[280px] sm:max-w-[400px] md:max-w-[550px] lg:max-w-[700px] leading-snug"
              title={plan.titulo}
            >
              {plan.titulo}
            </h4>
            <div className="flex flex-wrap items-center gap-2.5 mt-1 text-[11px] text-text-muted">
              <span className="font-bold">{plan.anioAcademico}</span>
              <Separador />
              <EtiquetaEntidad tipoEntidad={plan.tipoEntidad} compacta />
              <Separador />
              <EtiquetaEstado estado={plan.estado} compacta />
              <Separador />
              <span>Registrado: {formatearFechaAbreviada(plan.createdAt, '—')}</span>
              {autor && (
                <>
                  <Separador />
                  <span>
                    Subido por: <span className="font-semibold text-text">{autor}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <AccionesPlan activo={plan.estado === 'Activo'} {...acciones} />
        </div>
      </CardContent>
    </Card>
  );
};
