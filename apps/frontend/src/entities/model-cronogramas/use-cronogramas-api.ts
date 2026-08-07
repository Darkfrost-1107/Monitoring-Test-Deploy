import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  cronogramasApi,
  type CreateVisitaInput,
  type CreateSolicitudInput,
} from './api/cronogramas.api.js';
import type {
  IVisita,
  EstadoVisita,
  EstadoSolicitudReprogramacion,
  TipoMonitoreo,
} from '@sistema-monitoreo/shared-contracts';

/**
 * Hooks granulares para acceder al backend de cronogramas vía TanStack Query.
 *
 * Las páginas consumen `features/cronogramas/hooks/use-cronogramas-data`, que
 * compone estas consultas y denormaliza `IVisita` —que trae identificadores— al
 * modelo local `Cronograma`, que trae los nombres ya resueltos.
 */

export interface CronogramaFilters {
  monitorId?: string;
  institucionId?: string;
  estado?: EstadoVisita;
  tipoMonitoreo?: TipoMonitoreo;
  fechaDesde?: string;
  fechaHasta?: string;
}

export const useCronogramasList = (filters?: CronogramaFilters) =>
  useQuery({
    queryKey: ['cronogramas', filters],
    queryFn: () => cronogramasApi.findAll(filters),
    staleTime: 30_000,
  });

export const useCronograma = (id: string | undefined) =>
  useQuery({
    queryKey: ['cronograma', id],
    queryFn: () => cronogramasApi.findById(id!),
    enabled: !!id,
  });

export const useCrearVisita = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVisitaInput) => cronogramasApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cronogramas'] });
    },
  });
};

export const useActualizarVisita = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateVisitaInput> & { estado?: EstadoVisita } }) =>
      cronogramasApi.update(id, data),
    onSuccess: (visita: IVisita) => {
      qc.invalidateQueries({ queryKey: ['cronogramas'] });
      qc.setQueryData(['cronograma', visita.id], visita);
    },
  });
};

export const useEliminarVisita = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cronogramasApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cronogramas'] });
    },
  });
}

// Solicitudes
export const useSolicitudesList = (filters?: { cronogramaId?: string; estado?: EstadoSolicitudReprogramacion }) =>
  useQuery({
    queryKey: ['solicitudes', filters],
    queryFn: () => cronogramasApi.findAllSolicitudes(filters),
    staleTime: 30_000,
  });

export const useSolicitud = (id: string | undefined) =>
  useQuery({
    queryKey: ['solicitud', id],
    queryFn: () => cronogramasApi.findSolicitudById(id!),
    enabled: !!id,
  });

export const useCrearSolicitud = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSolicitudInput) => cronogramasApi.crearSolicitud(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['solicitudes'] });
      qc.invalidateQueries({ queryKey: ['cronogramas'] });
    },
  });
};

export const useResolverSolicitud = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accion, comentario }: { id: string; accion: 'aprobar' | 'rechazar'; comentario: string }) => {
      return accion === 'aprobar'
        ? cronogramasApi.aprobarSolicitud(id, comentario)
        : cronogramasApi.rechazarSolicitud(id, comentario);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['solicitudes'] });
      qc.invalidateQueries({ queryKey: ['cronogramas'] });
    },
  });
};
