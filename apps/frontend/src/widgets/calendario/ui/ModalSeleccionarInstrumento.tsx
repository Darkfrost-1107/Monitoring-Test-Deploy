import { X, Sparkles, BookOpen, ArrowRight, TreePine, GraduationCap, Building2, List, CheckCircle2 } from 'lucide-react';
import { Card } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import type { Plantilla } from '@entities/model-plantillas';
import type { Cronograma } from '@entities/model-cronogramas';
import type { IFichaMonitoreo } from '@sistema-monitoreo/shared-contracts';

interface ModalSeleccionarInstrumentoProps {
  isOpen: boolean;
  onClose: () => void;
  plantillas: Plantilla[];
  visita: Cronograma;
  fichasExistentes?: IFichaMonitoreo[];
  onSeleccionar: (plantilla: Plantilla, fichaExistente?: IFichaMonitoreo) => void;
}

export const ModalSeleccionarInstrumento = ({
  isOpen,
  onClose,
  plantillas,
  visita,
  fichasExistentes = [],
  onSeleccionar,
}: ModalSeleccionarInstrumentoProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-200">
      <Card className="bg-surface w-full max-w-[760px] border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Cabecera del Modal */}
        <div className="p-5 border-b border-border bg-slate-50 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Selección de Instrumento en Aula
            </span>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              ¿Qué ficha aplicarás en este monitoreo?
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Resumen de la visita a evaluar */}
        <div className="px-6 py-3 bg-primary/5 border-b border-primary/10 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
              Docente / Directivo a Evaluar:
            </span>
            <strong className="text-slate-900 font-extrabold text-sm">
              {visita.docenteDirectivo || 'Personal Docente'}
            </strong>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
              Institución Educativa:
            </span>
            <span className="text-slate-800 font-semibold">{visita.institucion}</span>
          </div>
        </div>

        {/* Cuerpo del Modal: Lista de Opciones de Fichas Disponibles */}
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto bg-slate-50/50">
          <p className="text-xs text-text-muted leading-relaxed">
            Elige la ficha pedagógica que corresponde a la sesión y contexto observado en este momento:
          </p>

          <div className="grid grid-cols-1 gap-3.5">
            {plantillas.map((plantilla) => {
              // El instrumento viene tipado en la plantilla; el rótulo es para mostrar.
              const isEib = plantilla.instrumento === 'DOCENTE_EIB';
              const isDirectivo = plantilla.instrumento === 'DIRECTIVO';

              const fichaExistente = fichasExistentes.find((f) => f.plantillaId === plantilla.id);
              const estaCompletada = fichaExistente?.estado === 'FINALIZADO';
              const estaEnBorrador = fichaExistente?.estado === 'BORRADOR';

              return (
                <div
                  key={plantilla.id}
                  onClick={() => onSeleccionar(plantilla, fichaExistente)}
                  className={`p-4.5 rounded-2xl border-2 transition-all cursor-pointer shadow-xs flex flex-col gap-3 group relative overflow-hidden bg-white hover:border-primary hover:shadow-md ${
                    estaCompletada
                      ? 'border-emerald-300/90 bg-emerald-50/20'
                      : isEib
                        ? 'border-emerald-200/80 hover:border-emerald-500'
                        : isDirectivo
                          ? 'border-indigo-200/80 hover:border-indigo-500'
                          : 'border-slate-200 hover:border-primary'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-11 w-11 rounded-xl flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 shrink-0 ${
                          estaCompletada
                            ? 'bg-emerald-600 text-white'
                            : isEib
                              ? 'bg-emerald-100 text-emerald-700'
                              : isDirectivo
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {estaCompletada ? (
                          <CheckCircle2 className="h-6 w-6" />
                        ) : isEib ? (
                          <TreePine className="h-6 w-6" />
                        ) : isDirectivo ? (
                          <Building2 className="h-6 w-6" />
                        ) : (
                          <GraduationCap className="h-6 w-6" />
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 ${
                              estaCompletada
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : isEib
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : isDirectivo
                                    ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                                    : 'bg-primary/10 text-primary border-primary/20'
                            }`}
                          >
                            {estaCompletada
                              ? 'Ficha Completada'
                              : estaEnBorrador
                                ? 'En Borrador'
                                : isEib
                                  ? 'Ficha Docente EIB'
                                  : isDirectivo
                                    ? 'Ficha Directiva'
                                    : 'Ficha Docente Regular (EBR)'}
                          </Badge>
                          <span className="text-[11px] font-bold text-slate-400">
                            Año {plantilla.anioAcademico}
                          </span>
                        </div>
                        <h3 className="text-sm font-extrabold text-slate-800 group-hover:text-primary transition-colors">
                          {plantilla.tipoMonitoreo} ({plantilla.anioAcademico})
                        </h3>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      className={`text-xs font-bold gap-1.5 rounded-xl shadow-xs transition-all pointer-events-none ${
                        estaCompletada
                          ? 'bg-slate-700 group-hover:bg-slate-900 text-white'
                          : estaEnBorrador
                            ? 'bg-amber-600 group-hover:bg-amber-700 text-white'
                            : isEib
                              ? 'bg-emerald-600 group-hover:bg-emerald-700 text-white'
                              : isDirectivo
                                ? 'bg-indigo-600 group-hover:bg-indigo-700 text-white'
                                : 'bg-primary group-hover:bg-primary-hover text-white'
                      }`}
                    >
                      <span>
                        {estaCompletada
                          ? 'Ver / Imprimir'
                          : estaEnBorrador
                            ? 'Continuar Llenado'
                            : fichasExistentes.length > 0
                              ? 'Aplicar Complementaria'
                              : 'Aplicar Ficha'}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </div>

                  <p className="text-[11.5px] text-slate-600 leading-relaxed font-medium pl-14">
                    {isEib
                      ? 'Ficha oficial MINEDU con escala cualitativa tripartita (Sí / Parcialmente / No) para observación pedagógica y revisión de documentos curriculares.'
                      : isDirectivo
                        ? 'Instrumento de evaluación integral para la gestión institucional directiva con escala porcentual.'
                        : 'Instrumento estándar de aula con rúbricas de calificación por niveles (I al IV) y baremo de evaluación vigente.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[10.5px] font-bold text-slate-500 pl-14 pt-1 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <List className="w-3.5 h-3.5 text-primary" />
                      <span>{plantilla.desempenos.length} {isEib ? 'ítems observables' : 'desempeños'}</span>
                    </span>
                    <span>•</span>
                    <span>
                      Escala: <strong className="text-slate-800">{isEib ? 'Cualitativa (Sí/Parcial/No)' : `Baremo ${plantilla.baremo}`}</strong>
                    </span>
                    {estaCompletada && fichaExistente && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-700 font-bold">
                          Nivel obtenido: {fichaExistente.nivelLogro}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pie del Modal */}
        <div className="p-4 border-t border-border bg-slate-50 flex justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            className="text-slate-700 text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
          >
            Cancelar
          </Button>
        </div>
      </Card>
    </div>
  );
};
