import { Award, AlertTriangle, TrendingUp, BookOpen, ArrowUpRight } from 'lucide-react';
import type { AnalisisDesempenoCompleto } from '@/features/reportes/lib/analisis-desempeno';
import type { IAnalisisDesempenoCriterio } from '@sistema-monitoreo/shared-contracts';

interface KpisCriteriosProps {
  analisis: AnalisisDesempenoCompleto;
  /** Ir al detalle de un criterio (los KPIs que apuntan a uno son clickeables). */
  onIrACriterio?: (desempenoId: string) => void;
  /**
   * El instrumento EIB es informativo: no produce una nota promedio, así que se
   * omite ese KPI y quedan los de distribución (dominio y foco).
   */
  esInformativo?: boolean;
}

/** Tarjeta de KPI que apunta a un criterio: clickeable si hay a dónde ir. */
const KpiDeCriterio = ({
  etiqueta,
  criterio,
  valor,
  colorIcono,
  colorValor,
  icono,
  onIr,
}: {
  etiqueta: string;
  criterio: IAnalisisDesempenoCriterio | null;
  valor: string;
  colorIcono: string;
  colorValor: string;
  icono: React.ReactNode;
  onIr?: (desempenoId: string) => void;
}) => {
  const clickeable = !!criterio && !!onIr;
  const contenido = (
    <>
      <div className={`p-3.5 rounded-xl shrink-0 ${colorIcono}`}>{icono}</div>
      <div className="min-w-0 flex-1">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block truncate">
          {etiqueta}
        </span>
        <div className="flex items-baseline gap-1.5 mt-0.5 leading-none">
          <span className={`text-xl font-black ${colorValor}`}>{valor}</span>
          {criterio && (
            <span className={`text-[11px] font-bold ${colorValor}`}>(Crit. {criterio.orden})</span>
          )}
        </div>
        <span
          className="text-[10px] text-slate-500 font-medium block mt-1.5 truncate"
          title={criterio ? `Criterio ${criterio.orden}: ${criterio.nombre}` : undefined}
        >
          {criterio ? criterio.nombre : 'Sin evaluaciones'}
        </span>
      </div>
      {clickeable && (
        <ArrowUpRight className="absolute top-3 right-3 h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
      )}
    </>
  );

  const clases =
    'p-4 rounded-xl border border-border bg-surface flex flex-row items-center gap-4 shadow-xs relative overflow-hidden group transition-shadow min-w-0';

  if (clickeable) {
    return (
      <button
        type="button"
        onClick={() => onIr!(criterio!.desempenoId)}
        title="Ver el detalle de este criterio"
        className={`${clases} w-full text-left cursor-pointer hover:shadow hover:border-primary/40`}
      >
        {contenido}
      </button>
    );
  }
  return <div className={`${clases} hover:shadow`}>{contenido}</div>;
};

export const KpisCriterios = ({ analisis, onIrACriterio, esInformativo }: KpisCriteriosProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* KPI 1: Monitoreos analizados (no apunta a un criterio, no es navegable) */}
      <div className="p-4 rounded-xl border border-border bg-surface flex flex-row items-center gap-4 shadow-xs relative overflow-hidden hover:shadow transition-shadow min-w-0">
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 shrink-0">
          <BookOpen className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block truncate">
            Monitoreos Analizados
          </span>
          <span className="text-xl font-black text-slate-800 block mt-0.5 leading-none">
            {analisis.totalEvaluaciones}
          </span>
          <span className="text-[10px] text-slate-400 font-semibold block mt-1.5 truncate">
            fichas docentes completadas
          </span>
        </div>
      </div>

      {/* KPI 2: Promedio Rúbricas (no navegable). El EIB es informativo: no tiene
          nota promedio, así que se omite. */}
      {!esInformativo && (
        <div className="p-4 rounded-xl border border-border bg-surface flex flex-row items-center gap-4 shadow-xs relative overflow-hidden hover:shadow transition-shadow min-w-0">
          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block truncate">
              Promedio Rúbricas
            </span>
            <span className="text-xl font-black text-slate-800 block mt-0.5 leading-none">
              {analisis.promedioGeneral.toFixed(2)}
            </span>
            <span className="text-[10px] text-indigo-600 font-semibold block mt-1.5 truncate">
              escala de rúbrica (1 a 4)
            </span>
          </div>
        </div>
      )}

      {/* KPI 3: Mayor Dominio (navega a ese criterio) */}
      <KpiDeCriterio
        etiqueta="Mayor Dominio"
        criterio={analisis.criterioMayorDominio}
        valor={analisis.criterioMayorDominio ? `${analisis.criterioMayorDominio.tasaLogro}%` : '—'}
        colorIcono="bg-emerald-50 border border-emerald-100 text-emerald-600"
        colorValor="text-emerald-700"
        icono={<Award className="h-5 w-5" />}
        onIr={onIrACriterio}
      />

      {/* KPI 4: Foco Prioritario (navega a ese criterio) */}
      <KpiDeCriterio
        etiqueta="Foco Prioritario"
        criterio={analisis.criterioMayorRefuerzo}
        valor={
          analisis.criterioMayorRefuerzo ? `${analisis.criterioMayorRefuerzo.tasaRefuerzo}%` : '—'
        }
        colorIcono="bg-amber-50 border border-amber-100 text-amber-600"
        colorValor="text-amber-700"
        icono={<AlertTriangle className="h-5 w-5" />}
        onIr={onIrACriterio}
      />
    </div>
  );
};
