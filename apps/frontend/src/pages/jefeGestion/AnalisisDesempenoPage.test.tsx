import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';

/**
 * El análisis se sirve de `criteriosBackend` y `fichasCompletadas`. El cronograma
 * y el catálogo de plantillas son datos de gestión (`monitoreo:execute`): un actor
 * con sólo lectura llega aquí por su permiso de reportes, y pedirlos sólo produce
 * 403 de fondo. Estas pruebas fijan que la guarda decide bien cuándo pedirlos.
 */
const h = vi.hoisted(() => ({
  canExecute: true,
  role: 'jefe_area',
  fichas: [] as unknown[],
  // Las propiedades con que la página dibuja el componente de filtros, en su último render.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filtros: {} as any,
  analisisSpy: vi.fn(),
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

vi.mock('@entities/model-user', () => ({ useUser: () => ({ user: { role: h.role } }) }));

vi.mock('@entities/model-reportes', () => ({
  useFichasCompletadas: () => ({ data: { data: h.fichas }, isLoading: false }),
  useAnalisisDesempenos: (params: unknown, options: unknown) => {
    h.analisisSpy(params, options);
    return { data: [] };
  },
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
vi.mock('@/widgets/reportes/ui/grid/FiltrosReportes', () => ({
  FiltrosReportes: (props: unknown) => {
    h.filtros = props;
    return null;
  },
}));
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
  h.role = 'jefe_area';
  h.fichas = [];
  h.analisisSpy.mockClear();
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

/** Una ficha del listado del backend, con el monitor que la levantó. */
const ficha = (id: string, monitorId: string, monitor: string) => ({
  id,
  cronogramaId: `c-${id}`,
  plantillaId: 'p1',
  plantillaNombre: 'Docente',
  fechaEjecucion: '2026-03-10T10:00:00Z',
  fechaProgramada: '2026-03-10',
  instrumento: 'DOCENTE',
  evaluadoNombre: 'Docente',
  evaluadoId: `d-${id}`,
  especialistaNombre: monitor,
  especialistaId: monitorId,
  institucionNombre: 'IE',
  institucionCodigoModular: '1',
  institucionId: 'ie-1',
  modalidad: 'EBR',
  nivel: 'Secundaria',
  numeroVisita: 1,
  nivelLogro: 'LOGRO_ESPERADO',
  promedio: 3,
  puntajeTotal: 15,
  correoEnviado: false,
  horaInicio: '10:00',
  horaFin: '11:00',
  anioAcademico: 2026,
});

const ultimaConsulta = () => h.analisisSpy.mock.calls.at(-1)?.[0] as { monitorId?: string };

describe('AnalisisDesempenoPage · filtro por monitor', () => {
  beforeEach(() => {
    h.role = 'jefe_gestion';
    h.fichas = [
      ficha('f1', 'm-pedro', 'Pedro Mamani'),
      ficha('f2', 'm-ana', 'Ana Torres'),
      ficha('f3', 'm-pedro', 'Pedro Mamani'),
    ];
  });

  it('ofrece filtrar por monitor cuando las fichas son de más de uno, ordenados por nombre', () => {
    render(<AnalisisDesempenoPage />);

    expect(typeof h.filtros.setFilterMonitor).toBe('function');
    expect(h.filtros.monitoresDisponibles).toEqual([
      { id: 'm-ana', nombre: 'Ana Torres' },
      { id: 'm-pedro', nombre: 'Pedro Mamani' },
    ]);
  });

  it('con un solo monitor no ofrece el filtro: no habría nada que elegir', () => {
    h.fichas = [ficha('f1', 'm-pedro', 'Pedro Mamani')];

    render(<AnalisisDesempenoPage />);

    expect(h.filtros.setFilterMonitor).toBeUndefined();
  });

  it('al principio no filtra por monitor', () => {
    render(<AnalisisDesempenoPage />);

    expect(ultimaConsulta().monitorId).toBeUndefined();
  });

  it('manda al backend el monitor elegido', () => {
    render(<AnalisisDesempenoPage />);

    act(() => h.filtros.setFilterMonitor('m-ana'));

    expect(ultimaConsulta().monitorId).toBe('m-ana');
    expect(h.filtros.filterMonitor).toBe('m-ana');
  });

  it('elegir un monitor cuenta como un filtro activo', () => {
    render(<AnalisisDesempenoPage />);
    expect(h.filtros.isAnyFilterActive).toBe(false);

    act(() => h.filtros.setFilterMonitor('m-ana'));

    expect(h.filtros.isAnyFilterActive).toBe(true);
  });

  it('«Limpiar filtros» quita también el monitor', () => {
    render(<AnalisisDesempenoPage />);
    act(() => h.filtros.setFilterMonitor('m-ana'));

    act(() => h.filtros.handleClearFilters());

    expect(ultimaConsulta().monitorId).toBeUndefined();
    expect(h.filtros.filterMonitor).toBe('Todos');
  });

  it.each([
    ['la modalidad', 'setFilterModalidad', 'EBR'],
    ['el nivel', 'setFilterNivel', 'Secundaria'],
    ['la institución', 'setFilterInstitucion', 'ie-1'],
    ['la plantilla', 'onSeleccionarPlantilla', 'p1'],
  ])('cambiar %s reinicia el monitor, que puede no existir en el nuevo ámbito', (_n, setter, valor) => {
    render(<AnalisisDesempenoPage />);
    act(() => h.filtros.setFilterMonitor('m-ana'));

    act(() => h.filtros[setter](valor));

    expect(h.filtros.filterMonitor).toBe('Todos');
  });
});
