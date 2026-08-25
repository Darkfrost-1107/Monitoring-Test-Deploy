import { useQuery } from '@tanstack/react-query';
import { reportesApi } from '@shared/api/reportes.api';
import type { TipoPlantilla } from '@sistema-monitoreo/shared-contracts';

export const useFichasCompletadas = (filters?: {
  anioAcademico?: number;
  institucionId?: string;
  tipoMonitoreo?: TipoPlantilla;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  limit?: number;
}) =>
  useQuery({
    queryKey: ['reportes', 'fichas-completadas', filters],
    queryFn: () => reportesApi.fichasCompletadas(filters),
    staleTime: 60_000,
  });

export const useResumenIE = (anio: number) =>
  useQuery({
    queryKey: ['reportes', 'resumen-ie', anio],
    queryFn: () => reportesApi.resumenIE(anio),
    enabled: !!anio,
    staleTime: 60_000,
  });

export const useAnalisisDesempenos = (
  filters?: {
    anioAcademico?: number;
    institucionId?: string;
    modalidad?: string;
    nivelEducativo?: string;
    docenteId?: string;
    numeroVisita?: number;
    tipoMonitoreo?: TipoPlantilla;
    plantillaId?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  },
  options?: { enabled?: boolean },
) =>
  useQuery({
    queryKey: ['reportes', 'analisis-desempenos', filters],
    queryFn: () => reportesApi.analisisDesempenos(filters),
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
