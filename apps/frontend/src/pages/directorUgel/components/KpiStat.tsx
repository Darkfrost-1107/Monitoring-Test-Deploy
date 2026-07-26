import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@shared/ui/card';

type Tone = 'neutral' | 'success' | 'warning' | 'danger';

const toneText: Record<Tone, string> = {
  neutral: 'text-text',
  success: 'text-green-600',
  warning: 'text-amber-600',
  danger: 'text-destructive',
};
const toneBg: Record<Tone, string> = {
  neutral: 'bg-muted text-text-muted',
  success: 'bg-green-500/10 text-green-600',
  warning: 'bg-amber-500/10 text-amber-600',
  danger: 'bg-destructive/10 text-destructive',
};

/** Tendencia opcional (p. ej. cobertura vs. año anterior). */
interface Trend {
  /** Variación (positivo = mejora). */
  delta: number;
  /** Texto de referencia, p. ej. "vs. 2025". */
  label: string;
  /** Sufijo del valor, p. ej. "pts". */
  unit?: string;
}

interface KpiStatProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: ReactNode;
  tone?: Tone;
  trend?: Trend;
}

const TrendPill = ({ delta, label, unit }: Trend) => {
  const up = delta > 0;
  const down = delta < 0;
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
  const color = up ? 'text-green-600' : down ? 'text-destructive' : 'text-text-muted';
  const signo = up ? '+' : '';
  return (
    <div className={`mt-0.5 flex items-center gap-1 text-[11px] font-semibold ${color}`}>
      <Icon className="w-3 h-3" />
      <span>
        {signo}
        {delta}
        {unit ? ` ${unit}` : ''}
      </span>
      <span className="text-text-muted font-normal">{label}</span>
    </div>
  );
};

export const KpiStat = ({ label, value, sub, icon, tone = 'neutral', trend }: KpiStatProps) => (
  <Card className="p-4 border-border shadow-xs flex items-center gap-3">
    <div className={`p-2.5 rounded-lg shrink-0 ${toneBg[tone]}`}>{icon}</div>
    <div className="min-w-0">
      <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted truncate">
        {label}
      </div>
      <div className={`text-2xl font-extrabold leading-tight ${toneText[tone]}`}>{value}</div>
      {trend ? <TrendPill {...trend} /> : sub && <div className="text-xs text-text-muted truncate">{sub}</div>}
    </div>
  </Card>
);
