import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { IGuardarCarpetaPedagogicaRequest } from '@sistema-monitoreo/shared-contracts';
import { carpetaPedagogicaApi } from '@shared/api/carpeta-pedagogica.api';

const KEY = ['carpeta-pedagogica'];

/** Enlace propio del año indicado. */
export const useMiCarpetaPedagogica = (anio: number) =>
  useQuery({
    queryKey: [...KEY, 'mia', anio],
    queryFn: () => carpetaPedagogicaApi.mia(anio),
  });

export const useGuardarMiCarpetaPedagogica = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: IGuardarCarpetaPedagogicaRequest) => carpetaPedagogicaApi.guardar(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useEliminarMiCarpetaPedagogica = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (anio: number) => carpetaPedagogicaApi.eliminar(anio),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

/**
 * Enlace de un docente, para quien lo monitorea.
 *
 * `enabled` corta la consulta cuando todavía no hay docente elegido, de modo
 * que la pantalla no dispare una petición que el backend rechazaría.
 */
export const useCarpetaPedagogicaDeDocente = (docenteId: string | null, anio: number) =>
  useQuery({
    queryKey: [...KEY, 'docente', docenteId, anio],
    queryFn: () => carpetaPedagogicaApi.deDocente(docenteId!, anio),
    enabled: docenteId !== null,
  });
