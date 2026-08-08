import { useState } from 'react';
import { formatearFechaConMes } from '@shared/lib/fecha/fecha';
import {
  X,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import type { Cronograma } from '@/entities/model-cronogramas';

interface SolicitarReprogramacionFormProps {
  isOpen: boolean;
  onClose: () => void;
  visit: Cronograma;
  availableVisits?: Cronograma[];
  onSubmit: (data: {
    visitId: string;
    fechaOriginal: string;
    fechaNueva: string;
    motivo: string;
  }) => void;
}


export const SolicitarReprogramacionForm = ({
  isOpen,
  onClose,
  visit,
  availableVisits,
  onSubmit,
}: SolicitarReprogramacionFormProps) => {
  const [selectedVisitId, setSelectedVisitId] = useState<string>(visit?.id || '');
  const [reprogramarNuevaFecha, setReprogramarNuevaFecha] = useState<string>('');
  const [reprogramarMotivo, setReprogramarMotivo] = useState<string>('');

  // Si la visita elegida ya no está entre las disponibles, se vuelve a la que
  // abrió el formulario. Se ajusta durante el render: es estado de este mismo
  // componente y antes se difería con `setTimeout(…, 0)`.
  const elegidaSigueDisponible = availableVisits?.some((v) => v.id === selectedVisitId);
  if (visit && !elegidaSigueDisponible && selectedVisitId !== visit.id) {
    setSelectedVisitId(visit.id);
  }

  const activeVisit = availableVisits?.find(v => v.id === selectedVisitId) || visit;

  const handleSendClick = () => {
    if (!reprogramarNuevaFecha || !reprogramarMotivo || !activeVisit) return;
    onSubmit({
      visitId: activeVisit.id,
      fechaOriginal: activeVisit.fechaHora,
      fechaNueva: reprogramarNuevaFecha,
      motivo: reprogramarMotivo,
    });
    // Reset state
    setReprogramarNuevaFecha('');
    setReprogramarMotivo('');
  };

  if (!isOpen || !activeVisit) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <Card className="bg-surface w-full max-w-[580px] border border-border rounded-2xl shadow-xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-border pb-3">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-primary flex items-center gap-1">
              <RefreshCw className="h-3.5 w-3.5" />
              Solicitud de Reprogramación
            </span>
            <h3 className="font-bold text-slate-800 text-base">
              Solicitar Reprogramación de Visita
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Metadatos lectura */}
        <div className="space-y-2 text-xs border border-slate-100 bg-slate-50/50 rounded-xl p-3.5 text-slate-600">
          {availableVisits && availableVisits.length > 0 ? (
            <div className="flex flex-col gap-1.5 pb-2 border-b border-slate-200/50 mb-2">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Seleccionar Visita</label>
              <select
                value={selectedVisitId}
                onChange={(e) => setSelectedVisitId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary"
              >
                {availableVisits.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.institucion} - {v.docenteDirectivo} ({formatearFechaConMes(v.fechaHora)})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>I.E. Destino: <strong className="text-slate-800">{activeVisit.institucion}</strong></div>
          )}
          {!availableVisits && <div>Especialista: <strong className="text-slate-800">{activeVisit.especialista}</strong></div>}
          <div>Evaluado ({activeVisit.tipo}): <strong className="text-slate-800">{activeVisit.docenteDirectivo}</strong></div>
          <div>Fecha Programada Actual: <strong className="text-slate-800 text-primary">{formatearFechaConMes(activeVisit.fechaHora)}</strong></div>
        </div>

        {/* Campos de Entrada */}
        <div className="space-y-4">
          {/* Nueva fecha propuesta */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Nueva Fecha y Hora Propuesta
            </label>
            <input
              type="datetime-local"
              value={reprogramarNuevaFecha}
              onChange={(e) => setReprogramarNuevaFecha(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
            />
          </div>

          {/* Justificación */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Justificación / Motivo del Cambio
            </label>
            <textarea
              value={reprogramarMotivo}
              onChange={(e) => setReprogramarMotivo(e.target.value)}
              placeholder="Por favor detalle minuciosamente la justificación técnica del cambio de fecha. Ej: Huelga local, cruce con actividades distritales oficiales, etc."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary shadow-inner h-24 resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-200 text-slate-600 font-bold text-xs py-2 px-4 h-10 rounded-xl cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSendClick}
            disabled={!reprogramarNuevaFecha || !reprogramarMotivo}
            className="bg-primary hover:bg-primary-hover text-white font-bold text-xs py-2 px-5 h-10 rounded-xl shadow cursor-pointer disabled:opacity-50"
          >
            Enviar Solicitud
          </Button>
        </div>
      </Card>
    </div>
  );
};
