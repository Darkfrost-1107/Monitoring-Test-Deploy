import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ReportesPage } from './ReportesPage';

const h = vi.hoisted(() => ({
  user: {
    role: 'director_institucion',
    institucion: 'ie-1',
    especialistaId: undefined as string | undefined,
  },
  fichas: [] as unknown[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gridProps: {} as any,
}));

vi.mock('@shared/auth', async (orig) => {
  const actual = await orig<typeof import('@shared/auth')>();
  return {
    ...actual,
    useCan: () => ({ can: () => true }),
    useScope: () => ({ institucionId: 'ie-1' }),
  };
});

vi.mock('@entities/model-user', () => ({
  useUser: () => ({ user: h.user }),
}));

vi.mock('@entities/model-reportes', () => ({
  useFichasCompletadas: () => ({ data: { data: h.fichas }, isLoading: false }),
}));

vi.mock('@entities/model-plantillas/use-plantillas-api', () => ({
  usePlantillasList: () => ({ data: [] }),
}));

vi.mock('@features/cronogramas/hooks/use-cronogramas-data', () => ({
  useCronogramasData: () => ({ cronogramas: [], isLoading: false }),
}));

vi.mock('@shared/ui/pageHeader', () => ({ PageHeader: () => null }));
vi.mock('@widgets/reportes', () => ({
  ReportesStats: () => null,
  ReportesGrid: (props: unknown) => {
    h.gridProps = props;
    return <div data-testid="reportes-grid" />;
  },
}));

describe('ReportesPage — filtro por monitor', () => {
  beforeEach(() => {
    h.user = { role: 'director_institucion', institucion: 'ie-1', especialistaId: undefined };
    h.fichas = [
      {
        id: 'f-1',
        cronogramaId: 'c-1',
        plantillaId: 'p-1',
        plantillaNombre: 'DOCENTE v1',
        fechaEjecucion: '2026-10-20T10:00:00Z',
        especialistaNombre: 'Ana Especialista',
        especialistaId: 'm-ana',
        especialistaCargo: 'Especialista',
        institucionId: 'ie-1',
        institucionNombre: 'IE Tupac',
        institucionCodigoModular: '0500710',
        evaluadoId: 'd-1',
        evaluadoNombre: 'Docente Uno',
        instrumento: 'DOCENTE',
        modalidad: 'EBR',
        nivel: 'Secundaria',
      },
      {
        id: 'f-2',
        cronogramaId: 'c-2',
        plantillaId: 'p-1',
        plantillaNombre: 'DOCENTE v1',
        fechaEjecucion: '2026-10-21T10:00:00Z',
        especialistaNombre: 'Carlos Director',
        especialistaId: 'm-carlos',
        especialistaCargo: 'Director',
        institucionId: 'ie-1',
        institucionNombre: 'IE Tupac',
        institucionCodigoModular: '0500710',
        evaluadoId: 'd-2',
        evaluadoNombre: 'Docente Dos',
        instrumento: 'DOCENTE',
        modalidad: 'EBR',
        nivel: 'Secundaria',
      },
    ];
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <ReportesPage />
      </MemoryRouter>,
    );

  it('el director ve el selector de Monitor con las opciones rotuladas y agrupadas', () => {
    renderPage();

    expect(typeof h.gridProps.setFilterMonitor).toBe('function');
    expect(h.gridProps.filterMonitor).toBe('Todos');
    expect(h.gridProps.monitoresDisponibles).toHaveLength(2);
    expect(h.gridProps.monitoresDisponibles).toEqual([
      expect.objectContaining({ id: 'm-carlos', nombre: 'Carlos Director', cargo: 'Director', origen: 'INTERNO' }),
      expect.objectContaining({ id: 'm-ana', nombre: 'Ana Especialista', cargo: 'Especialista', origen: 'EXTERNO' }),
    ]);
  });

  it('un monitor de campo (coordinador pedagógico) no ve el selector de Monitor porque solo ve lo propio', () => {
    h.user = { role: 'coordinador_pedagogico', institucion: 'ie-1', especialistaId: 'm-coord' };
    renderPage();

    expect(h.gridProps.setFilterMonitor).toBeUndefined();
  });

  it('filtrar por monitor acota las visitas en pantalla y activa el indicador de filtros', () => {
    renderPage();
    expect(h.gridProps.filteredVisits).toHaveLength(2);
    expect(h.gridProps.isAnyFilterActive).toBe(false);

    act(() => h.gridProps.setFilterMonitor('m-ana'));

    expect(h.gridProps.filteredVisits).toHaveLength(1);
    expect(h.gridProps.filteredVisits[0].id).toBe('f-1');
    expect(h.gridProps.filterMonitor).toBe('m-ana');
    expect(h.gridProps.isAnyFilterActive).toBe(true);
  });

  it('«Limpiar filtros» restablece el monitor a Todos', () => {
    renderPage();
    act(() => h.gridProps.setFilterMonitor('m-ana'));
    expect(h.gridProps.filterMonitor).toBe('m-ana');

    act(() => h.gridProps.handleClearFilters());

    expect(h.gridProps.filterMonitor).toBe('Todos');
    expect(h.gridProps.filteredVisits).toHaveLength(2);
  });

  it.each([
    ['la modalidad', 'setFilterModalidad', 'EBR'],
    ['el nivel', 'setFilterNivel', 'Primaria'],
  ])('cambiar %s reinicia el filtro por monitor', (_nombre, setter, valor) => {
    renderPage();
    act(() => h.gridProps.setFilterMonitor('m-ana'));
    expect(h.gridProps.filterMonitor).toBe('m-ana');

    act(() => h.gridProps[setter](valor));

    expect(h.gridProps.filterMonitor).toBe('Todos');
  });
});
