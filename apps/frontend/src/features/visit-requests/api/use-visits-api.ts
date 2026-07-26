import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ICrearSolicitudVisitaRequest,
  IResolverSolicitudVisitaRequest,
} from '@sistema-monitoreo/shared-contracts';
import { visitsApi } from '@shared/api/visits.api';

const KEY = ['solicitudes-visita'];

export const useSolicitarVisita = () =>
  useMutation({
    mutationFn: (body: ICrearSolicitudVisitaRequest) => visitsApi.solicitar(body),
  });

export const useSolicitudesVisita = (estado?: string, enabled = true) =>
  useQuery({
    queryKey: [...KEY, estado ?? 'todas'],
    queryFn: () => visitsApi.listar(estado),
    refetchInterval: 60_000,
    enabled,
  });

/** Seguimiento de las solicitudes creadas por el propio usuario (Jefe de Área). */
export const useMisSolicitudesVisita = (estado?: string, enabled = true) =>
  useQuery({
    queryKey: [...KEY, 'mias', estado ?? 'todas'],
    queryFn: () => visitsApi.misSolicitudes(estado),
    refetchInterval: 60_000,
    enabled,
  });

/**
 * Conteo de solicitudes pendientes (para el badge del sidebar). Solo se
 * dispara cuando el usuario puede gestionarlas (`enabled`), ya que el
 * endpoint requiere el permiso `visitas:gestionar`.
 */
export const useSolicitudesPendientesCount = (enabled: boolean) =>
  useQuery({
    queryKey: [...KEY, 'pendientes-count'],
    queryFn: () => visitsApi.listar('PENDIENTE'),
    enabled,
    refetchInterval: 60_000,
    select: (data) => data.pendientes,
  });

/** Detalle de trazabilidad de una solicitud (se consulta al abrir el modal). */
export const useSolicitudDetalle = (id: string | null) =>
  useQuery({
    queryKey: [...KEY, 'detalle', id],
    queryFn: () => visitsApi.detalle(id!),
    enabled: id !== null,
  });

export const useAtenderSolicitud = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: IResolverSolicitudVisitaRequest }) =>
      visitsApi.atender(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useRechazarSolicitud = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: IResolverSolicitudVisitaRequest }) =>
      visitsApi.rechazar(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};
