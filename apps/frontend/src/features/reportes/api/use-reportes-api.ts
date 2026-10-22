import { useQuery } from '@tanstack/react-query';
import { STALE_TIMES } from '@shared/config/constants';
import { reportesApi } from '@shared/api/reportes.api';

export const useFichasCompletadas = (filters?: {
  anioAcademico?: number;
  institucionId?: string;
  modalidad?: string;
  nivelEducativo?: string;
  docenteId?: string;
  /** Quien realizó el monitoreo. */
  monitorId?: string;
  numeroVisita?: number;
  tipoMonitoreo?: 'DOCENTE' | 'DIRECTIVO';
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  limit?: number;
}) =>
  useQuery({
    queryKey: ['reportes', 'fichas-completadas', filters],
    queryFn: () => reportesApi.fichasCompletadas(filters),
    staleTime: STALE_TIMES.REPORTES,
  });

export const useResumenIE = (anio: number) =>
  useQuery({
    queryKey: ['reportes', 'resumen-ie', anio],
    queryFn: () => reportesApi.resumenIE(anio),
    enabled: !!anio,
    staleTime: STALE_TIMES.REPORTES,
  });
