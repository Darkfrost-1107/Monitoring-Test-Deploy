import { useNavigate } from 'react-router-dom';
import { Trophy, ChevronRight } from 'lucide-react';
import { Card } from '@shared/ui/card';
import { Avatar, AvatarFallback } from '@shared/ui/avatar';
import { nivelLogroUi, iniciales } from '@features/dashboard';
import type { IDirectorDashboardFoco } from '@sistema-monitoreo/shared-contracts';

interface DocentesDestacadosProps {
  destacados: IDirectorDashboardFoco[];
  limite?: number;
}

export const DocentesDestacados = ({ destacados, limite = 20 }: DocentesDestacadosProps) => {
  const navigate = useNavigate();
  const visibles = destacados.slice(0, limite);

  return (
    <Card className="shadow-xs border-border flex flex-col h-full overflow-hidden">
      <div className="p-4 flex items-center gap-2 border-b border-border bg-card">
        <Trophy className="h-4.5 w-4.5 text-emerald-500" />
        <h3 className="text-lg font-bold">Destacados</h3>
      </div>

      {visibles.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-400">
          Todavía no hay docentes en logro previsto.
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border/50 overflow-y-auto flex-1 min-h-0">
          {visibles.map((d) => {
            const ui = nivelLogroUi(d.nivelLogro);
            return (
              <button
                key={d.docenteId}
                type="button"
                onClick={() => navigate(`/instituciones/docentes/${d.docenteId}`)}
                className="group flex items-center gap-3 px-5 py-2.5 text-left hover:bg-emerald-500/[0.04] transition-colors cursor-pointer"
              >
                <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-emerald-500" />
                <Avatar className="w-8 h-8 bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600 ring-1 ring-emerald-200 shrink-0">
                  <AvatarFallback className="text-[10px] font-black bg-transparent">
                    {iniciales(d.docenteNombre)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 text-sm leading-tight truncate">
                    {d.docenteNombre}
                  </p>
                  <span className="inline-flex items-center gap-1 mt-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                    <span className="tabular-nums font-black">{d.promedio.toFixed(1)}</span>
                    <span className="opacity-30">·</span>
                    {ui.label}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-600 transition-colors shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
};
