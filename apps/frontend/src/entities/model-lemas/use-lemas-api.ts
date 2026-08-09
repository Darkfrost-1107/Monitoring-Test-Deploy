import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lemasApi } from './api/lemas.api.js';

/**
 * Lema oficial del año académico.
 *
 * Una fila por año: lo fija un decreto supremo y es el mismo para todo el país.
 * Se carga al registrar la primera plantilla del año.
 */

export const useLemaDelAnio = (anio: number | undefined) =>
  useQuery({
    queryKey: ['lema-anual', anio],
    queryFn: () => lemasApi.findByAnio(anio!),
    enabled: Number.isInteger(anio) && (anio ?? 0) > 0,
    staleTime: Infinity,
  });

export const useGuardarLemaDelAnio = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ anio, lema }: { anio: number; lema: string }) => lemasApi.upsert(anio, lema),
    onSuccess: (guardado) => {
      qc.setQueryData(['lema-anual', guardado.anio], guardado);
      // La plantilla trae el lema resuelto por el servidor: al cambiarlo, lo
      // que ya está en pantalla quedó viejo.
      qc.invalidateQueries({ queryKey: ['plantillas'] });
    },
  });
};
