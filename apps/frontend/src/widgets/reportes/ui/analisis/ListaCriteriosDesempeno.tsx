import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import type { IAnalisisDesempenoCriterio } from '@sistema-monitoreo/shared-contracts';

interface ListaCriteriosDesempenoProps {
  criterios: IAnalisisDesempenoCriterio[];
}

export const ListaCriteriosDesempeno = ({ criterios }: ListaCriteriosDesempenoProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            Detalle por Criterio / Desempeño Evaluado
          </h3>
          <p className="text-xs text-text-muted">
            Distribución detallada de calificaciones y porcentaje de logro docente por rúbrica.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {criterios.map((criterio) => {
          const esFavorable = criterio.tasaLogro >= 60;
          return (
            <Card
              key={criterio.desempenoId}
              className="p-4 border border-border bg-surface shadow-xs rounded-xl flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                {/* Cabecera idéntica al selector de la ficha */}
                <div className="flex items-start gap-3">
                  <span className="h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-xs font-black bg-primary text-white shadow-xs">
                    {criterio.orden}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 leading-snug">
                      {criterio.nombre}
                    </h4>
                    {criterio.descripcionCorta && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                        {criterio.descripcionCorta}
                      </p>
                    )}
                  </div>
                  {esFavorable ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  )}
                </div>

                {/* Métricas del Criterio */}
                <div className="mt-4 p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Promedio
                    </span>
                    <span className="text-sm font-black text-slate-800">
                      {criterio.promedio.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">/ 4.00</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Logro (III y IV)
                    </span>
                    <Badge
                      className={`text-[10px] font-black ${
                        esFavorable
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {criterio.tasaLogro}% Satisfactorio +
                    </Badge>
                  </div>
                </div>

                {/* Barra de Progreso Multitramo */}
                <div className="mt-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-600">
                    <span>Distribución de Docentes</span>
                    <span>{criterio.totalEvaluados} evaluados</span>
                  </div>

                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                    <div
                      style={{ width: `${criterio.porcentajeNivelI}%` }}
                      className="bg-red-500 transition-all"
                      title={`Nivel I: ${criterio.conteoNivelI} (${criterio.porcentajeNivelI}%)`}
                    />
                    <div
                      style={{ width: `${criterio.porcentajeNivelII}%` }}
                      className="bg-amber-500 transition-all"
                      title={`Nivel II: ${criterio.conteoNivelII} (${criterio.porcentajeNivelII}%)`}
                    />
                    <div
                      style={{ width: `${criterio.porcentajeNivelIII}%` }}
                      className="bg-blue-500 transition-all"
                      title={`Nivel III: ${criterio.conteoNivelIII} (${criterio.porcentajeNivelIII}%)`}
                    />
                    <div
                      style={{ width: `${criterio.porcentajeNivelIV}%` }}
                      className="bg-emerald-500 transition-all"
                      title={`Nivel IV: ${criterio.conteoNivelIV} (${criterio.porcentajeNivelIV}%)`}
                    />
                  </div>
                </div>

                {/* Leyenda de 4 niveles */}
                <div className="grid grid-cols-2 gap-1.5 mt-3 pt-3 border-t border-slate-100 text-[10px]">
                  <div className="flex items-center justify-between px-2 py-1 rounded bg-red-50/70 text-red-800">
                    <span className="font-semibold">Nivel I:</span>
                    <span className="font-black">{criterio.conteoNivelI} ({criterio.porcentajeNivelI}%)</span>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1 rounded bg-amber-50/70 text-amber-800">
                    <span className="font-semibold">Nivel II:</span>
                    <span className="font-black">{criterio.conteoNivelII} ({criterio.porcentajeNivelII}%)</span>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1 rounded bg-blue-50/70 text-blue-800">
                    <span className="font-semibold">Nivel III:</span>
                    <span className="font-black">{criterio.conteoNivelIII} ({criterio.porcentajeNivelIII}%)</span>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1 rounded bg-emerald-50/70 text-emerald-800">
                    <span className="font-semibold">Nivel IV:</span>
                    <span className="font-black">{criterio.conteoNivelIV} ({criterio.porcentajeNivelIV}%)</span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
