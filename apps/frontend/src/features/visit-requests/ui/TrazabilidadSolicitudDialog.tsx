import {
  X,
  CalendarClock,
  BookOpen,
  Clock,
  UserRound,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '@shared/ui/button';
import { Card } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';
import { Spinner } from '@shared/ui/Spinner';
import { useSolicitudDetalle } from '../api/use-visits-api';
import { FECHA_INVALIDA, formatearFecha, formatearHora } from '@shared/lib/fecha/fecha';

interface Props {
  solicitudId: string | null;
  onClose: () => void;
}

const fmtFechaHora = (iso: string): string => {
  const fecha = formatearFecha(iso, { day: '2-digit', month: 'short', year: 'numeric' });
  return fecha === FECHA_INVALIDA ? fecha : `${fecha}, ${formatearHora(iso)}`;
};

const fmtVisita = (fechaIso: string, hora: string | null): string => {
  const fecha = formatearFecha(fechaIso, { day: '2-digit', month: 'long', year: 'numeric' });
  return hora ? `${fecha}, ${hora.slice(0, 5)} hrs` : fecha;
};

export const TrazabilidadSolicitudDialog = ({ solicitudId, onClose }: Props) => {
  const { data, isLoading, isError } = useSolicitudDetalle(solicitudId);

  if (solicitudId === null) return null;

  const atendida = data?.estado === 'ATENDIDA';
  const rechazada = data?.estado === 'RECHAZADA';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-200">
      <Card className="bg-surface w-full max-w-[860px] border border-border rounded-2xl shadow-xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-border bg-slate-50 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" />
              Solicitud de Visita / Trazabilidad
            </span>
            <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">
              Detalle de Solicitud de Visita
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Spinner />
            <span className="text-sm text-text-muted">Cargando trazabilidad…</span>
          </div>
        ) : isError || !data ? (
          <div className="py-16 text-center text-danger font-medium">
            No se pudo cargar el detalle de la solicitud.
          </div>
        ) : (
          <>
            <div className="px-6 py-2.5 bg-primary-light border-b border-primary/5 text-xs text-primary font-bold">
              Trazabilidad de la solicitud de visita para {data.institucionNombre}
            </div>

            {/* Body */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
              {/* Columna izquierda: información base */}
              <div className="w-full lg:w-72 border-r border-border p-5 bg-slate-50/50 space-y-4 overflow-y-auto">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Información Base
                </h3>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Institución Educativa
                  </span>
                  <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
                    <BookOpen className="h-4 w-4 text-primary shrink-0" />
                    <span>{data.institucionNombre}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase">{data.distrito}</span>
                </div>

                {data.docenteNombre && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Docente / Directivo
                    </span>
                    <div className="text-xs font-bold text-slate-700">{data.docenteNombre}</div>
                  </div>
                )}

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Prioridad
                  </span>
                  <Badge
                    variant={data.prioridad === 'ALTA' ? 'destructive' : 'secondary'}
                    className="text-[9px] uppercase font-bold"
                  >
                    {data.prioridad}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Estado Actual
                  </span>
                  <Badge
                    className={`font-bold uppercase text-[9px] tracking-wider py-1 px-2.5 border shadow-sm ${
                      atendida
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : rechazada
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    ● {data.estado}
                  </Badge>
                </div>

                {data.cronograma && (
                  <div className="space-y-1 border-t border-slate-200 pt-3">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Especialista Designado
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <UserRound className="h-4 w-4 text-primary shrink-0" />
                      <span>{data.cronograma.especialistaNombre ?? '—'}</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-semibold block">
                      Visita: {fmtVisita(data.cronograma.fechaProgramada, data.cronograma.horaInicio)}
                    </span>
                  </div>
                )}
              </div>

              {/* Columna derecha: línea de tiempo */}
              <div className="flex-1 p-6 overflow-y-auto space-y-5">
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Línea de Tiempo de Auditoría</span>
                </h3>

                <div className="relative pl-6 border-l-2 border-slate-200 space-y-6 py-2 ml-2">
                  {/* Nodo de resolución (atendida / rechazada) */}
                  {data.estado !== 'PENDIENTE' && (
                    <div className="relative animate-in fade-in duration-300">
                      <div
                        className={`absolute -left-[31px] top-1.5 h-4 w-4 rounded-full border-2 border-white shadow ${
                          atendida ? 'bg-emerald-600' : 'bg-rose-600'
                        }`}
                      />
                      <div className="space-y-1">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <Badge
                            className={`font-black text-[9px] tracking-wider py-0.5 px-2 text-white ${
                              atendida ? 'bg-emerald-800' : 'bg-rose-800'
                            }`}
                          >
                            {atendida ? (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            {atendida ? 'VISITA AGENDADA' : 'SOLICITUD RECHAZADA'}
                          </Badge>
                          {data.resueltaAt && (
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {fmtFechaHora(data.resueltaAt)}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-black text-slate-800">
                          {atendida ? 'Solicitud atendida' : 'Solicitud rechazada'}
                        </h4>
                        {data.atendidaPorNombre && (
                          <div className="text-[11px] text-slate-600 font-medium">
                            Por: <strong>{data.atendidaPorNombre}</strong> (Jefe de Gestión)
                          </div>
                        )}
                        {atendida && data.cronograma && (
                          <div className="text-[11px] text-emerald-700 bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 shadow-inner">
                            Se agendó la visita con{' '}
                            <strong>{data.cronograma.especialistaNombre ?? 'un especialista'}</strong>{' '}
                            para el{' '}
                            {fmtVisita(data.cronograma.fechaProgramada, data.cronograma.horaInicio)}.
                          </div>
                        )}
                        {rechazada && data.comentario && (
                          <div className="text-[11px] text-rose-700 bg-rose-50/60 border border-rose-100 rounded-xl p-3 shadow-inner italic">
                            <strong>Motivo del rechazo:</strong> "{data.comentario}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Registro inicial (siempre) */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1.5 h-4 w-4 rounded-full border-2 border-white bg-slate-400 shadow" />
                    <div className="space-y-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <Badge
                          variant="outline"
                          className="border-slate-200 text-slate-600 bg-slate-50 font-bold text-[9px] tracking-wider py-0.5 px-2"
                        >
                          REGISTRO INICIAL
                        </Badge>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {fmtFechaHora(data.createdAt)}
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-slate-800">Solicitud de visita creada</h4>
                      <div className="text-[11px] text-slate-600 font-medium">
                        Por: <strong>{data.solicitanteNombre}</strong>
                      </div>
                      <div className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl p-3 shadow-inner">
                        <strong>Motivo de la visita:</strong>{' '}
                        {data.motivo ? `"${data.motivo}"` : 'No se indicó un motivo.'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-border bg-slate-50 flex justify-end">
          <Button
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-sm cursor-pointer"
          >
            Cerrar
          </Button>
        </div>
      </Card>
    </div>
  );
};
