import { Card } from '@shared/ui/card';
import { MapPin } from 'lucide-react';
import type { IUgelDashboardDistrito } from '@sistema-monitoreo/shared-contracts';

const barColor = (pct: number) => {
  if (pct < 40) return 'bg-destructive';
  if (pct < 75) return 'bg-amber-500';
  return 'bg-green-500';
};

/** Color del promedio (nivel de logro) según el baremo. */
const nivelPill = (prom: number) => {
  if (prom === 0) return 'bg-muted text-text-muted';
  if (prom <= 1.5) return 'bg-destructive/10 text-destructive';
  if (prom <= 2.5) return 'bg-amber-500/10 text-amber-600';
  return 'bg-green-500/10 text-green-600';
};

interface CoberturaDistritoCardProps {
  items: IUgelDashboardDistrito[];
  selected?: string | null;
  onSelect?: (distrito: string | null) => void;
}

export const CoberturaDistritoCard = ({ items, selected, onSelect }: CoberturaDistritoCardProps) => {
  const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().trim();
  const selNorm = selected ? norm(selected) : null;
  return (
    <Card className="p-5 border-border shadow-xs">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-text-muted" />
        <h3 className="text-lg font-bold">Cobertura y nivel por distrito</h3>
        <span className="ml-auto text-xs text-text-muted">menor cobertura primero</span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-text-muted py-4 text-center">Sin datos de distritos.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((d) => {
            const isSel = selNorm === norm(d.distrito);
            return (
            <div
              key={d.distrito}
              onClick={() => onSelect?.(isSel ? null : d.distrito)}
              className={`flex items-center gap-3 rounded-md px-1 py-0.5 -mx-1 transition-colors ${
                onSelect ? 'cursor-pointer hover:bg-muted/60' : ''
              } ${isSel ? 'bg-muted' : ''}`}
            >
              <div className="w-32 shrink-0 text-sm font-medium truncate">{d.distrito}</div>
              <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${barColor(d.porcentajeCobertura)}`}
                  style={{ width: `${d.porcentajeCobertura}%` }}
                />
              </div>
              <span
                className={`shrink-0 text-[11px] font-bold px-1.5 py-0.5 rounded-md tabular-nums ${nivelPill(d.nivelPromedio)}`}
                title="Nivel promedio de logro del distrito"
              >
                {d.nivelPromedio > 0 ? d.nivelPromedio.toFixed(1) : '—'}
              </span>
              <div className="w-24 shrink-0 text-right text-xs text-text-muted tabular-nums">
                <span className="font-bold text-text">{d.porcentajeCobertura}%</span> ({d.monitoreadas}/
                {d.totalInstituciones})
              </div>
            </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
