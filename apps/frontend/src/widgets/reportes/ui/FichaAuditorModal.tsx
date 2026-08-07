import { useState, useMemo } from 'react';
import {
  CheckCircle2,
  FileText,
  X,
  Check,
  Clock,
  Download,
  FileText as FileTextIcon
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import type { Cronograma } from '@/entities/model-cronogramas';
import type { Plantilla } from '@/entities/model-plantillas';
import { formatearFechaEnPalabras } from '@shared/lib/fecha/fecha';

interface FichaAuditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: Cronograma;
  template: Plantilla;
  fichaState: {
    checkedAspects: Record<string, boolean>;
    selectedLevels: Record<string, string>;
    generalComments: string;
    sugerencias?: string;
    compromisos?: string;
    preguntaExtraAnswers?: Record<string, boolean>;
    respuestasEjeItem?: Record<string, number>;
    evidenciaUrls?: Record<string, string>;
    observacionesEjeItem?: Record<string, string>;
  };
  downloadingId: string | null;
  onDownloadPDF: (visit: Cronograma, e: React.MouseEvent) => void;
}


export const FichaAuditorModal = ({
  isOpen,
  onClose,
  visit,
  template,
  fichaState,
  downloadingId,
  onDownloadPDF,
}: FichaAuditorModalProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Derivamos el desempeño activo de forma reactiva y pura
  const activeFichaDesempeno = useMemo(() => {
    if (!template || template.desempenos.length === 0) return null;
    const defaultId = template.desempenos[0].id;
    const activeId = (selectedId && template.desempenos.some(d => d.id === selectedId)) ? selectedId : defaultId;
    return template.desempenos.find((d) => d.id === activeId) || null;
  }, [template, selectedId]);

  const fichaSelectedDesempenoId = activeFichaDesempeno?.id || '';

  if (!isOpen || !visit || !template || !fichaState) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-200">
      <Card className="bg-surface w-full max-w-[1250px] border border-border rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-border bg-slate-50 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
              Auditoría de Ficha de Monitoreo Finalizada
            </span>
            <h2 className="text-lg font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {template.tipoMonitoreo} ({template.anioAcademico})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Metadatos */}
        <div className="px-6 py-3 bg-primary-light border-b border-primary/5 text-xs text-slate-600 font-bold grid grid-cols-2 md:grid-cols-4 gap-4 shadow-inner">
          <div>I.E. Monitoreada: <span className="text-slate-800">{visit.institucion}</span></div>
          <div>Evaluado: <span className="text-slate-800">{visit.docenteDirectivo}</span></div>
          <div>Especialista: <span className="text-slate-800">{visit.especialista}</span></div>
          <div>Fecha Ejecución: <span className="text-slate-800">{formatearFechaEnPalabras(visit.fechaHora)}</span></div>
        </div>

        {/* Split layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Sidebar: Desempeños */}
          <div className="w-full md:w-80 border-r border-border p-4 overflow-y-auto space-y-2 bg-slate-50/50">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">
              Desempeños Evaluados
            </span>
            {template.desempenos.map((des, index) => {
              const isSelected = fichaSelectedDesempenoId === des.id;
              const selectedLevel = fichaState.selectedLevels[des.id];
              
              return (
                <div
                  key={des.id}
                  onClick={() => setSelectedId(des.id)}
                  className={`p-3 border rounded-xl cursor-pointer transition-all flex items-start gap-2 text-left select-none relative ${
                    isSelected
                      ? 'border-primary ring-1 ring-primary/40 bg-primary-light/50 font-extrabold text-primary shadow-sm'
                      : 'border-border bg-surface text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className={`h-5 w-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black ${
                    isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {index + 1}
                  </span>
                  <div className="space-y-0.5 pr-4">
                    <div className="text-[11px] font-bold tracking-tight line-clamp-2">
                      {des.nombre}
                    </div>
                    <div className="text-[9px] font-semibold text-slate-400 flex items-center gap-1">
                      <span>Nivel Calificado:</span>
                      <strong className="text-primary font-black">
                        Nivel {selectedLevel || 'III'}
                      </strong>
                    </div>
                  </div>
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center rounded-full">
                    <Check className="h-2.5 w-2.5 font-bold" strokeWidth={3} />
                  </span>
                </div>
              );
            })}
          </div>

          {/* Panel de Detalle */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {activeFichaDesempeno ? (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-800 tracking-tight leading-snug">
                    {activeFichaDesempeno.nombre}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed border-b border-slate-100 pb-2">
                    {activeFichaDesempeno.descripcionCorta}
                  </p>
                </div>

                {/* Aspectos (solo lectura) */}
                {activeFichaDesempeno.aspectos && activeFichaDesempeno.aspectos.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                      Aspectos Considerados
                    </span>
                    <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 bg-slate-50/50 border border-slate-100 rounded-xl p-3.5">
                      {activeFichaDesempeno.aspectos.map((asp, idx) => (
                        <li key={asp.id}>
                          <strong>Aspecto {idx + 1}:</strong> {asp.descripcion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Pregunta Extra Sí/No */}
                {activeFichaDesempeno.preguntaExtra && (
                  <div className="space-y-2 p-4 border border-slate-200 rounded-xl bg-amber-50/30">
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block">
                      Pregunta Extra
                    </span>
                    <p className="text-sm font-medium text-slate-700">{activeFichaDesempeno.preguntaExtra}</p>
                    <div className="mt-1">
                      <span className="text-xs font-bold">
                        Respuesta:{' '}
                        {fichaState.preguntaExtraAnswers?.[activeFichaDesempeno.id] === true ? (
                          <span className="text-emerald-700">SÍ</span>
                        ) : fichaState.preguntaExtraAnswers?.[activeFichaDesempeno.id] === false ? (
                          <span className="text-red-600">NO</span>
                        ) : (
                          <span className="text-slate-400 italic">Sin responder</span>
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Rúbrica seleccionada */}
                <div className="space-y-3.5 pt-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                    Descripción de Niveles (Evaluación Registrada)
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {template.niveles.map((niv) => {
                      const rubDetail = activeFichaDesempeno.rubrica?.find((r) => r.nivel === niv.nivel);
                      const isSelected = fichaState.selectedLevels[activeFichaDesempeno.id] === niv.nivel;
                      
                      return (
                        <div
                          key={niv.nivel}
                          className={`border rounded-xl p-4 flex flex-col gap-2 shadow-sm relative overflow-hidden transition-all duration-200 ${
                            isSelected
                              ? 'ring-2 bg-slate-50 border-transparent shadow'
                              : 'border-slate-200 opacity-60 bg-surface'
                          }`}
                          style={{
                            borderColor: isSelected ? niv.color : '#e2e8f0',
                            backgroundColor: isSelected ? niv.color + '07' : 'transparent',
                          }}
                        >
                          <div
                            className="absolute left-0 top-0 bottom-0 w-1.5"
                            style={{ backgroundColor: niv.color }}
                          />
                          
                          <div className="pl-2 flex flex-col gap-1">
                            <span
                              className="text-xs font-black uppercase tracking-wider"
                              style={{ color: niv.color }}
                            >
                              Nivel {niv.nivel}
                            </span>
                            <span
                              className="text-[10px] font-bold"
                              style={{ color: niv.color }}
                            >
                              {niv.denominacion}
                            </span>
                          </div>

                          <p className="pl-2 text-[11px] text-slate-700 font-medium leading-relaxed">
                            {rubDetail?.descripcion || 'Sin descripción registrada.'}
                          </p>
                          
                          {isSelected && (
                            <span className="absolute right-3.5 top-3.5 bg-emerald-500 text-white rounded-full h-4 w-4 flex items-center justify-center border border-white shadow-sm font-bold text-[8px]">
                              ✓
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <FileText className="h-10 w-10 mb-2 stroke-1" />
                <span className="text-xs font-semibold">Seleccione un desempeño</span>
              </div>
            )}

            {/* Ejes e Items (Solo Docente) */}
            {template.ejesItems && template.ejesItems.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-100 mt-4">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block flex items-center gap-1.5">
                  <FileTextIcon className="h-3.5 w-3.5" />
                  EJES E ITEMS
                </span>
                {template.ejesItems.map((item) => {
                  const nivel = fichaState.respuestasEjeItem?.[item.id];
                  return (
                    <div key={item.id} className="border border-slate-200 rounded-xl p-3 space-y-1">
                      <div className="flex items-start gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                          {item.numero}
                        </span>
                        <span className="text-xs text-slate-700">{item.descripcion}</span>
                      </div>
                      <div className="flex items-center gap-4 pl-7">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase">Nivel:</span>
                        {nivel ? (() => {
                          const levelRom = ['', 'I', 'II', 'III', 'IV'][nivel] || '';
                          const levelConfig = template.niveles.find((n) => n.nivel === levelRom);
                          const color = levelConfig?.color || '#3b82f6';
                          return (
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-black text-white"
                              style={{ backgroundColor: color }}
                            >
                              Nivel {levelRom}
                            </span>
                          );
                        })() : (
                          <span className="text-xs font-bold text-slate-400">—</span>
                        )}
                      </div>
                      {fichaState.observacionesEjeItem?.[item.id] && (
                        <p className="text-[11px] text-slate-600 leading-relaxed pl-7 whitespace-pre-wrap">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Observaciones:</span>
                          {fichaState.observacionesEjeItem[item.id]}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sugerencias y Compromisos Registrados */}
        <div className="p-5 border-t border-border bg-slate-50/50 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Sugerencias</span>
            <div className="bg-surface border border-slate-200 rounded-xl p-3 text-xs text-slate-700 leading-relaxed shadow-inner min-h-[3rem]">
              {fichaState.sugerencias || <span className="text-slate-400 italic">Sin registrar</span>}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Compromisos</span>
            <div className="bg-surface border border-slate-200 rounded-xl p-3 text-xs text-slate-700 leading-relaxed shadow-inner min-h-[3rem]">
              {fichaState.compromisos || <span className="text-slate-400 italic">Sin registrar</span>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-slate-50 flex justify-between items-center">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Cerrado y Firmado Digitalmente por la UGEL</span>
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={(e) => onDownloadPDF(visit, e)}
              disabled={downloadingId === visit.id}
              className="border-slate-200 text-slate-600 text-xs font-bold px-4 py-2 h-10 rounded-xl flex items-center gap-1.5 cursor-pointer hover:bg-slate-100"
            >
              {downloadingId === visit.id ? (
                <Clock className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>Exportar PDF</span>
            </Button>
            <Button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-6 py-2.5 h-10 rounded-xl cursor-pointer shadow-sm animate-all"
            >
              Cerrar Auditoría
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
