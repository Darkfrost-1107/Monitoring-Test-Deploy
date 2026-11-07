import { useState } from 'react';
import { History, ChevronDown, ChevronUp, AlertCircle, Calendar, Clock, User, XCircle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@shared/ui/badge';
import { formatearFechaCorta, formatearFechaConMes } from '@shared/lib/fecha/fecha';
import type { SolicitudReprogramacion } from '@entities/model-reprogramaciones';
import { AdjuntoDeSustento } from './AdjuntoDeSustento';

interface Props {
  intentos: SolicitudReprogramacion[];
}

const PALETA_ESTADO: Record<string, { bg: string; text: string; border: string; icon: typeof XCircle }> = {
  RECHAZADO: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: XCircle,
  },
  APROBADO: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircle2,
  },
  PENDIENTE: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: Clock,
  },
};

export const HistorialDeIntentos = ({ intentos }: Props) => {
  const [expandido, setExpandido] = useState(true);

  if (!intentos || intentos.length === 0) return null;

  return (
    <div className="border border-slate-200/90 rounded-2xl bg-white shadow-xs overflow-hidden transition-all duration-200">
      <button
        type="button"
        onClick={() => setExpandido((prev) => !prev)}
        className="w-full flex items-center justify-between p-4 bg-slate-50/80 hover:bg-slate-100/70 transition-colors text-left cursor-pointer"
        aria-expanded={expandido}
      >
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <History className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-800 tracking-tight">
              Intentos Anteriores de Reprogramación
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              Trazabilidad de solicitudes previas formuladas para esta misma visita
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-[10px] font-bold bg-white border-slate-200 text-slate-600 px-2 py-0.5"
          >
            {intentos.length} {intentos.length === 1 ? 'intento previo' : 'intentos previos'}
          </Badge>
          <div className="p-1 rounded-md text-slate-400 hover:text-slate-600">
            {expandido ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </button>

      {expandido && (
        <div className="p-4 space-y-4 bg-slate-50/30 border-t border-slate-100 divide-y divide-slate-100">
          {intentos.map((intento, idx) => {
            const estilo = PALETA_ESTADO[intento.estado] ?? PALETA_ESTADO.PENDIENTE;
            const Icono = estilo.icon;

            return (
              <div key={intento.id || idx} className={idx > 0 ? 'pt-4 space-y-3' : 'space-y-3'}>
                {/* Cabecera del intento */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md border ${estilo.bg} ${estilo.text} ${estilo.border}`}
                    >
                      <Icono className="h-3 w-3" />
                      {intento.estado}
                    </span>
                    <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      Propuesta:{' '}
                      <span className="text-primary font-bold">
                        {formatearFechaConMes(intento.fechaNueva)}
                      </span>
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Solicitado el {formatearFechaCorta(intento.fechaRegistro, 'Sin fecha')}
                  </span>
                </div>

                {/* Motivo original */}
                <div className="text-[11px] text-slate-600 bg-white border border-slate-200/70 rounded-xl p-3 shadow-2xs leading-relaxed space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Sustento del Solicitante
                  </div>
                  <div>&laquo;{intento.motivo}&raquo;</div>
                  {intento.adjunto && <AdjuntoDeSustento adjunto={intento.adjunto} />}
                </div>

                {/* Detalle de Resolución de Jefatura / Dirección */}
                {intento.estado !== 'PENDIENTE' && (
                  <div
                    className={`rounded-xl p-3 border space-y-1.5 ${
                      intento.estado === 'RECHAZADO'
                        ? 'bg-rose-50/70 border-rose-200/80 text-rose-900'
                        : 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-1 text-[10px] font-bold opacity-80">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Revisado por: <strong>{intento.aprobador || 'Jefatura de UGEL'}</strong>
                      </span>
                      <span>{formatearFechaCorta(intento.fechaAprobacion, 'Sin fecha')}</span>
                    </div>

                    {intento.aprobadorComentario ? (
                      <div className="text-[11px] leading-relaxed pt-0.5">
                        <span className="font-extrabold flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          {intento.estado === 'RECHAZADO'
                            ? 'Motivo del Rechazo:'
                            : 'Observación de Aprobación:'}
                        </span>
                        <div className="mt-0.5 italic pl-4 font-medium">
                          &laquo;{intento.aprobadorComentario}&raquo;
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] italic opacity-75">Sin observaciones registradas.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
