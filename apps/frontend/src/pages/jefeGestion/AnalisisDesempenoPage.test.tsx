import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';

/**
 * El análisis se sirve de `criteriosBackend` y `fichasCompletadas`. El cronograma
 * y el catálogo de plantillas son datos de gestión (`monitoreo:execute`): un actor
 * con sólo lectura llega aquí por su permiso de reportes, y pedirlos sólo produce
 * 403 de fondo. Estas pruebas fijan que la guarda decide bien cuándo pedirlos.
 */
const h = vi.hoisted(() => ({
  canExecute: true,
  cronogramasSpy: vi.fn(),
  plantillasSpy: vi.fn(),
}));

vi.mock('@shared/auth', async (orig) => {
  const actual = await orig<typeof import('@shared/auth')>();
  return {
    ...actual,
    useCan: () => ({
      can: (cap: unknown) => (cap === actual.Capability.MONITOREO_EXECUTE ? h.canExecute : true),
    }),
  };
});

vi.mock('@entities/model-user', () => ({ useUser: () => ({ user: { role: 'jefe_area' } }) }));

vi.mock('@entities/model-reportes', () => ({
  useFichasCompletadas: () => ({ data: { data: [] }, isLoading: false }),
  useAnalisisDesempenos: () => ({ data: [] }),
}));

vi.mock('@entities/model-plantillas/use-plantillas-api', () => ({
  usePlantillasList: (_filters: unknown, options: unknown) => {
    h.plantillasSpy(options);
    return { data: [] };
  },
}));

vi.mock('@features/cronogramas/hooks/use-cronogramas-data', () => ({
  useCronogramasData: (enabled: boolean) => {
    h.cronogramasSpy(enabled);
    return { cronogramas: [], isLoading: false };
  },
}));

// Los widgets pesados no aportan a esta prueba: se reemplazan por vacíos.
vi.mock('@shared/ui/pageHeader', () => ({ PageHeader: () => null }));
vi.mock('@/widgets/reportes/ui/grid/FiltrosReportes', () => ({ FiltrosReportes: () => null }));
vi.mock('@/widgets/reportes/ui/analisis/KpisCriterios', () => ({ KpisCriterios: () => null }));
vi.mock('@/widgets/reportes/ui/analisis/GraficoComparativoCriterios', () => ({
  GraficoComparativoCriterios: () => null,
}));
vi.mock('@/widgets/reportes/ui/analisis/ListaCriteriosDesempeno', () => ({
  ListaCriteriosDesempeno: () => null,
}));

import { AnalisisDesempenoPage } from './AnalisisDesempenoPage';

beforeEach(() => {
  h.canExecute = true;
  h.cronogramasSpy.mockClear();
  h.plantillasSpy.mockClear();
});

describe('AnalisisDesempenoPage · datos de gestión', () => {
  it('pide cronograma y plantillas cuando el usuario puede ejecutar monitoreo', () => {
    h.canExecute = true;
    render(<AnalisisDesempenoPage />);
    expect(h.cronogramasSpy).toHaveBeenCalledWith(true);
    expect(h.plantillasSpy).toHaveBeenCalledWith({ enabled: true });
  });

  it('no pide datos de gestión cuando el usuario sólo tiene lectura', () => {
    h.canExecute = false;
    render(<AnalisisDesempenoPage />);
    expect(h.cronogramasSpy).toHaveBeenCalledWith(false);
    expect(h.plantillasSpy).toHaveBeenCalledWith({ enabled: false });
  });
});
