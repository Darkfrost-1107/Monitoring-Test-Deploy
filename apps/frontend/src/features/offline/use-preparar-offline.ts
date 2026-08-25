import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PAGINATION } from '@shared/config/constants';
import { cronogramasApi } from '@features/cronogramas/api/cronogramas.api';
import { especialistasApi } from '@shared/api/especialistas.api';
import { institutionsApi } from '@shared/api/institutions.api';
import { teachersApi } from '@shared/api/teachers.api';
import { plantillasApi } from '@entities/model-plantillas/api/plantillas.api';

/**
 * "Preparar para trabajar sin conexión": el especialista, con señal, descarga por
 * adelantado los datos que va a necesitar en campo.
 *
 * No mantiene un almacén aparte: pre-carga las MISMAS consultas de TanStack Query
 * que usan el calendario y la ficha (idénticas queryKey y queryFn), de modo que el
 * cache persistido en IndexedDB (ver `query-persistence.ts`) queda tibio y esas
 * pantallas lo encuentran offline sin cambiar una línea de su código.
 *
 * Cubre: cronogramas, especialistas, instituciones, docentes y el catálogo de
 * plantillas —la rúbrica con la que se llena la ficha—.
 */
export type EstadoPreparacion = 'idle' | 'preparando' | 'listo' | 'error';

export function usePrepararOffline() {
  const qc = useQueryClient();
  const [estado, setEstado] = useState<EstadoPreparacion>('idle');

  const preparar = async (): Promise<boolean> => {
    setEstado('preparando');
    try {
      await Promise.all([
        qc.prefetchQuery({ queryKey: ['cronogramas'], queryFn: () => cronogramasApi.findAll() }),
        qc.prefetchQuery({
          queryKey: ['especialistas-lite'],
          queryFn: () => especialistasApi.findAll(),
        }),
        qc.prefetchQuery({
          queryKey: ['instituciones-lite'],
          queryFn: () => institutionsApi.findAll({ limit: PAGINATION.MAX_LIMIT }),
        }),
        qc.prefetchQuery({ queryKey: ['docentes-lite'], queryFn: () => teachersApi.findAll() }),
        qc.prefetchQuery({ queryKey: ['plantillas', undefined], queryFn: () => plantillasApi.findAll() }),
      ]);
      setEstado('listo');
      return true;
    } catch {
      setEstado('error');
      return false;
    }
  };

  return { estado, preparar };
}
