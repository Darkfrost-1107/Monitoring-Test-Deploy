import { useState, useMemo } from 'react';
import {
  Compass,
  RefreshCw,
  PlusCircle,
  User,
  ArrowRight,
  Paperclip
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { useCronogramasData } from '@features/cronogramas/hooks/use-cronogramas-data';
import type { Cronograma } from '@entities/model-cronogramas';
import {
  puedeDecidirReprogramacion,
  esSolicitudDeInstitucion,
  type SolicitudReprogramacion,
} from '@/entities/model-reprogramaciones';
import { useUser } from '@/entities/model-user';
import { useScope } from '@shared/auth';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';
import {
  SolicitarReprogramacionForm,
  DecidirReprogramacionForm
} from '@/features/reprogramaciones';
import { formatearFechaCorta } from '@shared/lib/fecha/fecha';


export const BandejaReprogramaciones = () => {
  const { user } = useUser();
  // Quien levanta la ficha en el aula: solicita reprogramaciones, no las decide.
  const { isMonitorCampo } = useScope();

  const canDecideRequest = (visit: Cronograma, req?: SolicitudReprogramacion) =>
    puedeDecidirReprogramacion(user, visit, req?.solicitanteRolAlCrear);

  const {
    cronogramas,
    reprogramaciones,
    submitRescheduleRequest,
    approveRescheduleRequest,
    rejectRescheduleRequest,
  } = useCronogramasData();

  // Filtro local de estado de solicitud
  const [filterRequestStatus, setFilterRequestStatus] = useState<'Todos' | 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'>('Todos');

  // Modales de reprogramación locales
  const [showReprogramarModal, setShowReprogramarModal] = useState<boolean>(false);
  const [showSolicitarReprogramarModal, setShowSolicitarReprogramarModal] = useState<boolean>(false);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);

  const specialistFilterName = useMemo(() => {
    if (!user) return '';
    return `${user.nombres} ${user.apellidos}`;
  }, [user]);

  // Obtener todas las solicitudes
  const allRequests = useMemo(() => {
    const list: Array<SolicitudReprogramacion & { visit: Cronograma }> = [];
    cronogramas.forEach((visit) => {
      const req = reprogramaciones[visit.id];
      if (req) {
        list.push({
          ...req,
          visit,
        });
      }
    });
    // Ordenar por fecha de registro (más recientes primero)
    return list.sort((a, b) => new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime());
  }, [cronogramas, reprogramaciones]);

  // Solicitudes filtradas
  const filteredRequests = useMemo(() => {
    return allRequests.filter((req) => {
      // 1. Requesters (Specialists, Coordinators, Workshop Heads) only see their own requests
      if (isMonitorCampo && req.visit.especialista !== specialistFilterName) {
        return false;
      }

      // 2. Deciders filter:
      if (!isMonitorCampo) {
        const esDeInstitucion = esSolicitudDeInstitucion(req.solicitanteRolAlCrear);
        const isDirector = user?.role === RoleCode.DIRECTOR_INSTITUCION;
        if (isDirector) {
          // Director only sees requests from their own school AND created at IE level (CP or JT)
          const isSameSchool =
            (user.institucion && req.visit.institucionId === user.institucion) ||
            (user.institucionNombre &&
              req.visit.institucion.toLowerCase() === user.institucionNombre.toLowerCase());

          if (!isSameSchool || !esDeInstitucion) {
            return false;
          }
        } else {
          // Jefe de Gestión / Admin / Jefe de Área only see requests from Specialists (UGEL)
          if (esDeInstitucion) {
            return false;
          }

          // Filtro adicional para Jefe de Área: solo ver de su nivel
          if (user?.role === RoleCode.JEFE_AREA) {
            if (user.especialistaNivel && req.visit.nivel !== user.especialistaNivel) return false;
          }
        }
      }

      if (filterRequestStatus !== 'Todos' && req.estado !== filterRequestStatus) {
        return false;
      }
      return true;
    });
  }, [allRequests, isMonitorCampo, specialistFilterName, filterRequestStatus, user]);

  const selectedVisit = useMemo(() => {
    return cronogramas.find((c) => c.id === selectedVisitId) || null;
  }, [cronogramas, selectedVisitId]);

  const activeRequest = useMemo(() => {
    if (!selectedVisitId) return null;
    return reprogramaciones[selectedVisitId] || null;
  }, [reprogramaciones, selectedVisitId]);

  const [futureVisits, setFutureVisits] = useState<Cronograma[]>([]);

  const handleNewRequestClick = () => {
    const visits = cronogramas.filter(
      (v) => v.especialista === specialistFilterName && v.estado === 'PROGRAMADO'
    );
    if (visits.length > 0) {
      setFutureVisits(visits);
      setSelectedVisitId(visits[0].id);
      setShowSolicitarReprogramarModal(true);
    } else {
      alert('No tienes visitas programadas a futuro disponibles para reprogramar.');
    }
  };

  const handleOpenReview = (visitId: string) => {
    setSelectedVisitId(visitId);
    setShowReprogramarModal(true);
  };

  return (
    <Card className="p-6 border border-border bg-surface shadow-sm space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary animate-spin-hover" />
            <span>Bandeja de Solicitudes de Reprogramación</span>
          </h3>
          <p className="text-xs text-text-muted mt-1">
            {isMonitorCampo
              ? 'Revisa el estado de tus solicitudes enviadas o registra una nueva reprogramación para tus visitas a futuro.'
              : user?.role === RoleCode.DIRECTOR_INSTITUCION
                ? 'Audita y aprueba o rechaza los cambios de fecha propuestos por los coordinadores pedagógicos y jefes de taller.'
                : 'Audita y aprueba o rechaza los cambios de fecha propuestos por los especialistas de monitoreo.'}
          </p>
        </div>

        {isMonitorCampo && (
          <Button
            onClick={handleNewRequestClick}
            className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 h-10 rounded-xl flex items-center gap-1.5 shadow cursor-pointer"
          >
            <PlusCircle className="h-4.5 w-4.5" />
            <span>Nueva Solicitud</span>
          </Button>
        )}
      </div>

      {/* Filtros de la bandeja */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 shrink-0">
          Filtrar Estado:
        </span>
        {(['Todos', 'PENDIENTE', 'APROBADO', 'RECHAZADO'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterRequestStatus(status)}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              filterRequestStatus === status
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-surface text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {status === 'Todos' ? 'Todos' : status}
          </button>
        ))}
      </div>

      {/* Contenido / Listado */}
      {filteredRequests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
          {filteredRequests.map((req) => (
            <Card
              key={req.id}
              className="p-5 border border-slate-100 hover:border-primary/20 hover:shadow-md transition-all bg-surface flex flex-col justify-between gap-4 relative overflow-hidden"
            >
              <div
                className="absolute left-0 top-0 bottom-0 w-1.5"
                style={{
                  backgroundColor:
                    req.estado === 'APROBADO'
                      ? '#10b981'
                      : req.estado === 'RECHAZADO'
                        ? '#ef4444'
                        : '#f59e0b',
                }}
              />

              <div className="space-y-3 pl-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black text-slate-400">ID: {req.id}</span>
                  <Badge
                    className={`font-black text-[9px] uppercase tracking-wider ${
                      req.estado === 'APROBADO'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : req.estado === 'RECHAZADO'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {req.estado}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-800 tracking-tight leading-snug line-clamp-1">
                    {req.visit.institucion}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
                    <User className="h-3 w-3 inline text-slate-400" />
                    <span>Especialista: {req.visit.especialista}</span>
                  </p>
                </div>

                <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3 grid grid-cols-7 items-center gap-1.5 text-center text-xs font-semibold text-slate-700">
                  <div className="col-span-3 space-y-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      Original
                    </span>
                    <span className="font-semibold text-slate-500 line-through truncate block">
                      {formatearFechaCorta(req.fechaOriginal)}
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
                      {formatearFechaCorta(req.fechaNueva)}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50/30 p-2.5 rounded-lg border border-slate-100/60">
                  <strong>Motivo:</strong> "{req.motivo}"
                </div>

                {req.archivoNombre && (
                  <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 bg-slate-50 p-1.5 rounded-md border border-slate-100 w-fit max-w-full">
                    <Paperclip className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="truncate">{req.archivoNombre}</span>
                  </div>
                )}
              </div>

              <div className="pl-2 pt-2 border-t border-slate-50 flex items-center justify-between gap-3">
                <span className="text-[10px] text-slate-400 font-semibold">
                  Solicitado el: {req.fechaRegistro}
                </span>

                {req.estado === 'PENDIENTE' && canDecideRequest(req.visit, req) ? (
                  <Button
                    onClick={() => handleOpenReview(req.visit.id)}
                    className="bg-primary hover:bg-primary-hover text-white text-[11px] font-black h-8 px-4 rounded-lg flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3 animate-spin-hover" />
                    <span>Revisar y Decidir</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => handleOpenReview(req.visit.id)}
                    className="border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-semibold h-8 px-4 rounded-lg cursor-pointer"
                  >
                    <span>Ver Trazabilidad</span>
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
          <Compass className="h-12 w-12 text-slate-300 mx-auto stroke-[1.2] mb-3" />
          <h3 className="text-slate-700 font-bold text-sm">Sin solicitudes encontradas</h3>
          <p className="text-text-muted text-xs mt-1.5 max-w-xs mx-auto leading-relaxed">
            No existen solicitudes de reprogramación que coincidan con el estado seleccionado.
          </p>
        </div>
      )}

      {/* Feature Modals */}
      {selectedVisit && (
        <SolicitarReprogramacionForm
          isOpen={showSolicitarReprogramarModal}
          onClose={() => setShowSolicitarReprogramarModal(false)}
          visit={selectedVisit}
          availableVisits={futureVisits}
          onSubmit={(data) => {
            submitRescheduleRequest(data.visitId, {
              fechaOriginal: data.fechaOriginal,
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
          canDecide={canDecideRequest(selectedVisit, activeRequest)}
          onApprove={(visitId, comment) => {
            approveRescheduleRequest(visitId, user ? `${user.nombres} ${user.apellidos}` : 'Carlos Mendoza', comment);
            setShowReprogramarModal(false);
          }}
          onReject={(visitId, comment) => {
            rejectRescheduleRequest(visitId, user ? `${user.nombres} ${user.apellidos}` : 'Carlos Mendoza', comment);
            setShowReprogramarModal(false);
          }}
        />
      )}
    </Card>
  );
};
