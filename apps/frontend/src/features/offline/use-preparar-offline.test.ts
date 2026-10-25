import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePrepararOffline } from './use-preparar-offline';

const mockCronogramasFindAll = vi.fn();
const mockCronogramasFindAllSolicitudes = vi.fn();
const mockEspecialistasFindAll = vi.fn();
const mockInstitutionsFindAll = vi.fn();
const mockTeachersFindAll = vi.fn();
const mockPlantillasFindAll = vi.fn();
const mockFichasFindAllByVisita = vi.fn();

vi.mock('@features/cronogramas/api/cronogramas.api', () => ({
  cronogramasApi: {
    findAll: () => mockCronogramasFindAll(),
    findAllSolicitudes: () => mockCronogramasFindAllSolicitudes(),
  },
}));

vi.mock('@shared/api/especialistas.api', () => ({
  especialistasApi: {
    findAll: () => mockEspecialistasFindAll(),
  },
}));

vi.mock('@shared/api/institutions.api', () => ({
  institutionsApi: {
    findAll: () => mockInstitutionsFindAll(),
  },
}));

vi.mock('@shared/api/teachers.api', () => ({
  teachersApi: {
    findAll: () => mockTeachersFindAll(),
  },
}));

vi.mock('@entities/model-plantillas/api/plantillas.api', () => ({
  plantillasApi: {
    findAll: () => mockPlantillasFindAll(),
  },
}));

vi.mock('@features/monitoreos/api/fichas.api', () => ({
  fichasApi: {
    findAllByVisita: (id: string) => mockFichasFindAllByVisita(id),
  },
}));

describe('usePrepararOffline', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    mockCronogramasFindAll.mockResolvedValue([
      { id: 'visita-1', fechaProgramada: '2026-10-10', horaInicio: '08:00', estado: 'PENDIENTE' },
    ]);
    mockCronogramasFindAllSolicitudes.mockResolvedValue([]);
    mockEspecialistasFindAll.mockResolvedValue({ ok: true, data: [] });
    mockInstitutionsFindAll.mockResolvedValue({ ok: true, data: [] });
    mockTeachersFindAll.mockResolvedValue({ ok: true, data: [] });
    mockPlantillasFindAll.mockResolvedValue([
      {
        id: 'plantilla-1',
        nombre: 'Ficha de Observación',
        tipoMonitoreo: 'DOCENTE',
        estado: 'VIGENTE',
        desempenos: [],
      },
    ]);
    mockFichasFindAllByVisita.mockResolvedValue([
      {
        id: 'ficha-1',
        cronogramaId: 'visita-1',
        plantillaId: 'plantilla-1',
        observaciones: 'Todo correcto',
        respuestasDesempeno: [],
        respuestasAspecto: [],
        respuestasEjeItem: [],
      },
    ]);
  });

  it('descarga y precalienta el catálogo completo y siembra plantillas individuales', async () => {
    const { result } = renderHook(() => usePrepararOffline(), { wrapper });

    expect(result.current.estado).toBe('idle');

    let exito = false;
    await act(async () => {
      exito = await result.current.preparar();
    });

    expect(exito).toBe(true);
    expect(result.current.estado).toBe('listo');

    // Verifica que se consultaron las APIs clave
    expect(mockCronogramasFindAll).toHaveBeenCalledTimes(1);
    expect(mockCronogramasFindAllSolicitudes).toHaveBeenCalledTimes(1);
    expect(mockEspecialistasFindAll).toHaveBeenCalledTimes(1);
    expect(mockInstitutionsFindAll).toHaveBeenCalledTimes(1);
    expect(mockTeachersFindAll).toHaveBeenCalledTimes(1);
    expect(mockPlantillasFindAll).toHaveBeenCalledTimes(1);

    // Verifica que la plantilla individual quedó sembrada en queryClient
    const plantillaEnCache = queryClient.getQueryData(['plantilla', 'plantilla-1']);
    expect(plantillaEnCache).toBeDefined();

    // Verifica que la ficha existente quedó guardada en localStorage para consulta offline
    expect(localStorage.getItem('sistema-monitoreo:ficha-state:visita-1:plantilla-1')).toContain('Todo correcto');
  });

  it('marca estado error si falla alguna consulta base', async () => {
    mockCronogramasFindAll.mockRejectedValue(new Error('Fallo de red'));

    const { result } = renderHook(() => usePrepararOffline(), { wrapper });

    let exito = true;
    await act(async () => {
      exito = await result.current.preparar();
    });

    expect(exito).toBe(false);
    expect(result.current.estado).toBe('error');
  });

  it('inicializa en estado listo si ya se habia preparado en las ultimas 24 horas', () => {
    localStorage.setItem('sistema-monitoreo:offline-preparado-at', new Date().toISOString());

    const { result } = renderHook(() => usePrepararOffline(), { wrapper });

    expect(result.current.estado).toBe('listo');
  });
});
