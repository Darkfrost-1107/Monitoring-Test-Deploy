import { History } from 'lucide-react';
import { Card } from '@shared/ui/card';
import { nivelLogroUi } from '@features/dashboard';
import { formatearFechaCorta } from '@shared/lib/fecha/fecha';
import type { IDirectorDashboardMonitoreoReciente } from '@sistema-monitoreo/shared-contracts';

/** Color de la pastilla de nivel según la variante. */
const PASTILLA: Record<string, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  destructive: 'bg-red-50 text-red-700 border-red-200',
  secondary: 'bg-slate-100 text-slate-600 border-slate-200',
  default: 'bg-slate-50 text-slate-600 border-slate-200',
};

interface ActividadRecienteProps {
  recientes: IDirectorDashboardMonitoreoReciente[];
  limite?: number;
}

export const ActividadReciente = ({ recientes, limite = 20 }: ActividadRecienteProps) => {
  const visibles = recientes.slice(0, limite);

  return (
    <Card className="shadow-xs border-border flex flex-col h-full overflow-hidden">
      <div className="p-4 flex items-center gap-2 border-b border-border bg-card">
        <History className="h-4.5 w-4.5 text-primary" />
        <h3 className="text-lg font-bold">Actividad Reciente</h3>
      </div>

      {visibles.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-400">
          Aún no hay monitoreos finalizados.
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border/50 overflow-y-auto flex-1 min-h-0">
          {visibles.map((m) => {
            const ui = m.nivelLogro ? nivelLogroUi(m.nivelLogro) : null;
            const clasePastilla = m.esInformativo
              ? PASTILLA.secondary
              : PASTILLA[ui?.variant ?? 'default'] ?? PASTILLA.default;
            return (
              <div key={m.fichaId} className="flex items-center gap-3 px-5 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-700 text-sm leading-tight truncate">
                    {m.docenteNombre}
                  </p>
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    {formatearFechaCorta(m.fecha)}
                  </span>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shrink-0 ${clasePastilla}`}
                >
                  {m.esInformativo ? (
                    'Informativo'
                  ) : (
                    <>
                      <span className="tabular-nums font-black">{m.promedio?.toFixed(1)}</span>
                      <span className="opacity-30">·</span>
                      {ui?.label}
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
