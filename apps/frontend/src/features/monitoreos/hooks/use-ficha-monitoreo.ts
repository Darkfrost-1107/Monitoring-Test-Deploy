import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fichasApi, type CreateFichaInput } from '../api/fichas.api.js';
import type { IFichaMonitoreo } from '@sistema-monitoreo/shared-contracts';

/**
 * Codigos de error que el backend puede devolver cuando la ficha
 * intento guardarse contra una plantilla que ya es Historico.
 * Usado por las paginas para abrir ModalMigracionPlantilla.
 */
export const ERROR_CODES = {
  PLANTILLA_VERSIONADA: 'PLANTILLA_VERSIONADA',
  PLANTILLA_NO_ENCONTRADA: 'PLANTILLA_NO_ENCONTRADA',
} as const;

export type FichaErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface FichaApiError extends Error {
  code?: FichaErrorCode;
  plantillaVigenteId?: string;
  plantillaVigenteNombre?: string;
  status?: number;
}

function toFichaError(err: unknown): FichaApiError {
  const anyErr = err as {
    response?: { data?: { code?: string; plantillaVigenteId?: string; plantillaVigenteNombre?: string }; status?: number };
    message?: string;
  };
  const e: FichaApiError = new Error(anyErr?.message ?? 'Ficha error') as FichaApiError;
  e.status = anyErr?.response?.status;
  e.code = (anyErr?.response?.data?.code as FichaErrorCode | undefined) ?? undefined;
  e.plantillaVigenteId = anyErr?.response?.data?.plantillaVigenteId;
  e.plantillaVigenteNombre = anyErr?.response?.data?.plantillaVigenteNombre;
  return e;
}

export const useFichaByVisita = (cronogramaId: string | undefined) =>
  useQuery({
    queryKey: ['ficha', 'visita', cronogramaId],
    queryFn: () => fichasApi.findByVisita(cronogramaId!),
    enabled: !!cronogramaId,
  });

export const useFicha = (id: string | undefined) =>
  useQuery({
    queryKey: ['ficha', id],
    queryFn: () => fichasApi.findById(id!),
    enabled: !!id,
  });

export const useCrearFicha = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFichaInput) => fichasApi.create(data),
    onSuccess: (ficha: IFichaMonitoreo) => {
      qc.setQueryData(['ficha', 'visita', ficha.cronogramaId], ficha);
      qc.setQueryData(['ficha', ficha.id], ficha);
    },
  });
};

export const useGuardarRespuesta = (fichaId: string) => {
  const qc = useQueryClient();
  return useMutation<
    IFichaMonitoreo,
    FichaApiError,
    { desempenoId: string; nivel: number }
  >({
    mutationFn: ({ desempenoId, nivel }) =>
      fichasApi.saveRespuestaDesempeno(fichaId, desempenoId, nivel),
    onSuccess: (ficha) => {
      qc.setQueryData(['ficha', ficha.id], ficha);
      qc.setQueryData(['ficha', 'visita', ficha.cronogramaId], ficha);
    },
  });
};

export const useGuardarRespuestaAspecto = (fichaId: string) => {
  const qc = useQueryClient();
  return useMutation<
    IFichaMonitoreo,
    FichaApiError,
    { aspectoId: string; marcado: boolean }
  >({
    mutationFn: ({ aspectoId, marcado }) =>
      fichasApi.saveRespuestaAspecto(fichaId, aspectoId, marcado),
    onSuccess: (ficha) => {
      qc.setQueryData(['ficha', ficha.id], ficha);
      qc.setQueryData(['ficha', 'visita', ficha.cronogramaId], ficha);
    },
  });
};

export const useFinalizarFicha = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, observaciones }: { id: string; observaciones?: string }) =>
      fichasApi.finalizar(id, observaciones),
    onSuccess: (ficha: IFichaMonitoreo) => {
      qc.setQueryData(['ficha', ficha.id], ficha);
      qc.setQueryData(['ficha', 'visita', ficha.cronogramaId], ficha);
    },
  });
};

export const useMigrarPlantilla = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, plantillaId }: { id: string; plantillaId: string }) =>
      fichasApi.migrarPlantilla(id, plantillaId),
    onSuccess: (ficha: IFichaMonitoreo) => {
      qc.setQueryData(['ficha', ficha.id], ficha);
      qc.setQueryData(['ficha', 'visita', ficha.cronogramaId], ficha);
      // Limpia cache de plantillas (la v1 ahora es Historico)
      qc.invalidateQueries({ queryKey: ['plantillas'] });
      qc.invalidateQueries({ queryKey: ['plantilla'] });
    },
  });
};

// Re-export del helper para que las paginas lo usen
export { toFichaError };

export const useGetHistorialPedagogico = (
  evaluadoId: string | undefined,
  tipoMonitoreo?: string,
) =>
  useQuery({
    queryKey: ['fichas', 'historial', evaluadoId, tipoMonitoreo],
    queryFn: () => fichasApi.getHistorial(evaluadoId!, tipoMonitoreo),
    enabled: !!evaluadoId,
  });

export const useDescargarPdf = () => {
  const mutation = useMutation({
    mutationFn: (fichaId: string) => fichasApi.descargarPdf(fichaId),
  });

  const descargar = async (fichaId: string, customFileName?: string) => {
    const blob = await mutation.mutateAsync(fichaId);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = customFileName || `Ficha_Monitoreo_${fichaId.split('-')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return {
    ...mutation,
    descargar,
  };
};

