import { RefreshCw, User, ArrowRight, Paperclip } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { Card } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';
import { formatearFechaCorta } from '@shared/lib/fecha/fecha';
import type { SolicitudReprogramacion } from '@entities/model-reprogramaciones';
import type { Cronograma } from '@entities/model-cronogramas';

/**
 * Una solicitud de reprogramación en la bandeja.
 *
 * Eran 100 líneas dentro del `map` de `BandejaReprogramaciones`, con la paleta
 * de cada estado escrita tres veces —la barra lateral, la insignia y nada
 * más— en tres condicionales anidados distintos.
 */

/** Colores de cada estado, en un solo lugar para que no puedan discrepar. */
const PALETA = {
  APROBADO: { barra: '#10b981', insignia: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  RECHAZADO: { barra: '#ef4444', insignia: 'bg-rose-50 text-rose-700 border-rose-200' },
  PENDIENTE: { barra: '#f59e0b', insignia: 'bg-amber-50 text-amber-700 border-amber-200' },
} as const;

interface Props {
  solicitud: SolicitudReprogramacion & { visit: Cronograma };
  /** ¿Este usuario resuelve esta solicitud, o sólo la consulta? */
  puedeDecidir: boolean;
  onAbrir: (visitId: string) => void;
}

export const TarjetaDeSolicitud = ({ solicitud, puedeDecidir, onAbrir }: Props) => {
  const paleta = PALETA[solicitud.estado] ?? PALETA.PENDIENTE;
  const decidible = solicitud.estado === 'PENDIENTE' && puedeDecidir;

  return (
    <Card className="p-5 border border-slate-100 hover:border-primary/20 hover:shadow-md transition-all bg-surface flex flex-col justify-between gap-4 relative overflow-hidden">
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5"
        style={{ backgroundColor: paleta.barra }}
      />

      <div className="space-y-3 pl-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black text-slate-400">ID: {solicitud.id}</span>
          <Badge
            className={`font-black text-[9px] uppercase tracking-wider ${paleta.insignia}`}
          >
            {solicitud.estado}
          </Badge>
        </div>

        <div className="space-y-1">
          <h4 className="text-sm font-black text-slate-800 tracking-tight leading-snug line-clamp-1">
            {solicitud.visit.institucion}
          </h4>
          <p className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
            <User className="h-3 w-3 inline text-slate-400" />
            <span>Especialista: {solicitud.visit.especialista}</span>
          </p>
        </div>

        <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3 grid grid-cols-7 items-center gap-1.5 text-center text-xs font-semibold text-slate-700">
          <div className="col-span-3 space-y-0.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
              Original
            </span>
            <span className="font-semibold text-slate-500 line-through truncate block">
              {formatearFechaCorta(solicitud.fechaOriginal)}
            </span>
          </div>
          <div className="col-span-1 flex justify-center text-slate-400">
            <ArrowRight className="h-4 w-4" />
          </div>
          <div className="col-span-3 space-y-0.5">
            <span className="text-[9px] font-bold text-primary uppercase tracking-wider block">
              Propuesta
            </span>
            <span className="font-extrabold text-slate-800 truncate block">
              {formatearFechaCorta(solicitud.fechaNueva)}
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50/30 p-2.5 rounded-lg border border-slate-100/60">
          <strong>Motivo:</strong> &laquo;{solicitud.motivo}&raquo;
        </div>

        {solicitud.archivoNombre && (
          <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 bg-slate-50 p-1.5 rounded-md border border-slate-100 w-fit max-w-full">
            <Paperclip className="h-3 w-3 text-slate-400 shrink-0" />
            <span className="truncate">{solicitud.archivoNombre}</span>
          </div>
        )}
      </div>

      <div className="pl-2 pt-2 border-t border-slate-50 flex items-center justify-between gap-3">
        <span className="text-[10px] text-slate-400 font-semibold">
          Solicitado el: {formatearFechaCorta(solicitud.fechaRegistro)}
        </span>

        {decidible ? (
          <Button
            onClick={() => onAbrir(solicitud.visit.id)}
            className="bg-primary hover:bg-primary-hover text-white text-[11px] font-black h-8 px-4 rounded-lg flex items-center gap-1 shadow-sm cursor-pointer"
          >
            <RefreshCw className="h-3 w-3 animate-spin-hover" />
            <span>Revisar y Decidir</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => onAbrir(solicitud.visit.id)}
            className="border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-semibold h-8 px-4 rounded-lg cursor-pointer"
          >
            <span>Ver Trazabilidad</span>
          </Button>
        )}
      </div>
    </Card>
  );
};
