import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight, ShieldCheck } from 'lucide-react';
import { Card } from '@shared/ui/card';
import { Avatar, AvatarFallback } from '@shared/ui/avatar';
import { nivelLogroUi, iniciales } from '@features/dashboard';
import type { IDirectorDashboardFoco } from '@sistema-monitoreo/shared-contracts';

/** Color del punto y de la pastilla del nivel de un foco. */
const ESTILO_NIVEL: Record<string, { punto: string; pastilla: string }> = {
  INICIO: { punto: 'bg-red-500', pastilla: 'bg-red-50 text-red-700 border-red-200' },
  EN_PROCESO: { punto: 'bg-amber-500', pastilla: 'bg-amber-50 text-amber-700 border-amber-200' },
};

interface FocosDeAtencionProps {
  focos: IDirectorDashboardFoco[];
  /** Máximo de docentes a listar; el resto se resume en un pie. */
  limite?: number;
}

export const FocosDeAtencion = ({ focos, limite = 20 }: FocosDeAtencionProps) => {
  const navigate = useNavigate();
  const visibles = focos.slice(0, limite);
  const restantes = focos.length - visibles.length;

  return (
    <Card className="shadow-xs border-border flex flex-col h-full overflow-hidden">
      <div className="p-4 flex justify-between items-center border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
          <h3 className="text-lg font-bold">Focos de Atención</h3>
        </div>
        {focos.length > 0 && (
          <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-red-50 text-red-600 text-xs font-black">
            {focos.length}
          </span>
        )}
      </div>

      {focos.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-10 text-center">
          <div className="p-3.5 rounded-full bg-emerald-50 border border-emerald-100">
            <ShieldCheck className="h-7 w-7 text-emerald-600" />
          </div>
          <p className="text-sm font-bold text-slate-700">Sin focos de atención</p>
          <p className="text-xs text-slate-400 max-w-xs">
            Ningún docente monitoreado quedó en situación crítica ni en seguimiento. ¡Buen trabajo!
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border/50 overflow-y-auto flex-1 min-h-0">
          {visibles.map((foco) => {
            const ui = nivelLogroUi(foco.nivelLogro);
            const estilo = ESTILO_NIVEL[foco.nivelLogro] ?? ESTILO_NIVEL.EN_PROCESO;
            return (
              <button
                key={foco.docenteId}
                type="button"
                onClick={() => navigate(`/instituciones/docentes/${foco.docenteId}`)}
                className="group flex items-center gap-3 px-5 py-2.5 text-left hover:bg-primary/[0.03] transition-colors cursor-pointer"
              >
                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${estilo.punto}`} />
                <Avatar className="w-9 h-9 bg-gradient-to-br from-slate-100 to-slate-50 text-slate-500 ring-1 ring-slate-200 shrink-0">
                  <AvatarFallback className="text-[11px] font-black bg-transparent">
                    {iniciales(foco.docenteNombre)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 text-sm leading-tight truncate">
                    {foco.docenteNombre}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 mt-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${estilo.pastilla}`}
                  >
                    <span className="tabular-nums font-black">{foco.promedio.toFixed(1)}</span>
                    <span className="opacity-30">·</span>
                    {ui.label}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors shrink-0" />
              </button>
            );
          })}
          {restantes > 0 && (
            <div className="px-5 py-2.5 text-center text-xs font-semibold text-slate-400">
              y {restantes} docente{restantes > 1 ? 's' : ''} más
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
