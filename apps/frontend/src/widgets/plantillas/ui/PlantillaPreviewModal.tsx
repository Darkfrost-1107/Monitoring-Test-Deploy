import { useState, useMemo } from 'react';
import {
  X,
  Check,
  FileText,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Layers,
  MessageSquareQuote,
} from 'lucide-react';
import { Button } from '@shared/ui/button';
import { Card } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';
import type { Plantilla, Desempeno } from '@entities/model-plantillas';

interface PlantillaPreviewModalProps {
  plantilla: Plantilla;
  onClose: () => void;
}

interface GrupoEibModal {
  seccion: string;
  subcriterios: {
    subcriterio: string;
    items: {
      desempeno: Desempeno;
      numeroGlobal: number;
    }[];
  }[];
}

export const PlantillaPreviewModal = ({ plantilla, onClose }: PlantillaPreviewModalProps) => {
  const [selectedDesempenoId, setSelectedDesempenoId] = useState<string>(() => {
    return plantilla.desempenos.length > 0 ? plantilla.desempenos[0].id : '';
  });

  const isEib = plantilla.tipoMonitoreo === 'Monitoreo Docente EIB';

  const activeDesempeno = useMemo(() => {
    if (!selectedDesempenoId) return null;
    return plantilla.desempenos.find((d) => d.id === selectedDesempenoId) || null;
  }, [plantilla, selectedDesempenoId]);

  // Agrupación jerárquica para EIB (Sección -> Subcriterio -> Ítems)
  const gruposEib = useMemo<GrupoEibModal[]>(() => {
    if (!isEib) return [];

    const grupos: GrupoEibModal[] = [];
    let currentGrupo: GrupoEibModal | null = null;
    let currentSubGrupo: {
      subcriterio: string;
      items: { desempeno: Desempeno; numeroGlobal: number }[];
    } | null = null;
    let currentSubKey = '';

    plantilla.desempenos.forEach((d, idx) => {
      const raw = d.descripcionCorta?.trim() || 'I. CONDICIONES BÁSICAS PARA EL APRENDIZAJE';
      const partes = raw.split(' — ');
      const seccionNombre = partes[0] || raw;
      const subcriterioNombre = partes.length > 1 ? partes.slice(1).join(' — ') : '';

      if (!currentGrupo || currentGrupo.seccion !== seccionNombre) {
        currentGrupo = {
          seccion: seccionNombre,
          subcriterios: [],
        };
        grupos.push(currentGrupo);
        currentSubGrupo = null;
        currentSubKey = '';
      }

      if (!currentSubGrupo || currentSubKey !== subcriterioNombre) {
        currentSubKey = subcriterioNombre;
        currentSubGrupo = {
          subcriterio: subcriterioNombre,
          items: [],
        };
        currentGrupo.subcriterios.push(currentSubGrupo);
      }

      currentSubGrupo.items.push({
        desempeno: d,
        numeroGlobal: idx + 1,
      });
    });

    return grupos;
  }, [plantilla, isEib]);

  // Parsear la sección y subcriterio del ítem activo en EIB
  const activeEibDetalle = useMemo(() => {
    if (!activeDesempeno || !isEib) return null;
    const raw = activeDesempeno.descripcionCorta?.trim() || '';
    const partes = raw.split(' — ');
    return {
      seccion: partes[0] || 'Sección Principal',
      subcriterio: partes.length > 1 ? partes.slice(1).join(' — ') : null,
    };
  }, [activeDesempeno, isEib]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-200">
      <Card className="bg-surface w-full max-w-[1200px] border border-border rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Cabecera del Modal */}
        <div className="p-5 border-b border-border bg-slate-50 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {isEib ? 'Ficha de Observación Pedagógica EIB' : 'Visualizador de Estructura de Plantilla'}
            </span>
            <h2 className="text-lg font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {plantilla.tipoMonitoreo} ({plantilla.anioAcademico})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sub-header con información técnica resumida */}
        <div className="px-6 py-2.5 bg-primary/5 border-b border-primary/10 text-xs text-primary font-bold flex flex-wrap items-center gap-x-6 gap-y-1.5">
          <span>
            Año Académico: <strong className="text-slate-800">{plantilla.anioAcademico}</strong>
          </span>
          {isEib ? (
            <>
              <span>
                Escala de Valoración: <strong className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">Sí · Parcialmente · No</strong>
              </span>
              <span>
                Total de Ítems: <strong className="text-slate-800">{plantilla.desempenos.length} observables</strong>
              </span>
            </>
          ) : (
            <>
              <span>
                Baremo de Escala: <strong className="text-slate-800">{plantilla.baremo}</strong>
              </span>
              <span>
                Total Criterios: <strong className="text-slate-800">{plantilla.desempenos.length} desempeños</strong>
              </span>
            </>
          )}
          <span>
            Estado:{' '}
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
              {plantilla.estado}
            </span>
          </span>
        </div>

        {/* Cuerpo del Modal (Distribución en Dos Columnas) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Columna Izquierda: Navegación de Ítems / Desempeños */}
          <div className="w-full md:w-88 border-r border-border p-4 overflow-y-auto space-y-3 bg-slate-50/70 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-primary" />
                {isEib ? 'Estructura por Secciones' : 'Desempeños / Criterios'}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {plantilla.desempenos.length} {isEib ? 'ítems' : 'criterios'}
              </span>
            </div>

            {isEib ? (
              // Agrupación EIB
              <div className="space-y-4">
                {gruposEib.map((sec, sIdx) => (
                  <div key={sIdx} className="space-y-2">
                    <div className="px-2 py-1.5 rounded-lg bg-slate-200/80 border border-slate-300/60 flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight line-clamp-1">
                        {sec.seccion}
                      </span>
                    </div>

                    <div className="space-y-2.5 pl-1.5">
                      {sec.subcriterios.map((sub, subIdx) => (
                        <div key={subIdx} className="space-y-1.5">
                          {sub.subcriterio && (
                            <span className="text-[9.5px] font-extrabold text-primary uppercase tracking-wide block px-1">
                              {sub.subcriterio}
                            </span>
                          )}

                          <div className="space-y-1.5">
                            {sub.items.map(({ desempeno, numeroGlobal }) => {
                              const isSelected = selectedDesempenoId === desempeno.id;
                              return (
                                <div
                                  key={desempeno.id}
                                  onClick={() => setSelectedDesempenoId(desempeno.id)}
                                  className={`p-2.5 border rounded-xl cursor-pointer transition-all flex items-start gap-2.5 shadow-2xs leading-snug text-left select-none ${
                                    isSelected
                                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5 font-bold text-primary shadow-xs'
                                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100/80 hover:border-slate-300'
                                  }`}
                                >
                                  <span
                                    className={`h-5 w-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black mt-0.5 ${
                                      isSelected
                                        ? 'bg-primary text-white shadow-2xs'
                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}
                                  >
                                    {numeroGlobal}
                                  </span>
                                  <div className="text-[11px] leading-snug line-clamp-2">
                                    {desempeno.nombre}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Formato Estándar Docente / Directivo
              <div className="space-y-2">
                {plantilla.desempenos.map((des, index) => {
                  const isSelected = selectedDesempenoId === des.id;
                  return (
                    <div
                      key={des.id}
                      onClick={() => setSelectedDesempenoId(des.id)}
                      className={`p-3 border rounded-xl cursor-pointer transition-all flex items-start gap-2.5 shadow-2xs leading-snug text-left select-none ${
                        isSelected
                          ? 'border-primary ring-2 ring-primary/20 bg-primary/5 font-extrabold text-primary'
                          : 'border-border bg-surface text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span
                        className={`h-5 w-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black ${
                          isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div className="space-y-0.5">
                        <div className="text-[11px] font-bold tracking-tight line-clamp-2">
                          {des.nombre}
                        </div>
                        <div className="text-[9.5px] font-semibold text-slate-400 line-clamp-1">
                          {des.descripcionCorta}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Columna Derecha: Detalle del Ítem Seleccionado */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-white">
            {activeDesempeno ? (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Encabezado y Enunciado del Ítem */}
                <div className="space-y-3">
                  {isEib && activeEibDetalle ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="bg-slate-100 text-slate-800 border-slate-300 font-extrabold text-[10px] px-2.5 py-1"
                      >
                        {activeEibDetalle.seccion}
                      </Badge>
                      {activeEibDetalle.subcriterio && (
                        <Badge
                          variant="outline"
                          className="bg-primary/10 text-primary border-primary/20 font-extrabold text-[10px] px-2.5 py-1"
                        >
                          {activeEibDetalle.subcriterio}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    activeDesempeno.descripcionCorta && (
                      <p className="text-xs font-bold text-primary tracking-wide uppercase">
                        {activeDesempeno.descripcionCorta}
                      </p>
                    )
                  )}

                  <div className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/70 shadow-xs">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                      {isEib ? 'Enunciado Observable del Ítem EIB' : 'Criterio Pedagógico'}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-800 tracking-tight leading-relaxed">
                      {activeDesempeno.nombre}
                    </h3>
                  </div>
                </div>

                {isEib ? (
                  // Vista Especial EIB (Escala Tripartita Cualitativa contextual según rúbrica guardada en BD)
                  (() => {
                    const rubNo = activeDesempeno.rubrica?.find((r) => r.nivel === 'I')?.descripcion?.trim();
                    const rubParcial = activeDesempeno.rubrica?.find((r) => r.nivel === 'II')?.descripcion?.trim();
                    const rubSi = activeDesempeno.rubrica?.find((r) => r.nivel === 'III')?.descripcion?.trim();

                    const esPlanificacion =
                      activeDesempeno.descripcionCorta?.toUpperCase().includes('PLANIFICACIÓN') ||
                      activeDesempeno.descripcionCorta?.toUpperCase().includes('PLANIFICACION') ||
                      activeDesempeno.descripcionCorta?.toUpperCase().includes('DOCUMENTO') ||
                      activeDesempeno.descripcionCorta?.trim().startsWith('III');

                    const presetDefault = esPlanificacion
                      ? {
                          si: 'El criterio se evidencia de forma clara, consistente y alineada con el MSEIB.',
                          parcialmente: 'El criterio aparece parcialmente o con indicios, pero requiere ajustes o fortalecimiento.',
                          no: 'No se evidencia el criterio en el documento analizado.',
                        }
                      : {
                          si: 'El criterio se evidencia en el aula de forma clara, consistente y oportuna.',
                          parcialmente: 'El criterio aparece de manera parcial, incipiente o con necesidad de acompañamiento.',
                          no: 'No se observa evidencia de la práctica durante la sesión.',
                        };

                    const textoSi = rubSi && rubSi !== 'Sí' ? rubSi : presetDefault.si;
                    const textoParcial =
                      rubParcial && rubParcial !== 'Parcialmente' ? rubParcial : presetDefault.parcialmente;
                    const textoNo = rubNo && rubNo !== 'No' ? rubNo : presetDefault.no;

                    return (
                      <div className="space-y-4">
                        <div>
                          <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                            {esPlanificacion
                              ? 'Escala para Revisión de Documentos de Planificación Curricular'
                              : 'Escala para Observación Pedagógica en Aula'}
                          </span>
                          <p className="text-xs text-text-muted">
                            {esPlanificacion
                              ? 'Durante la revisión de los documentos de planificación, este ítem se califica según la evidencia documental:'
                              : 'Durante la observación en el aula, este ítem se califica según la práctica docente observada:'}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                          {/* Opción Sí */}
                          <div className="p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50/50 shadow-xs flex flex-col gap-2 transition-all hover:bg-emerald-50">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
                                <CheckCircle2 className="h-4 w-4" />
                              </span>
                              <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                                Sí
                              </span>
                            </div>
                            <p className="text-[11px] text-emerald-900 font-medium leading-relaxed">
                              {textoSi}
                            </p>
                          </div>

                          {/* Opción Parcialmente */}
                          <div className="p-4 rounded-xl border-2 border-amber-200 bg-amber-50/50 shadow-xs flex flex-col gap-2 transition-all hover:bg-amber-50">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-white shadow-xs">
                                <AlertTriangle className="h-4 w-4" />
                              </span>
                              <span className="text-xs font-black text-amber-800 uppercase tracking-wider">
                                Parcialmente
                              </span>
                            </div>
                            <p className="text-[11px] text-amber-900 font-medium leading-relaxed">
                              {textoParcial}
                            </p>
                          </div>

                          {/* Opción No */}
                          <div className="p-4 rounded-xl border-2 border-rose-200 bg-rose-50/50 shadow-xs flex flex-col gap-2 transition-all hover:bg-rose-50">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-white shadow-xs">
                                <XCircle className="h-4 w-4" />
                              </span>
                              <span className="text-xs font-black text-rose-800 uppercase tracking-wider">
                                No
                              </span>
                            </div>
                            <p className="text-[11px] text-rose-900 font-medium leading-relaxed">
                              {textoNo}
                            </p>
                          </div>
                        </div>

                        {/* Nota de Evidencias */}
                        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3 text-xs text-slate-600">
                          <MessageSquareQuote className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <p className="leading-relaxed">
                            {esPlanificacion ? (
                              <span>
                                <strong>Evidencias Documentales:</strong> En la columna observaciones se registran referencias a páginas o secciones de la planificación y notas de respaldo.
                              </span>
                            ) : (
                              <span>
                                <strong>Registro de Evidencias:</strong> El monitor registra notas descriptivas y compromisos de mejora pedagógica directamente sobre el ítem.
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  // Vista Estándar (Aspectos y Rúbricas por Niveles I a IV)
                  <>
                    {/* Checklist de Aspectos */}
                    {activeDesempeno.aspectos && activeDesempeno.aspectos.length > 0 && (
                      <div className="space-y-2.5">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                          Aspectos a Evaluar (Checklist de Cumplimiento)
                        </span>
                        <div className="grid grid-cols-1 gap-2">
                          {activeDesempeno.aspectos.map((asp, idx) => (
                            <div
                              key={asp.id}
                              className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-3 text-xs text-slate-700"
                            >
                              <span className="h-5 w-5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                                <Check className="h-3 w-3" strokeWidth={3} />
                              </span>
                              <div className="pt-0.5 leading-relaxed font-medium">
                                <strong>Indicador {idx + 1}:</strong> {asp.descripcion}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rúbrica de Calificación por Niveles */}
                    <div className="space-y-3 pt-1">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                        Rúbrica de Calificación por Niveles
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {plantilla.niveles.map((niv) => {
                          const rubDetail = activeDesempeno.rubrica?.find(
                            (r) => r.nivel === niv.nivel,
                          );
                          return (
                            <div
                              key={niv.nivel}
                              className="border border-slate-200 rounded-xl p-4 flex flex-col gap-2 bg-surface shadow-2xs relative overflow-hidden"
                            >
                              <div
                                className="absolute left-0 top-0 bottom-0 w-1.5"
                                style={{ backgroundColor: niv.color }}
                              />

                              <div className="pl-2 flex flex-col gap-1.5">
                                <span
                                  className="text-xs font-black uppercase tracking-wider"
                                  style={{ color: niv.color }}
                                >
                                  Nivel {niv.nivel} — {niv.denominacion}
                                </span>
                                <p className="text-[11px] text-slate-700 font-medium leading-relaxed">
                                  {rubDetail?.descripcion ||
                                    'Sin descripción registrada para este nivel.'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 py-16">
                <FileText className="h-10 w-10 mb-2 stroke-1" />
                <span className="text-xs font-semibold">Seleccione un ítem a la izquierda</span>
              </div>
            )}
          </div>
        </div>

        {/* Pie del Modal */}
        <div className="p-4 border-t border-border bg-slate-50 flex justify-end">
          <Button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-5 py-2 rounded-xl cursor-pointer shadow-xs"
          >
            Cerrar Vista Previa
          </Button>
        </div>
      </Card>
    </div>
  );
};
