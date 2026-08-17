import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '@/shared/ui/card';
import type { IAnalisisDesempenoCriterio } from '@sistema-monitoreo/shared-contracts';

interface GraficoComparativoCriteriosProps {
  criterios: IAnalisisDesempenoCriterio[];
}

export const GraficoComparativoCriterios = ({
  criterios,
}: GraficoComparativoCriteriosProps) => {
  const data = criterios.map((c) => ({
    criterio: `Criterio ${c.orden}`,
    nombreCompleto: c.nombre,
    'Nivel I (Inicio)': c.conteoNivelI,
    'Nivel II (Proceso)': c.conteoNivelII,
    'Nivel III (Satisfactorio)': c.conteoNivelIII,
    'Nivel IV (Destacado)': c.conteoNivelIV,
    promedio: c.promedio,
    total: c.totalEvaluados,
  }));

  return (
    <Card className="p-5 border border-border shadow-xs bg-surface flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="text-sm font-bold text-text">Distribución por Criterio / Desempeño</h3>
          <span className="text-xs text-text-muted">Rúbricas de Observación de Aula</span>
        </div>
        <p className="text-xs text-text-muted mb-4">
          Comparativa de docentes según el nivel de logro alcanzado en cada desempeño evaluado.
        </p>

        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border, #e2e8f0)" />
              <XAxis
                dataKey="criterio"
                tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-white p-3 rounded-xl border border-border shadow-lg text-xs space-y-1.5 max-w-xs">
                        <div className="font-extrabold text-slate-800">{label}: {item.nombreCompleto}</div>
                        <div className="text-[11px] font-bold text-primary pb-1 border-b border-border">
                          Promedio del Criterio: {item.promedio} pts
                        </div>
                        {payload.map((entry) => (
                          <div
                            key={entry.name}
                            className="flex items-center justify-between gap-4 text-[11px]"
                          >
                            <span style={{ color: entry.color }} className="font-semibold">
                              {entry.name}:
                            </span>
                            <span className="font-bold text-slate-900">{entry.value} docentes</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="Nivel I (Inicio)" fill="#ef4444" stackId="a" />
              <Bar dataKey="Nivel II (Proceso)" fill="#f59e0b" stackId="a" />
              <Bar dataKey="Nivel III (Satisfactorio)" fill="#3b82f6" stackId="a" />
              <Bar dataKey="Nivel IV (Destacado)" fill="#10b981" stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-border mt-3 text-center">
        <div className="p-2 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
          🔴 Nivel I: En Inicio
        </div>
        <div className="p-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
          🟡 Nivel II: En Proceso
        </div>
        <div className="p-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
          🔵 Nivel III: Satisfactorio
        </div>
        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
          🟢 Nivel IV: Destacado
        </div>
      </div>
    </Card>
  );
};
