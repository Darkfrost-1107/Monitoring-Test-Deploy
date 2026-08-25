import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ICrearSolicitudPlantillaRequest,
  IResolverSolicitudPlantillaRequest,
} from '@sistema-monitoreo/shared-contracts';
import { solicitudesPlantillaApi } from '@shared/api/solicitudes-plantilla.api';

const KEY = ['solicitudes-plantilla'];

/** Pedidos de la propia institución, para el director. */
export const useMisSolicitudesPlantilla = (estado?: string) =>
  useQuery({
    queryKey: [...KEY, 'mias', estado ?? 'todas'],
    queryFn: () => solicitudesPlantillaApi.mias(estado),
  });

/** Bandeja del Jefe de Gestión. */
export const useSolicitudesPlantilla = (estado?: string, enabled = true) =>
  useQuery({
    queryKey: [...KEY, estado ?? 'todas'],
    queryFn: () => solicitudesPlantillaApi.listar(estado),
    enabled,
    refetchInterval: 60_000,
  });

/**
 * Cupos aprobados y sin usar de la institución.
 *
 * La pantalla de creación de plantillas los muestra, pero no son el control: el
 * backend los vuelve a verificar y consume al crear.
 */
export const useCuposDePlantilla = (anio: number, enabled = true) =>
  useQuery({
    queryKey: [...KEY, 'cupos', anio],
    queryFn: () => solicitudesPlantillaApi.cupos(anio),
    enabled,
  });

export const useCrearSolicitudPlantilla = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dto, pdf }: { dto: ICrearSolicitudPlantillaRequest; pdf: File }) =>
      solicitudesPlantillaApi.crear(dto, pdf),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useAprobarSolicitudPlantilla = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: IResolverSolicitudPlantillaRequest }) =>
      solicitudesPlantillaApi.aprobar(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useRechazarSolicitudPlantilla = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: IResolverSolicitudPlantillaRequest }) =>
      solicitudesPlantillaApi.rechazar(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};
