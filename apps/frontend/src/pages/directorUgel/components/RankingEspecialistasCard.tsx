import { Award } from 'lucide-react';
import { Card } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';
import type { IUgelDashboardEspecialistaRanking } from '@sistema-monitoreo/shared-contracts';

interface Props {
  items: IUgelDashboardEspecialistaRanking[];
}

const iniciales = (nombre: string) =>
  nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

/** Color del promedio según el baremo (crítico/proceso/logro). */
const promedioColor = (p: number) =>
  p === 0
    ? 'text-text-muted'
    : p <= 1.5
      ? 'text-destructive'
      : p <= 2.5
        ? 'text-amber-600'
        : 'text-green-600';

/** Ranking de especialistas por cantidad de monitoreos realizados. */
export const RankingEspecialistasCard = ({ items }: Props) => {
  const maxMonitoreos = Math.max(1, ...items.map((e) => e.monitoreos));

  return (
    <Card className="p-5 border-border shadow-xs h-full flex flex-col">
      <h3 className="text-lg font-bold flex items-center gap-2 mb-4 shrink-0">
        <Award className="w-5 h-5 text-primary" /> Especialistas más activos
      </h3>

      {items.length === 0 ? (
        <div className="py-8 text-center text-sm text-text-muted">
          Sin monitoreos registrados en el año.
        </div>
      ) : (
        <ul className="flex flex-col gap-3 max-h-[340px] overflow-y-auto pr-1 -mr-1">
          {items.map((e, i) => (
            <li key={e.especialistaId} className="flex items-center gap-3">
              <span className="w-5 text-sm font-bold text-text-muted tabular-nums">{i + 1}</span>
              <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">
                {iniciales(e.nombre)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{e.nombre}</div>
                <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(e.monitoreos / maxMonitoreos) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="text-sm font-extrabold tabular-nums">{e.monitoreos}</span>
                <Badge variant="secondary" className={`text-[10px] font-bold ${promedioColor(e.promedio)}`}>
                  {e.promedio.toFixed(1)}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
