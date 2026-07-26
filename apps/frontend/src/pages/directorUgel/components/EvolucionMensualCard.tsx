import { TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@shared/ui/card';
import type { IUgelDashboardEvolucionMes } from '@sistema-monitoreo/shared-contracts';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

interface Props {
  items: IUgelDashboardEvolucionMes[];
}

/** Evolución mensual de monitoreos finalizados en el año (área). */
export const EvolucionMensualCard = ({ items }: Props) => {
  const data = items.map((m) => ({ mes: MESES[m.mes - 1] ?? String(m.mes), monitoreos: m.monitoreos }));
  const total = items.reduce((acc, m) => acc + m.monitoreos, 0);

  return (
    <Card className="p-5 border-border shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" /> Evolución de monitoreos
        </h3>
        <span className="text-xs text-text-muted">{total} en el año</span>
      </div>

      {total === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-sm text-text-muted">
          Sin monitoreos finalizados en el año.
        </div>
      ) : (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="evolFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary, #be123c)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-primary, #be123c)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
              <Tooltip
                formatter={(v) => {
                  const n = Number(v);
                  return [`${n} monitoreo${n === 1 ? '' : 's'}`, ''] as [string, string];
                }}
                labelFormatter={(l) => `Mes: ${l}`}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
              <Area
                type="monotone"
                dataKey="monitoreos"
                stroke="var(--color-primary, #be123c)"
                strokeWidth={2}
                fill="url(#evolFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};
