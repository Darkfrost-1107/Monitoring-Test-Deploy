import { CalendarClock, Check, X, History, Building2, MapPin, UserRound } from 'lucide-react';
import type { ISolicitudVisita } from '@sistema-monitoreo/shared-contracts';
import { Card } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { formatearFechaCorta } from '@shared/lib/fecha/fecha';
import { estiloDeEstado } from './estado-de-solicitud';

interface Props {
  solicitud: ISolicitudVisita;
  /** Quien gestiona puede atender o rechazar; el resto sólo hace seguimiento. */
  puedeGestionar: boolean;
  rechazoEnCurso: boolean;
  onAtender: (s: ISolicitudVisita) => void;
  onRechazar: (s: ISolicitudVisita) => void;
  onVerTrazabilidad: (id: string) => void;
}

export const TarjetaDeSolicitud = ({
  solicitud: s,
  puedeGestionar,
  rechazoEnCurso,
  onAtender,
  onRechazar,
  onVerTrazabilidad,
}: Props) => {
  const estilo = estiloDeEstado(s.estado);
  const seResuelve = puedeGestionar && estilo.resoluble;

  return (
    <Card
      className={`p-4 border-border border-l-4 ${estilo.accent} shadow-xs hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-start justify-between gap-4`}
    >
      <div className="min-w-0 flex gap-3">
        <div className="hidden sm:flex w-10 h-10 shrink-0 rounded-xl bg-primary/10 text-primary items-center justify-center">
          <Building2 className="w-5 h-5" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[0.95rem] truncate">{s.institucionNombre}</span>
            <Badge
              variant={s.prioridad === 'ALTA' ? 'destructive' : 'secondary'}
              className="text-[10px] uppercase font-bold"
            >
              {s.prioridad}
            </Badge>
            <Badge
              variant="outline"
              className={`text-[10px] uppercase font-bold border ${estilo.badge}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full mr-1 ${estilo.dot}`} />
              {estilo.label}
            </Badge>
          </div>

          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-text-muted uppercase tracking-wide">
            <MapPin className="w-3 h-3" /> {s.distrito}
          </div>

          {s.docenteNombre && (
            <p className="text-sm mt-1.5 font-semibold text-foreground flex items-center gap-1.5">
              <UserRound className="w-3.5 h-3.5 text-primary" /> {s.docenteNombre}
            </p>
          )}

          {s.motivo && (
            <p className="text-[13px] mt-1.5 text-text-muted italic border-l-2 border-border pl-2.5">
              “{s.motivo}”
            </p>
          )}

          <p className="text-[11px] text-text-muted mt-2 flex items-center gap-1">
            <CalendarClock className="w-3 h-3" />
            {s.solicitanteNombre} · {formatearFechaCorta(s.createdAt)}
          </p>
        </div>
      </div>

      <div className="flex gap-2 shrink-0 self-start">
        {seResuelve && (
          <>
            <Button size="sm" onClick={() => onAtender(s)}>
              <Check className="w-4 h-4 mr-1" /> Atender
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRechazar(s)}
              disabled={rechazoEnCurso}
            >
              <X className="w-4 h-4 mr-1" /> Rechazar
            </Button>
          </>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-text-muted hover:text-primary"
          onClick={() => onVerTrazabilidad(s.id)}
          title="Ver trazabilidad de la solicitud"
        >
          <History className="w-4 h-4 mr-1" /> Trazabilidad
        </Button>
      </div>
    </Card>
  );
};
