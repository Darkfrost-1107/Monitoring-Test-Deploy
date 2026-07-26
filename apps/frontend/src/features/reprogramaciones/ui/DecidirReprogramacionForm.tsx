import { useState } from 'react';
import {
  X,
  RefreshCw,
  BookOpen,
  ArrowRight,
  Clock,
  Paperclip,
  Download,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import type { Cronograma } from '@/entities/model-cronogramas';
import type { SolicitudReprogramacion } from '@/entities/model-reprogramaciones';

interface DecidirReprogramacionFormProps {
  isOpen: boolean;
  onClose: () => void;
  visit: Cronograma;
  request: SolicitudReprogramacion;
  canDecide: boolean;
  onApprove: (visitId: string, comment: string) => void;
  onReject: (visitId: string, comment: string) => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const formatVisitDateLabel = (fechaStr: string) => {
  try {
    const d = new Date(fechaStr);
    if (isNaN(d.getTime())) {
      const parts = fechaStr.split('T');
      const [, , dayNum] = parts[0].split('-');
      const [h, min] = parts[1].split(':');
      return `${dayNum} Oct 2023, ${h}:${min} AM`;
    }
    return `${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}, ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')} hrs`;
  } catch {
    return fechaStr;
  }
};

export const DecidirReprogramacionForm = ({
  isOpen,
  onClose,
  visit,
  request,
  canDecide,
  onApprove,
  onReject,
}: DecidirReprogramacionFormProps) => {
  const [comentarioAprobacion, setComentarioAprobacion] = useState<string>('');

  if (!isOpen || !visit || !request) return null;

  const handleApproveClick = () => {
    onApprove(visit.id, comentarioAprobacion);
    setComentarioAprobacion('');
  };

  const handleRejectClick = () => {
    onReject(visit.id, comentarioAprobacion);
    setComentarioAprobacion('');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-200">
      <Card className="bg-surface w-full max-w-[1000px] border border-border rounded-2xl shadow-xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-border bg-slate-50 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
              <RefreshCw className="h-3.5 w-3.5" />
              Gestión de Cronograma / Reprogramación
            </span>
            <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">
              Detalle de Solicitud de Cambio
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-2.5 bg-primary-light border-b border-primary/5 text-xs text-primary font-bold">
          Trazabilidad completa de la modificación de cronograma para {visit.institucion}
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          {/* Columna Izquierda */}
          <div className="w-full lg:w-80 border-r border-border p-5 bg-slate-50/50 space-y-5 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-5">
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Información Base
                </h3>
                
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">ID Solicitud</span>
                  <Badge variant="outline" className="text-xs font-black bg-slate-100 border-slate-200 text-slate-700">
                    {request.id}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Institución Educativa</span>
                  <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
                    <BookOpen className="h-4.5 w-4.5 text-primary" />
                    <span>{visit.institucion}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Especialista Asignado</span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <div className="h-5 w-5 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center">
                      {visit.especialistaInitials}
                    </div>
                    <span>{visit.especialista}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Estado Actual</span>
                  <Badge className={`font-bold uppercase text-[9px] tracking-wider py-1 px-2.5 border shadow-sm ${
                    request.estado === 'APROBADO'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : request.estado === 'RECHAZADO'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    ● {request.estado}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-200 pt-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Detalle del Cambio
                </h3>
                
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Fecha Original</span>
                  <div className="text-xs font-bold text-slate-600 line-through bg-slate-100/60 p-2.5 border border-slate-200/50 rounded-lg">
                    {formatVisitDateLabel(request.fechaOriginal)}
                  </div>
                </div>

                <div className="text-center py-0.5">
                  <ArrowRight className="h-5 w-5 text-slate-400 mx-auto rotate-90 lg:rotate-0" />
                </div>

                <div className="space-y-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                    request.estado === 'APROBADO' ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    Nueva Fecha Propuesta
                  </span>
                  <div className={`text-xs font-extrabold p-2.5 border rounded-lg ${
                    request.estado === 'APROBADO'
                      ? 'text-emerald-700 bg-emerald-50/50 border-emerald-200 font-black shadow-sm'
                      : 'text-slate-700 bg-slate-50 border-slate-200'
                  }`}>
                    {formatVisitDateLabel(request.fechaNueva)}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 hidden lg:block">
              <span className="text-[9px] text-slate-400 leading-normal block">
                Todos los cambios de cronograma quedan debidamente firmados y guardados en la bitácora de auditoría.
              </span>
            </div>
          </div>

          {/* Columna Derecha: Auditoría Timeline */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Clock className="h-4.5 w-4.5 text-primary" />
              <span>Línea de Tiempo de Auditoría</span>
            </h3>

            <div className="relative pl-6 border-l-2 border-slate-200 space-y-6 py-2 ml-2">
              
              {/* Nodo final si está aprobado o rechazado */}
              {request.estado !== 'PENDIENTE' && (
                <div className="relative animate-in fade-in duration-300">
                  <div className={`absolute -left-[31px] top-1.5 h-4.5 w-4.5 rounded-full border-2 border-white shadow ${
                    request.estado === 'APROBADO' ? 'bg-emerald-600' : 'bg-rose-600'
                  }`} />
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <Badge className={`font-black text-[9px] tracking-wider py-0.5 px-2 text-white ${
                        request.estado === 'APROBADO' ? 'bg-emerald-800' : 'bg-rose-800'
                      }`}>
                        {request.estado === 'APROBADO' ? 'CAMBIO APLICADO' : 'SOLICITUD RECHAZADA'}
                      </Badge>
                      <span className="text-[10px] text-slate-400 font-semibold">{request.fechaAprobacion}</span>
                    </div>
                    <h4 className="text-xs font-black text-slate-800">
                      {request.estado === 'APROBADO' ? 'Cronograma Actualizado' : 'Flujo de Reprogramación Concluido'}
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl p-3 shadow-inner">
                      {request.estado === 'APROBADO' 
                        ? 'El sistema ha actualizado automáticamente el cronograma principal en el calendario. Las notificaciones pertinentes han sido enviadas a la I.E. y a la casilla del especialista.' 
                        : 'La solicitud de reprogramación fue denegada por la jefatura. El monitoreo conserva su fecha original de programación.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Nodo aprobación de Jefatura */}
              {request.estado !== 'PENDIENTE' && (
                <div className="relative animate-in fade-in duration-300">
                  <div className="absolute -left-[31px] top-1.5 h-4.5 w-4.5 rounded-full border-2 border-white bg-slate-400 shadow" />
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <Badge variant="outline" className="border-slate-200 text-slate-600 bg-slate-50 font-bold text-[9px] tracking-wider py-0.5 px-2">
                        REVISIÓN JEFATURA
                      </Badge>
                      <span className="text-[10px] text-slate-400 font-semibold">{request.fechaAprobacion}</span>
                    </div>
                    <h4 className="text-xs font-black text-slate-800">
                      {request.estado === 'APROBADO' ? 'Solicitud Aprobada' : 'Revisión Concluida'}
                    </h4>
                    <div className="text-[11px] text-slate-600 font-medium">
                      Por: <strong>{request.aprobador || 'Carlos Mendoza'}</strong>
                    </div>
                    
                    <div className="text-[11px] text-primary bg-primary-light/60 border border-primary/10 rounded-xl p-3.5 shadow-inner italic leading-relaxed">
                      <strong>Comentario de la Jefatura:</strong> "{request.aprobadorComentario}"
                    </div>
                  </div>
                </div>
              )}

              {/* Registro Inicial por el Especialista (Siempre visible) */}
              <div className="relative">
                <div className="absolute -left-[31px] top-1.5 h-4.5 w-4.5 rounded-full border-2 border-white bg-slate-400 shadow" />
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Badge variant="outline" className="border-slate-200 text-slate-600 bg-slate-50 font-bold text-[9px] tracking-wider py-0.5 px-2">
                      REGISTRO INICIAL
                    </Badge>
                    <span className="text-[10px] text-slate-400 font-semibold">{request.fechaRegistro}</span>
                  </div>
                  <h4 className="text-xs font-black text-slate-800">
                    Solicitud de Cambio Creada
                  </h4>
                  <div className="text-[11px] text-slate-600 font-medium">
                    Por: <strong>{visit.especialista}</strong> (Especialista Asignado)
                  </div>
                  
                  <div className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl p-3 shadow-inner">
                    <strong>Motivo de la solicitud:</strong> "{request.motivo}"
                  </div>

                  {/* Adjunto */}
                  {request.archivoNombre && (
                    <div className="pt-1.5">
                      <div className="inline-flex items-center justify-between gap-3 bg-surface border border-slate-200 hover:border-slate-300 rounded-lg py-1.5 px-3.5 transition-all text-xs font-bold text-slate-700 shadow-sm cursor-pointer">
                        <div className="flex items-center gap-1.5">
                          <Paperclip className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-slate-600 truncate max-w-xs">{request.archivoNombre}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">(1.2 MB)</span>
                        </div>
                        <Download className="h-4.5 w-4.5 text-primary shrink-0 hover:scale-110 transition-transform" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* ACCIÓN REQUERIDA: Aprobación del Jefe de Gestión */}
            {request.estado === 'PENDIENTE' && canDecide && (
              <div className="mt-6 border border-amber-200 bg-amber-50/20 rounded-2xl p-5 space-y-4 animate-in slide-in-from-bottom-5 duration-300 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-black text-amber-800 uppercase tracking-widest">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <span>Revisión de Jefatura (Acción Requerida)</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Comentario / Sustento de la Decisión
                  </label>
                  <textarea
                    value={comentarioAprobacion}
                    onChange={(e) => setComentarioAprobacion(e.target.value)}
                    placeholder="Escriba aquí los comentarios sustentatorios para la aprobación o rechazo de la reprogramación..."
                    className="w-full bg-surface border border-slate-200 focus:outline-none focus:ring-1 focus:ring-primary rounded-xl p-3 text-xs text-slate-700 shadow-inner h-20 resize-none leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={handleRejectClick}
                    className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold text-xs py-2 px-4 h-10 rounded-xl cursor-pointer"
                  >
                    Rechazar Solicitud
                  </Button>
                  <Button
                    onClick={handleApproveClick}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-5 h-10 rounded-xl shadow cursor-pointer"
                  >
                    Aprobar Cambio de Fecha
                  </Button>
                </div>
              </div>
            )}

            {/* Notificación cuando está pendiente y el usuario no es quien decide */}
            {request.estado === 'PENDIENTE' && !canDecide && (
              <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 text-xs font-medium leading-relaxed flex items-start gap-2.5 shadow-inner">
                <AlertCircle className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
                <span>
                  <strong>Solicitud en Revisión:</strong>{' '}
                  {request.solicitanteRolAlCrear === 'coordinador_pedagogico' ||
                  request.solicitanteRolAlCrear === 'jefe_taller'
                    ? 'Esta solicitud a nivel institucional (IE) fue creada por el Coordinador Pedagógico o Jefe de Taller y está pendiente de revisión y resolución por parte del Director de la Institución Educativa.'
                    : 'Esta solicitud a nivel UGEL fue enviada por un Especialista de Educación y se encuentra pendiente de revisión por parte de la Jefatura de Gestión Pedagógica / Jefatura de Área.'}
                </span>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-slate-50 flex justify-end">
          <Button
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-sm cursor-pointer"
          >
            Volver al Calendario
          </Button>
        </div>
      </Card>
    </div>
  );
};
