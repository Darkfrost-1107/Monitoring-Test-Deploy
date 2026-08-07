import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { STALE_TIMES, PAGINATION } from '@shared/config/constants';
import { cronogramasApi } from '@features/cronogramas/api/cronogramas.api';
import { useCrearVisita, useActualizarVisita, useEliminarVisita } from '@features/cronogramas/api/use-cronogramas-api';
import { especialistasApi } from '@shared/api/especialistas.api';
import { institutionsApi } from '@shared/api/institutions.api';
import { teachersApi } from '@shared/api/teachers.api';
import { mapApiDocenteToFrontend } from '@features/docentes/docente-service';
import type { Cronograma } from '@entities/model-cronogramas';
import type { SolicitudReprogramacion } from '@entities/model-reprogramaciones';
import type { Docente } from '@entities/model-docentes';
import type { ICreateVisitaRequest, IUpdateVisitaRequest } from '@sistema-monitoreo/shared-contracts';

export interface EspecialistaLite {
  id: string;
  nombre: string;
  initials: string;
  modalidad: string;
  nivelEducativo: string;
  cargo: string;
  especialidades?: string[];
  activo: boolean;
  dni?: string;
  correo?: string;
  celular?: string;
}

export interface InstitucionLite {
  id: string;
  nombre: string;
  modalidad: string;
  nivelEducativo: string;
  estado: string;
  activo: boolean;
  codigoModular?: string;
  director?: string;
  directorDni?: string;
  directorTelefono?: string;
  directorCorreo?: string;
}

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export const useCronogramasData = (enabled = true) => {
  const qc = useQueryClient();

  const cronosQuery = useQuery({
    queryKey: ['cronogramas'],
    queryFn: () => cronogramasApi.findAll(),
    staleTime: STALE_TIMES.DEFAULT,
    enabled,
  });

  const espQuery = useQuery({
    queryKey: ['especialistas-lite'],
    queryFn: () => especialistasApi.findAll(),
    staleTime: STALE_TIMES.REPORTES,
    enabled,
  });

  const instQuery = useQuery({
    queryKey: ['instituciones-lite'],
    queryFn: () => institutionsApi.findAll({ limit: PAGINATION.MAX_LIMIT }),
    staleTime: STALE_TIMES.REPORTES,
    enabled,
  });

  const docQuery = useQuery({
    queryKey: ['docentes-lite'],
    queryFn: () => teachersApi.findAll(),
    staleTime: STALE_TIMES.REPORTES,
    enabled,
  });

  const solQuery = useQuery({
    queryKey: ['solicitudes-all'],
    queryFn: () => cronogramasApi.findAllSolicitudes(),
    staleTime: STALE_TIMES.DEFAULT,
    enabled,
  });

  const isLoading = cronosQuery.isLoading || espQuery.isLoading || instQuery.isLoading || docQuery.isLoading;

  const especialistas: EspecialistaLite[] = useMemo(() => {
    if (!espQuery.data?.ok || !espQuery.data?.data) return [];
    return espQuery.data.data.map((e) => ({
      id: e.id,
      nombre: `${e.persona.nombres} ${e.persona.apellidos}`,
      initials: getInitials(`${e.persona.nombres} ${e.persona.apellidos}`),
      modalidad: e.modalidad || 'EBR',
      nivelEducativo: e.nivelEducativo || 'Primaria',
      cargo: e.cargo || 'Especialista',
      especialidades: e.especialidades || [],
      activo: e.estado === 'Activo',
      dni: e.persona.dni,
      correo: e.persona.correo || '',
      celular: e.persona.telefono || '',
    }));
  }, [espQuery.data]);

  const instituciones: InstitucionLite[] = useMemo(() => {
    if (!instQuery.data?.ok || !instQuery.data?.data) return [];
    const raw = instQuery.data.data;
    return (Array.isArray(raw) ? raw : raw.data ?? []).map((i) => ({
      id: i.id,
      nombre: i.nombre,
      modalidad: i.modalidad || 'EBR',
      nivelEducativo: i.nivelEducativo,
      estado: i.estado || 'Inactiva',
      activo: i.estado === 'Activa' || i.estado === 'Activo',
      codigoModular: i.codigoModular,
      director: i.director,
      directorDni: i.directorDni,
      directorTelefono: i.directorTelefono,
      directorCorreo: i.directorCorreo,
    }));
  }, [instQuery.data]);

  const docentes: Docente[] = useMemo(() => {
    if (!docQuery.data?.ok || !docQuery.data?.data) return [];
    return docQuery.data.data.map((d) => mapApiDocenteToFrontend(d));
  }, [docQuery.data]);

  const cronogramas: Cronograma[] = useMemo(() => {
    if (!cronosQuery.data) return [];
    return cronosQuery.data.map((c) => {
      const esp = especialistas.find(e => e.id === c.monitorId);
      const inst = instituciones.find(i => i.id === c.institucionId);
      const doc = docentes.find(d => d.id === c.evaluadoId);
      return {
        id: c.id,
        fechaHora: `${String(c.fechaProgramada).split('T')[0]}T${c.horaInicio}`,
        especialista: esp ? esp.nombre : 'Sin Asignar',
        especialistaInitials: esp ? esp.initials : 'SA',
        institucion: inst ? inst.nombre : 'Sin I.E.',
        docenteDirectivo: doc ? `${doc.nombres} ${doc.apellidos}` : 'Sin Docente',
        tipo: c.tipoMonitoreo as 'DOCENTE' | 'DIRECTIVO',
        nroVisita: String(c.numeroVisita).padStart(2, '0'),
        estado: c.estado as Cronograma['estado'],
        modalidad: c.modalidad,
        nivel: c.nivelEducativo,
        observaciones: c.detalles ?? undefined,
        especialistaCargo: esp ? esp.cargo : 'Especialista',
        monitorId: c.monitorId,
        evaluadoId: c.evaluadoId,
        institucionId: c.institucionId,
        monitorEspecialidades: esp?.especialidades,
      };
    });
  }, [cronosQuery.data, especialistas, instituciones, docentes]);

  const reprogramaciones: Record<string, SolicitudReprogramacion> = useMemo(() => {
    if (!solQuery.data) return {};
    const solMap: Record<string, SolicitudReprogramacion> = {};
    solQuery.data.forEach((s) => {
      solMap[s.cronogramaId] = {
        id: s.id,
        fechaOriginal: `${s.fechaOriginal}T${s.horaOriginal}`,
        fechaNueva: `${s.fechaPropuesta}T${s.horaPropuesta}`,
        motivo: s.justificacion,
        archivoNombre: s.archivoSustentoUrl && s.archivoSustentoUrl !== '' ? (s.archivoSustentoUrl.split('/').pop() || 'oficio.pdf') : '',
        estado: s.estado as 'PENDIENTE' | 'APROBADO' | 'RECHAZADO',
        fechaRegistro: s.createdAt,
        aprobador: s.resueltoPorNombre
          ? `${s.resueltoPorRol || ''} ${s.resueltoPorNombre}`.trim()
          : (s.resueltoPorId || undefined),
        aprobadorComentario: s.comentarioResolucion || undefined,
        fechaAprobacion: s.fechaResolucion || undefined,
        solicitanteRolAlCrear: s.solicitanteRolAlCrear,
      };
    });
    return solMap;
  }, [solQuery.data]);

  const crearVisita = useCrearVisita();
  const actualizarVisita = useActualizarVisita();
  const eliminarVisita = useEliminarVisita();

  const createCronograma = async (payload: ICreateVisitaRequest) => {
    const creada = await crearVisita.mutateAsync(payload);
    qc.invalidateQueries({ queryKey: ['cronogramas'] });
    return creada;
  };

  const updateCronograma = async (id: string, payload: IUpdateVisitaRequest) => {
    await actualizarVisita.mutateAsync({ id, data: payload });
  };

  const deleteCronograma = async (id: string) => {
    await eliminarVisita.mutateAsync(id);
  };

  const refetch = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['cronogramas'] }),
      qc.invalidateQueries({ queryKey: ['solicitudes-all'] }),
    ]);
  };

  const submitRescheduleRequest = (
    visitId: string,
    request: { fechaOriginal: string; fechaNueva: string; motivo: string; archivoNombre?: string; archivoBase64?: string },
  ) => {
    const [datePart, timePart] = request.fechaNueva.split('T');
    const formattedTime = timePart ? (timePart + ':00').slice(0, 8) : '00:00:00';
    cronogramasApi.crearSolicitud({
      cronogramaId: visitId,
      fechaPropuesta: datePart,
      horaPropuesta: formattedTime,
      justificacion: request.motivo,
      archivoSustentoNombre: request.archivoNombre,
      archivoSustentoBase64: request.archivoBase64,
    }).then(() => qc.invalidateQueries({ queryKey: ['solicitudes-all'] }))
      .catch((err) => console.warn('[cronograma] No se pudo crear solicitud:', err));
  };

  const approveRescheduleRequest = (visitId: string, _aprobador: string, comentario: string) => {
    cronogramasApi.findAllSolicitudes({ cronogramaId: visitId, estado: 'PENDIENTE' })
      .then((solicitudes) => {
        const solicitud = solicitudes[0];
        if (solicitud) {
          return cronogramasApi.aprobarSolicitud(solicitud.id, comentario || 'Aprobado');
        }
      })
      .then(() => {
        qc.invalidateQueries({ queryKey: ['solicitudes-all'] });
        qc.invalidateQueries({ queryKey: ['cronogramas'] });
      })
      .catch((err) => console.warn('[cronograma] No se pudo aprobar solicitud:', err));
  };

  const rejectRescheduleRequest = (visitId: string, _aprobador: string, comentario: string) => {
    cronogramasApi.findAllSolicitudes({ cronogramaId: visitId, estado: 'PENDIENTE' })
      .then((solicitudes) => {
        const solicitud = solicitudes[0];
        if (solicitud) {
          return cronogramasApi.rechazarSolicitud(solicitud.id, comentario || 'Rechazado');
        }
      })
      .then(() => qc.invalidateQueries({ queryKey: ['solicitudes-all'] }))
      .catch((err) => console.warn('[cronograma] No se pudo rechazar solicitud:', err));
  };

  return {
    cronogramas,
    reprogramaciones,
    especialistas,
    instituciones,
    docentes,
    isLoading,
    createCronograma,
    updateCronograma,
    refetch,
    submitRescheduleRequest,
    approveRescheduleRequest,
    rejectRescheduleRequest,
    deleteCronograma,
  };
};
