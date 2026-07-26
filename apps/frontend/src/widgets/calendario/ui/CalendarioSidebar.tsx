/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  X,
  BookOpen,
  Calendar,
  Hash,
  GraduationCap,
  AlertCircle,
  Clock,
  PlayCircle,
  RefreshCw,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { useCronogramasData } from '@features/cronogramas/hooks/use-cronogramas-data';
import type { Cronograma } from '@entities/model-cronogramas';
import { useUser } from '@/entities/model-user';
import { usePlantillasList } from '@/entities/model-plantillas/use-plantillas-api';
import { LlenarFichaForm, ModalMigracionPlantilla } from '@/features/monitoreos';
import { FEATURES } from '@shared/config/features';
import { safeSetLocalStorage } from '@/shared/lib/utils';
import {
  SolicitarReprogramacionForm,
  DecidirReprogramacionForm
} from '@/features/reprogramaciones';

interface CalendarioSidebarProps {
  selectedVisitId: string | null;
  setSelectedVisitId: (id: string | null) => void;
  selectedDateStr: string;
  onClose: () => void;
  filteredVisits: Cronograma[];
}

const formatVisitDate = (fechaHoraStr: string) => {
  try {
    const d = new Date(fechaHoraStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    const parts = fechaHoraStr.split('T');
    return parts[0];
  } catch {
    return fechaHoraStr;
  }
};

const getVisitStatusBadgeClass = (estado: string) => {
  switch (estado) {
    case 'PROGRAMADO':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'EN_PROCESO':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    case 'COMPLETADO':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'REPROGRAMADO':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'CANCELADO':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

const getVisitColorDot = (estado: string) => {
  switch (estado) {
    case 'PROGRAMADO':
      return 'bg-blue-500';
    case 'EN_PROCESO':
      return 'bg-rose-500';
    case 'COMPLETADO':
      return 'bg-emerald-500';
    case 'REPROGRAMADO':
      return 'bg-amber-500';
    case 'CANCELADO':
      return 'bg-slate-400';
    default:
      return 'bg-slate-400';
  }
};

export const CalendarioSidebar = ({
  selectedVisitId,
  setSelectedVisitId,
  selectedDateStr,
  onClose,
  filteredVisits,
}: CalendarioSidebarProps) => {
  const { user } = useUser();
  const isEspecialista =
    user?.role === 'especialista' ||
    user?.role === 'coordinador_pedagogico' ||
    user?.role === 'jefe_taller';

const qc = useQueryClient();

const {
  cronogramas,
  reprogramaciones,
  submitRescheduleRequest,
  approveRescheduleRequest,
  rejectRescheduleRequest,
  deleteCronograma,
} = useCronogramasData();

  // Modales locales
  const [showFichaModal, setShowFichaModal] = useState<boolean>(false);
  const [showSolicitarReprogramarModal, setShowSolicitarReprogramarModal] = useState<boolean>(false);
  const [showReprogramarModal, setShowReprogramarModal] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showMigracionModal, setShowMigracionModal] = useState<boolean>(false);
  const [migracionContext, setMigracionContext] = useState<{
    visitId: string;
    plantillaVigenteId: string | null;
    plantillaVigenteNombre: string;
  } | null>(null);

  // Plantillas cargadas de la API (ya vienen mapeadas al modelo Plantilla del frontend)
  const { data: plantillas = [] } = usePlantillasList();

  const selectedVisit = useMemo(() => {
    if (!selectedVisitId) return null;
    return cronogramas.find((v) => v.id === selectedVisitId) || null;
  }, [cronogramas, selectedVisitId]);

  const activeRequest = useMemo(() => {
    if (!selectedVisit) return null;
    return reprogramaciones[selectedVisit.id] || null;
  }, [reprogramaciones, selectedVisit]);

  const canDecide = useMemo(() => {
    if (!selectedVisit || !user) return false;
    if (isEspecialista) return false;
    const isIERequest =
      activeRequest?.solicitanteRolAlCrear === 'coordinador_pedagogico' ||
      activeRequest?.solicitanteRolAlCrear === 'jefe_taller';

    if (user.role === 'jefe_gestion') {
      return !isIERequest;
    }
    if (user.role === 'jefe_area') {
      if (isIERequest) return false;
      if (user.especialistaNivel && selectedVisit.nivel !== user.especialistaNivel) return false;
      return true;
    }
    if (user.role === 'director_institucion') {
      if (selectedVisit.nivel !== 'Secundaria') return false;
      const isSameSchool = !!(
        (user.institucion && selectedVisit.institucionId === user.institucion) ||
        (user.institucionNombre &&
          selectedVisit.institucion.toLowerCase() === user.institucionNombre.toLowerCase())
      );
      return !!(isSameSchool && isIERequest);
    }
    return false;
  }, [selectedVisit, user, isEspecialista, activeRequest]);

  const visitsOnSelectedDate = useMemo(() => {
    return filteredVisits.filter((v) => v.fechaHora.substring(0, 10) === selectedDateStr);
  }, [filteredVisits, selectedDateStr]);

  const activeTemplate = useMemo(() => {
    if (!selectedVisit || !user) return null;
    const searchType = selectedVisit.tipo === 'DOCENTE' ? 'Monitoreo Docente' : 'Monitoreo Directivo';
    const isInstitucionRole =
      user.role === 'director_institucion' ||
      user.role === 'coordinador_pedagogico' ||
      user.role === 'jefe_taller';

    const matchTypeAndEstado = (p: (typeof plantillas)[number]) =>
      p.tipoMonitoreo === searchType && p.estado === 'Vigente';

    // Priority 1: plantilla de la IE (para roles institucionales)
    let matchedTemplate: (typeof plantillas)[number] | undefined;
    if (isInstitucionRole && user.institucion) {
      // Priorizar la plantilla creada por el propio evaluador (coordinador o jefe de taller)
      if (user.role === 'coordinador_pedagogico' || user.role === 'jefe_taller') {
        matchedTemplate = plantillas.find(
          (p) =>
            matchTypeAndEstado(p) &&
            p.creadoPorRole === 'director_ie' &&
            p.ieId === user.institucion &&
            p.creadoPorId === user.id,
        );
      }

      // Si no se encontró plantilla propia, buscar la de la IE (director_ie)
      if (!matchedTemplate) {
        matchedTemplate = plantillas.find(
          (p) => matchTypeAndEstado(p) && p.creadoPorRole === 'director_ie' && p.ieId === user.institucion,
        );
      }
    }

    // Priority 2: plantilla UGEL
    if (!matchedTemplate) {
      matchedTemplate = plantillas.find(
        (p) => matchTypeAndEstado(p) && (!p.creadoPorRole || p.creadoPorRole === 'jefe_gestion'),
      );
    }

    // Ultimate fallback
    return matchedTemplate ?? plantillas.find((p) => p.tipoMonitoreo === searchType && p.estado === 'Vigente') ?? plantillas[0] ?? null;
  }, [selectedVisit, plantillas, user]);

  // Determinar si el usuario actual es el evaluador autorizado para iniciar esta visita
  // Solo la persona asignada como especialista/coordinador/jefe de taller/director puede llenar la ficha.
  const isEvaluadorAutorizado = useMemo(() => {
    if (!selectedVisit || !user) return false;

    // Roles que pueden evaluar (deben coincidir con el asignado a la visita)
    const allowedRoles = [
      'especialista',
      'coordinador_pedagogico',
      'jefe_taller',
      'jefe_gestion',
      'jefe_area',
      'director_institucion',
    ];
    if (!allowedRoles.includes(user.role)) return false;

    // Si el usuario tiene Especialista vinculado, comparar por id
    if (user.especialistaId && selectedVisit.monitorId) {
      return user.especialistaId === selectedVisit.monitorId;
    }
    // Fallback: coincidencia por nombre (legacy)
    const userFullName = `${user.nombres} ${user.apellidos}`.toLowerCase();
    const visitEspecialista = selectedVisit.especialista.toLowerCase();
    return (
      userFullName.includes(visitEspecialista) ||
      visitEspecialista.includes(userFullName) ||
      visitEspecialista.includes(user.nombres.toLowerCase())
    );
  }, [selectedVisit, user, activeTemplate]);

  // Determinar si el día actual coincide con la fecha programada
  const isFechaCoincidente = useMemo(() => {
    if (!selectedVisit) return false;

    // Fecha actual real (en formato YYYY-MM-DD local)
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Fecha programada
    const visitDateStr = selectedVisit.fechaHora.substring(0, 10);

    return todayStr === visitDateStr;
  }, [selectedVisit]);

  const simulateFichaLlena = (visitId: string) => {
    const aspects: Record<string, boolean> = {
      d1_a1: true,
      d1_a2: true,
      d1_a3: true,
      d2_a1: true,
      d2_a2: true,
      d2_a3: true,
      ad2_1: true,
      ad2_2: true,
      ad2_3: true,
      ad3_1: true,
      ad3_2: true,
      ad3_3: true,
    };
    const levels: Record<string, string> = {
      d1: 'III',
      d2: 'III',
      d3: 'IV',
      dd1: 'III',
      dd2: 'III',
      dd3: 'IV',
    };
    const data = {
      checkedAspects: aspects,
      selectedLevels: levels,
      generalComments:
        'El monitoreo se desarrolló conforme a los compromisos de gestión. Se observa una adecuada planificación didáctica, alta concentración de alumnos en tareas significativas y un clima de aula respetuoso y participativo. Se recomienda continuar con las jornadas de reflexión interna.',
      sugerencias: 'Continuar fortaleciendo las competencias pedagógicas y de liderazgo directivo.',
      compromisos: 'El directivo se compromete a realizar un seguimiento mensual a las sugerencias brindadas.',
      rubricComments: {},
      respuestasEjeItem: {},
      evidenciaUrls: {},
    };
    if (!FEATURES.apiOnly) {
      safeSetLocalStorage(`sistema-monitoreo:ficha-state:${visitId}`, JSON.stringify(data));
    }
  };

  const handleSaveBorrador = async (
    visitId: string,
    data: {
      checkedAspects: Record<string, boolean>;
      selectedLevels: Record<string, string>;
      generalComments: string;
      sugerencias?: string;
      compromisos?: string;
      rubricComments?: Record<string, string>;
      preguntaExtraAnswers?: Record<string, boolean>;
      respuestasEjeItem?: Record<string, number>;
      evidenciaUrls?: Record<string, string>;
      observacionesEjeItem?: Record<string, string>;
      contexto?: {
        areaCurricular: string;
        grado: string;
        seccion: string;
        cantidadEstudiantes: number;
        cantidadEstudiantesNee: number;
      };
    }
  ) => {
    // Persistir localmente (UX inmediata)
    if (!FEATURES.apiOnly) {
      safeSetLocalStorage(`sistema-monitoreo:ficha-state:${visitId}`, JSON.stringify(data));
    }
    qc.setQueryData(['cronogramas'], (prev: any) =>
      Array.isArray(prev) ? prev.map((c: any) => (c.id === visitId ? { ...c, estado: 'EN_PROCESO' } : c)) : prev
    );

    // Persistir en backend (best-effort, no bloquea la UI)
    try {
      const { fichasApi } = await import('@/features/monitoreos/api/fichas.api');
      let ficha = await fichasApi.findByVisita(visitId);
      if (!ficha) {
        ficha = await fichasApi.create({
          cronogramaId: visitId,
          // Vincular la ficha a la plantilla que realmente se está usando (la del
          // actor), para que sus respuestas coincidan al renderizar/reportar.
          plantillaId: activeTemplate?.id,
          areaCurricular: data.contexto?.areaCurricular,
          grado: data.contexto?.grado,
          seccion: data.contexto?.seccion,
          cantidadEstudiantes: data.contexto?.cantidadEstudiantes,
          cantidadEstudiantesNee: data.contexto?.cantidadEstudiantesNee,
        });
      }
      // Guardar respuestas de desempeno (1-4)
      const desempenoMap = data.selectedLevels;
      for (const [desempenoId, nivelRoman] of Object.entries(desempenoMap)) {
        const obs = data.rubricComments?.[desempenoId];
        await fichasApi.saveRespuestaDesempeno(ficha.id, desempenoId, romanToNumber(nivelRoman), obs);
      }
      // Guardar respuestas de aspecto
      for (const [aspectoId, marcado] of Object.entries(data.checkedAspects)) {
        await fichasApi.saveRespuestaAspecto(ficha.id, aspectoId, marcado);
      }
      // Guardar respuestas de eje item
      if (data.respuestasEjeItem) {
        for (const [ejeItemId, nivel] of Object.entries(data.respuestasEjeItem)) {
          const evidenciaUrl = data.evidenciaUrls?.[ejeItemId];
          const observacion = data.observacionesEjeItem?.[ejeItemId];
          await fichasApi.saveRespuestaEjeItem(ficha.id, ejeItemId, nivel, evidenciaUrl, observacion);
        }
      }
      setShowFichaModal(false);
    } catch (err: unknown) {
      const apiErr = err as { response?: { status?: number; data?: { code?: string; plantillaVigenteId?: string; plantillaVigenteNombre?: string; message?: string } }; message?: string };
      if (apiErr?.response?.status === 409 && apiErr.response?.data?.code === 'PLANTILLA_VERSIONADA') {
        // ILA-0046: la plantilla paso a Historico, abrir modal de migracion
        setMigracionContext({
          visitId,
          plantillaVigenteId: apiErr.response.data.plantillaVigenteId ?? null,
          plantillaVigenteNombre: apiErr.response.data.plantillaVigenteNombre ?? 'Plantilla vigente',
        });
        setShowMigracionModal(true);
        return;
      }
      const msg = apiErr?.response?.data?.message || apiErr?.message || 'Error desconocido al guardar borrador.';
      alert(`Error: ${msg}`);
      console.warn('No se pudo persistir la ficha en backend:', err);
    }
  };

  const handleFinalizeMonitoreo = async (
    visitId: string,
    data: {
      checkedAspects: Record<string, boolean>;
      selectedLevels: Record<string, string>;
      generalComments: string;
      sugerencias?: string;
      compromisos?: string;
      rubricComments?: Record<string, string>;
      preguntaExtraAnswers?: Record<string, boolean>;
      respuestasEjeItem?: Record<string, number>;
      evidenciaUrls?: Record<string, string>;
      observacionesEjeItem?: Record<string, string>;
      contexto?: {
        areaCurricular: string;
        grado: string;
        seccion: string;
        cantidadEstudiantes: number;
        cantidadEstudiantesNee: number;
      };
    }
  ) => {
    safeSetLocalStorage(`sistema-monitoreo:ficha-state:${visitId}`, JSON.stringify(data));
    qc.setQueryData(['cronogramas'], (prev: any) =>
      Array.isArray(prev) ? prev.map((c: any) => (c.id === visitId ? { ...c, estado: 'COMPLETADO' } : c)) : prev
    );

    try {
      const { fichasApi } = await import('@/features/monitoreos/api/fichas.api');
      let ficha = await fichasApi.findByVisita(visitId);
      if (!ficha) {
        ficha = await fichasApi.create({
          cronogramaId: visitId,
          // Vincular la ficha a la plantilla que realmente se está usando (la del
          // actor), para que sus respuestas coincidan al renderizar/reportar.
          plantillaId: activeTemplate?.id,
          areaCurricular: data.contexto?.areaCurricular,
          grado: data.contexto?.grado,
          seccion: data.contexto?.seccion,
          cantidadEstudiantes: data.contexto?.cantidadEstudiantes,
          cantidadEstudiantesNee: data.contexto?.cantidadEstudiantesNee,
        });
      }
      for (const [desempenoId, nivelRoman] of Object.entries(data.selectedLevels)) {
        const obs = data.rubricComments?.[desempenoId];
        const extraRes = data.preguntaExtraAnswers?.[desempenoId];
        await fichasApi.saveRespuestaDesempeno(ficha.id, desempenoId, romanToNumber(nivelRoman), obs, extraRes);
      }
      for (const [aspectoId, marcado] of Object.entries(data.checkedAspects)) {
        await fichasApi.saveRespuestaAspecto(ficha.id, aspectoId, marcado);
      }
      if (data.respuestasEjeItem) {
        for (const [ejeItemId, nivel] of Object.entries(data.respuestasEjeItem)) {
          const evidenciaUrl = data.evidenciaUrls?.[ejeItemId];
          const observacion = data.observacionesEjeItem?.[ejeItemId];
          await fichasApi.saveRespuestaEjeItem(ficha.id, ejeItemId, nivel, evidenciaUrl, observacion);
        }
      }
      // Evidencias generales (slots GENERAL_1/2/3) se persisten como JSON en
      // evidenciaGeneral; si solo hay la clave legada 'GENERAL', se envía tal cual.
      const generalEvidencias = Object.fromEntries(
        Object.entries(data.evidenciaUrls ?? {}).filter(([k]) => k.startsWith('GENERAL')),
      );
      const evidenciaGeneralPayload =
        Object.keys(generalEvidencias).length > 0 ? JSON.stringify(generalEvidencias) : undefined;
      await fichasApi.finalizar(
        ficha.id,
        data.generalComments,
        data.sugerencias,
        data.compromisos,
        evidenciaGeneralPayload,
      );
      setShowFichaModal(false);
    } catch (err: unknown) {
      const apiErr = err as { response?: { status?: number; data?: { code?: string; plantillaVigenteId?: string; plantillaVigenteNombre?: string; message?: string } }; message?: string };
      if (apiErr?.response?.status === 409 && apiErr.response?.data?.code === 'PLANTILLA_VERSIONADA') {
        setMigracionContext({
          visitId,
          plantillaVigenteId: apiErr.response.data.plantillaVigenteId ?? null,
          plantillaVigenteNombre: apiErr.response.data.plantillaVigenteNombre ?? 'Plantilla vigente',
        });
        setShowMigracionModal(true);
        return;
      }
      const msg = apiErr?.response?.data?.message || apiErr?.message || 'Error desconocido al finalizar la ficha.';
      alert(`Error: ${msg}`);
      console.warn('No se pudo finalizar la ficha en backend:', err);
    }
  };

  const romanToNumber = (roman: string): number => {
    const map: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4 };
    return map[roman] || 1;
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirmId) return;
    deleteCronograma(deleteConfirmId);
    setDeleteConfirmId(null);
    setSelectedVisitId(null);
  };

  return (
    <div className="lg:col-span-4 bg-surface border border-border rounded-xl p-5 shadow-sm relative transition-all duration-300 animate-in fade-in slide-in-from-right-5">
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
        <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-1.5">
          <Sparkles className="h-4.5 w-4.5 text-primary" />
          <span>Detalles del Cronograma</span>
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          title="Cerrar Detalles"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {selectedVisit ? (
        <div className="space-y-4">
          {visitsOnSelectedDate.length > 1 && (
            <div className="space-y-1.5 border-b border-border pb-3.5 mb-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Visitas del día ({visitsOnSelectedDate.length})
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {visitsOnSelectedDate.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVisitId(v.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap border transition-all shadow-sm cursor-pointer ${
                      selectedVisitId === v.id
                        ? 'bg-primary text-white border-primary shadow'
                        : 'bg-surface text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Visita {v.nroVisita} ({v.especialistaInitials})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Badge de Solicitud de Cambio Pendiente (Para el Jefe de Gestión) */}
          {activeRequest && activeRequest.estado === 'PENDIENTE' && canDecide && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-bold flex items-start gap-2 shadow-sm animate-pulse">
              <AlertCircle className="h-4.5 w-4.5 text-amber-600 mt-0.5 shrink-0" />
              <span>Solicitud de Reprogramación Pendiente</span>
            </div>
          )}

          <div className="flex justify-start">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wider ${getVisitStatusBadgeClass(
                selectedVisit.estado
              )}`}
            >
              <span className={`h-2 w-2 rounded-full ${getVisitColorDot(selectedVisit.estado)}`}></span>
              {selectedVisit.estado}
            </span>
          </div>

          <div className="space-y-3.5 pt-1">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                Institución Educativa
              </span>
              <div className="flex items-start gap-2 text-slate-800">
                <BookOpen className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="text-sm font-bold tracking-tight">{selectedVisit.institucion}</div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                Especialista Responsable
              </span>
              <div className="flex items-start gap-2 text-slate-800">
                <div className="h-6 w-6 rounded-full bg-primary-light border border-primary/20 text-[10px] font-black text-primary flex items-center justify-center shrink-0 animate-pulse">
                  {selectedVisit.especialistaInitials}
                </div>
                <div className="text-sm font-semibold pt-0.5 leading-none">
                  {selectedVisit.especialista}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                Evaluado ({selectedVisit.tipo})
              </span>
              <div className="flex items-start gap-2 text-slate-800">
                <GraduationCap className="h-4.5 w-4.5 text-primary mt-0.5 shrink-0" />
                <div className="text-sm font-medium">{selectedVisit.docenteDirectivo}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-b border-slate-100 py-3 my-2">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                  Fecha Programada
                </span>
                <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
                  <Calendar className="h-4 w-4 text-primary shrink-0" />
                  <span>{formatVisitDate(selectedVisit.fechaHora)}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                  Nº Visita
                </span>
                <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
                  <Hash className="h-4 w-4 text-primary shrink-0" />
                  <span>Visita {selectedVisit.nroVisita}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                  Modalidad
                </span>
                <div className="text-xs text-slate-700 font-medium">{selectedVisit.modalidad}</div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                  Nivel Educativo
                </span>
                <div className="text-xs text-slate-700 font-medium">{selectedVisit.nivel}</div>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                Detalles / Indicaciones
              </span>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-600 shadow-inner leading-relaxed">
                {selectedVisit.observaciones || 'Sin indicaciones o detalles adicionales registrados.'}
              </div>
            </div>

            {selectedVisit.estado === 'REPROGRAMADO' && activeRequest?.aprobador && (
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl text-emerald-800 text-[11px] font-medium leading-relaxed flex items-start gap-2 shadow-sm animate-in fade-in duration-200 mt-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>
                  <strong>Reprogramación Autorizada:</strong> Cambio aprobado por{' '}
                  <strong>{activeRequest.aprobador}</strong>.
                  {activeRequest.aprobadorComentario && (
                    <span className="block mt-1 font-normal italic text-slate-600">
                      "{activeRequest.aprobadorComentario}"
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="space-y-2 pt-4 border-t border-border mt-6">
            {isEvaluadorAutorizado ? (
              <>
                {(selectedVisit.estado === 'PROGRAMADO' || selectedVisit.estado === 'EN_PROCESO' || selectedVisit.estado === 'REPROGRAMADO') && (
                  <div className="flex flex-col gap-2.5">
                    {/* Advertencia si no es la fecha programada */}
                    {(selectedVisit.estado === 'PROGRAMADO' || selectedVisit.estado === 'REPROGRAMADO') && !isFechaCoincidente && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] font-semibold flex items-start gap-2 shadow-sm animate-in fade-in duration-200">
                        <AlertTriangle className="h-4.5 w-4.5 text-amber-600 mt-0.5 shrink-0" />
                        <span>
                          <strong>Restricción de Fecha:</strong> Solo puede iniciar esta visita el día programado ({formatVisitDate(selectedVisit.fechaHora)}).
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        disabled={(selectedVisit.estado === 'PROGRAMADO' || selectedVisit.estado === 'REPROGRAMADO') && !isFechaCoincidente}
                        onClick={() => setShowFichaModal(true)}
                        className="flex-1 justify-center border-emerald-600 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50 disabled:bg-slate-50 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors font-bold text-xs py-2.5 h-10 flex items-center gap-2 cursor-pointer"
                      >
                        <PlayCircle className="h-4.5 w-4.5" />
                        <span>
                          {(selectedVisit.estado === 'PROGRAMADO' || selectedVisit.estado === 'REPROGRAMADO') ? 'Iniciar Monitoreo' : 'Continuar Monitoreo'}
                        </span>
                      </Button>

                      {/* Reprogramar: para el Especialista, Coordinador Pedagógico o Jefe de Taller */}
                      {(user?.role === 'especialista' ||
                        user?.role === 'coordinador_pedagogico' ||
                        user?.role === 'jefe_taller') && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (activeRequest) {
                              setShowReprogramarModal(true);
                            } else {
                              setShowSolicitarReprogramarModal(true);
                            }
                          }}
                          className="border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-semibold text-xs py-2.5 h-10 flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <RefreshCw className="h-3.5 w-3.5 text-primary" />
                          <span>{activeRequest ? 'Ver Solicitud' : 'Reprogramar'}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {(selectedVisit.estado === 'PROGRAMADO' || selectedVisit.estado === 'EN_PROCESO' || selectedVisit.estado === 'REPROGRAMADO') && (
                  <div className="flex flex-col gap-2">
                    <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-blue-800 text-[11px] font-medium leading-relaxed flex items-start gap-2 shadow-sm animate-in fade-in duration-200">
                      <Clock className="h-4.5 w-4.5 text-blue-500 mt-0.5 shrink-0" />
                      <span>
                        <strong>Acceso Restringido:</strong> Solo la persona asignada ({' '}
                        <strong>{selectedVisit.especialista}</strong>) puede ejecutar esta ficha de monitoreo.
                      </span>
                    </div>

                    {activeRequest && selectedVisit.estado !== 'REPROGRAMADO' && (
                      <Button
                        variant="outline"
                        onClick={() => setShowReprogramarModal(true)}
                        className="w-full justify-center border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs py-2 h-10 flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5 text-primary" />
                        <span>Ver Solicitud de Cambio ({activeRequest.estado})</span>
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}

            {selectedVisit.estado === 'COMPLETADO' && (
              <div className="flex flex-col gap-2">
                <div className="text-center p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 font-bold text-xs flex items-center justify-center gap-1.5 shadow-inner">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Visita Realizada con Éxito</span>
                </div>

                <Button
                  variant="outline"
                  onClick={async () => {
                    const saved = localStorage.getItem(`sistema-monitoreo:ficha-state:${selectedVisit.id}`);
                    if (!saved) {
                      try {
                        const { fichasApi } = await import('@/features/monitoreos/api/fichas.api');
                        const ficha = await fichasApi.findByVisita(selectedVisit.id);
                        if (ficha) {
                          const checkedAspects: Record<string, boolean> = {};
                          for (const r of ficha.respuestasAspecto) {
                            checkedAspects[r.aspectoId] = r.marcado;
                          }
                          const selectedLevels: Record<string, string> = {};
                          const rubricComments: Record<string, string> = {};
                          const romanMap = ['I', 'II', 'III', 'IV'];
                          for (const r of ficha.respuestasDesempeno) {
                            selectedLevels[r.desempenoId] = romanMap[r.nivel - 1] || 'I';
                            if (r.observaciones) {
                              rubricComments[r.desempenoId] = r.observaciones;
                            }
                          }
                          const respuestasEjeItem: Record<string, number> = {};
                          const evidenciaUrls: Record<string, string> = {};
                          const observacionesEjeItem: Record<string, string> = {};
                          for (const r of ficha.respuestasEjeItem || []) {
                            respuestasEjeItem[r.ejeItemId] = r.nivel;
                            if (r.evidenciaUrl) evidenciaUrls[r.ejeItemId] = r.evidenciaUrl;
                            if (r.observacion) observacionesEjeItem[r.ejeItemId] = r.observacion;
                          }
                          // Evidencia general: JSON con slots GENERAL_1/2/3, o cadena legada.
                          if (ficha.evidenciaGeneral) {
                            const raw = ficha.evidenciaGeneral;
                            if (raw.trim().startsWith('{')) {
                              try {
                                Object.assign(evidenciaUrls, JSON.parse(raw) as Record<string, string>);
                              } catch {
                                evidenciaUrls['GENERAL'] = raw;
                              }
                            } else {
                              evidenciaUrls['GENERAL'] = raw;
                            }
                          }
                          const mappedData = {
                            checkedAspects,
                            selectedLevels,
                            generalComments: ficha.observaciones || '',
                            sugerencias: ficha.sugerencias || '',
                            compromisos: ficha.compromisos || '',
                            rubricComments,
                            respuestasEjeItem,
                            evidenciaUrls,
                            observacionesEjeItem,
                            contexto: ficha.contexto,
                          };
                          safeSetLocalStorage(`sistema-monitoreo:ficha-state:${selectedVisit.id}`, JSON.stringify(mappedData));
                        } else {
                          simulateFichaLlena(selectedVisit.id);
                        }
                      } catch (e) {
                        console.error(e);
                        simulateFichaLlena(selectedVisit.id);
                      }
                    }
                    setShowFichaModal(true);
                  }}
                  className="w-full justify-center border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold py-2 cursor-pointer"
                >
                  Ver Ficha de Monitoreo Llena
                </Button>

                {activeRequest && (
                  <Button
                    variant="outline"
                    onClick={() => setShowReprogramarModal(true)}
                    className="w-full justify-center border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs py-2 h-9 flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-primary" />
                    <span>Ver Historial de Reprogramación</span>
                  </Button>
                )}
              </div>
            )}

            {selectedVisit.estado === 'REPROGRAMADO' && !isEvaluadorAutorizado && (
              <div className="flex flex-col gap-2">
                <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-amber-800 text-[11px] font-medium leading-relaxed flex items-start gap-2 shadow-sm animate-in fade-in duration-200">
                  <AlertTriangle className="h-4.5 w-4.5 text-amber-500 mt-0.5 shrink-0" />
                  <span>
                    <strong>Visita Reprogramada:</strong> La fecha original fue modificada. Se encuentra pendiente de
                    ser iniciada por el especialista en la nueva fecha.
                  </span>
                </div>

                {activeRequest && (
                  <Button
                    variant="outline"
                    onClick={() => setShowReprogramarModal(true)}
                    className="w-full justify-center border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs py-2 h-9 flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-primary" />
                    <span>Ver Detalle de Reprogramación</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center text-slate-300">
          <Calendar className="h-10 w-10 mb-2 stroke-1" />
          <span className="text-xs font-semibold">Selecciona un día en el calendario</span>
        </div>
      )}

      {/* Feature Modals rendered inside the widget */}
      {selectedVisit && activeTemplate && (
        <LlenarFichaForm
          isOpen={showFichaModal}
          onClose={() => setShowFichaModal(false)}
          visit={selectedVisit}
          template={activeTemplate}
          onSave={handleSaveBorrador}
          onFinalize={handleFinalizeMonitoreo}
        />
      )}

      {selectedVisit && (
        <SolicitarReprogramacionForm
          isOpen={showSolicitarReprogramarModal}
          onClose={() => setShowSolicitarReprogramarModal(false)}
          visit={selectedVisit}
          onSubmit={(data) => {
            submitRescheduleRequest(selectedVisit.id, {
              fechaOriginal: selectedVisit.fechaHora,
              fechaNueva: data.fechaNueva,
              motivo: data.motivo,
            });
            setShowSolicitarReprogramarModal(false);
          }}
        />
      )}

      {selectedVisit && activeRequest && (
        <DecidirReprogramacionForm
          isOpen={showReprogramarModal}
          onClose={() => setShowReprogramarModal(false)}
          visit={selectedVisit}
          request={activeRequest}
          canDecide={canDecide}
          onApprove={(visitId, comment) => {
            approveRescheduleRequest(
              visitId,
              user ? `${user.nombres} ${user.apellidos}` : 'Carlos Mendoza',
              comment
            );
            setShowReprogramarModal(false);
          }}
          onReject={(visitId, comment) => {
            rejectRescheduleRequest(
              visitId,
              user ? `${user.nombres} ${user.apellidos}` : 'Carlos Mendoza',
              comment
            );
            setShowReprogramarModal(false);
          }}
        />
      )}

      {deleteConfirmId && (
        <ConfirmModal
          title="¿Desea eliminar este cronograma?"
          message={
            <span>
              Esta acción eliminará de forma lógica el cronograma de visita programada para esta institución.
            </span>
          }
          confirmLabel="Eliminar Cronograma"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirmId(null)}
          danger
        />
      )}

      {migracionContext && (
        <ModalMigracionPlantilla
          isOpen={showMigracionModal}
          onClose={() => {
            setShowMigracionModal(false);
            setMigracionContext(null);
          }}
          fichaId={migracionContext.visitId}
          plantillaActualId=""
          plantillaNuevaId={migracionContext.plantillaVigenteId ?? ''}
          plantillaNuevaNombre={migracionContext.plantillaVigenteNombre}
          onMigrar={async () => {
            const { fichasApi } = await import('@/features/monitoreos/api/fichas.api');
            const ficha = await fichasApi.findByVisita(migracionContext.visitId);
            if (ficha && migracionContext.plantillaVigenteId) {
              await fichasApi.migrarPlantilla(ficha.id, migracionContext.plantillaVigenteId);
            }
            setShowMigracionModal(false);
            setMigracionContext(null);
            setShowFichaModal(false);
          }}
          onFinalizarConV1={async () => {
            setShowMigracionModal(false);
            setMigracionContext(null);
            setShowFichaModal(false);
          }}
        />
      )}
    </div>
  );
};
