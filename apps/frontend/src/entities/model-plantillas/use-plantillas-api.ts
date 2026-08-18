import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { plantillasApi, type CreatePlantillaInput, type UpdatePlantillaInput } from './api/plantillas.api.js';
import type { IPlantilla, EstadoPlantilla, TipoPlantilla } from '@sistema-monitoreo/shared-contracts';
import type { Plantilla } from './model';
import { mapIPlantillaListToPlantillaList, mapIPlantillaToPlantilla } from './mapper';

/**
 * Hooks granulares para acceder al backend de plantillas vía TanStack Query.
 *
 * El mapeo entre `IPlantilla` del backend y el modelo local `Plantilla` —que
 * difieren sobre todo en la estructura de niveles y desempeños— vive en
 * `./mapper`.
 */

export const usePlantillasList = (
  filters?: { anioAcademico?: number; estado?: EstadoPlantilla; tipoMonitoreo?: TipoPlantilla; institucionId?: string },
  options?: { enabled?: boolean },
) =>
  useQuery({
    queryKey: ['plantillas', filters],
    queryFn: async () => {
      const data = await plantillasApi.findAll(filters);
      return mapIPlantillaListToPlantillaList(data);
    },
    staleTime: 5_000,
    refetchOnMount: true,
    // El catálogo de plantillas es dato del personal que arma/filtra reportes; no
    // se pide en vistas donde el usuario solo ve las fichas hechas a su persona.
    enabled: options?.enabled ?? true,
  });

export const usePlantilla = (id: string | undefined) =>
  useQuery<Plantilla | null>({
    queryKey: ['plantilla', id],
    queryFn: async () => {
      const data = await plantillasApi.findById(id!);
      return mapIPlantillaToPlantilla(data);
    },
    enabled: !!id,
  });

export const useCrearPlantilla = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePlantillaInput) => plantillasApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plantillas'] });
    },
  });
};

export const useActualizarPlantilla = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePlantillaInput }) =>
      plantillasApi.update(id, data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['plantillas'] });
      qc.setQueryData(['plantilla', result.id], mapIPlantillaToPlantilla(result.plantilla));
    },
  });
};

export const useCambiarEstadoPlantilla = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: EstadoPlantilla }) =>
      plantillasApi.cambiarEstado(id, estado),
    onSuccess: (planilla: IPlantilla) => {
      qc.invalidateQueries({ queryKey: ['plantillas'] });
      qc.setQueryData(['plantilla', planilla.id], mapIPlantillaToPlantilla(planilla));
    },
  });
};

export const useDuplicarPlantilla = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, descripcion, anioAcademico }: { id: string; descripcion?: string; anioAcademico?: number }) =>
      plantillasApi.duplicar(id, descripcion, anioAcademico),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plantillas'] });
    },
  });
};

export const useEliminarPlantilla = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => plantillasApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plantillas'] });
    },
  });
};

export const useCountFichasPlantilla = (id: string | null) =>
  useQuery({
    queryKey: ['plantilla', id, 'fichas-count'],
    queryFn: () => plantillasApi.countFichas(id!),
    enabled: !!id,
    staleTime: 10_000,
  });
