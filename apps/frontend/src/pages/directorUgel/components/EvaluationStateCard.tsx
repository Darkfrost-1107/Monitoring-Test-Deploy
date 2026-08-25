import { Card } from '@shared/ui/card';

export interface EvaluationStateData {
  /** Docentes/IEs en situación crítica (nivel INICIO). */
  critico: number;
  /** En seguimiento (nivel EN_PROCESO). */
  enProceso: number;
  /** Logro previsto (LOGRO_ESPERADO + LOGRO_DESTACADO). */
  logroPrevisto: number;
  /** Cobertura actual de monitoreo, en porcentaje (0 a 100). */
  coberturaActual?: number;
  /** Meta de cobertura, en porcentaje (por defecto 100). */
  meta?: number;
}

// Valores por defecto (dashboard UGEL, aún sin datos reales conectados).
const DEFAULT_DATA: EvaluationStateData = {
  critico: 15,
  enProceso: 45,
  logroPrevisto: 60,
  coberturaActual: 23.8,
  meta: 100,
};

const pct = (part: number, total: number) => (total > 0 ? (part / total) * 100 : 0);

/**
 * Resumen de evaluación: la distribución de niveles como una sola barra apilada
 * con su leyenda, y la cobertura como una barra de avance. Es el «vistazo» que
 * acompaña a la lista accionable de Focos de Atención.
 */
export const EvaluationStateCard = ({ data }: { data?: EvaluationStateData }) => {
  const { critico, enProceso, logroPrevisto, coberturaActual, meta } = data ?? DEFAULT_DATA;
  const total = critico + enProceso + logroPrevisto;

  const filas = [
    { key: 'logro', label: 'Logro previsto', count: logroPrevisto, dot: 'bg-emerald-500' },
    { key: 'proceso', label: 'En seguimiento', count: enProceso, dot: 'bg-amber-500' },
    { key: 'critico', label: 'Situación crítica', count: critico, dot: 'bg-red-500' },
  ];

  return (
    <Card className="p-4 border-border shadow-xs flex flex-col gap-4 h-full overflow-y-auto">
      <h3 className="text-lg font-bold">Estado de Evaluación</h3>

      {/* Distribución de niveles: una barra apilada dice la proporción de un vistazo. */}
      <div>
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
          Distribución de niveles
        </span>
        <div className="mt-2 h-3 w-full rounded-full overflow-hidden flex bg-slate-100">
          {total > 0 && (
            <>
              <div className="h-full bg-emerald-500" style={{ width: `${pct(logroPrevisto, total)}%` }} />
              <div className="h-full bg-amber-500" style={{ width: `${pct(enProceso, total)}%` }} />
              <div className="h-full bg-red-500" style={{ width: `${pct(critico, total)}%` }} />
            </>
          )}
        </div>
        <ul className="mt-3.5 space-y-2.5">
          {filas.map((f) => (
            <li key={f.key} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-600">
                <span className={`h-2 w-2 rounded-full ${f.dot}`} />
                {f.label}
              </span>
              <span className="font-black text-slate-800 tabular-nums">{f.count}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Cobertura de monitoreo: avance sobre la meta, separado de la distribución. */}
      <div className="mt-auto pt-4 border-t border-border/60">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            Cobertura
          </span>
          <span className="text-sm font-black text-slate-800 tabular-nums">
            {Math.round(coberturaActual ?? 0)}%
          </span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${Math.min(coberturaActual ?? 0, 100)}%` }}
          />
        </div>
        <div className="mt-1.5 text-[10px] text-slate-400 font-semibold text-right">
          meta {meta ?? 100}%
        </div>
      </div>
    </Card>
  );
};
