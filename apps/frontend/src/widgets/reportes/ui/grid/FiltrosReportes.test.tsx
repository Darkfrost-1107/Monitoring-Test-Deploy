import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FiltrosReportes } from './FiltrosReportes';

/**
 * El filtro «Monitor» permite ver el análisis de lo que hizo cada especialista,
 * director, coordinador o jefe de taller. Es opcional: solo aparece si la pantalla
 * le pasa las opciones.
 */

const base = () => ({
  filterModalidad: 'Todos',
  setFilterModalidad: vi.fn(),
  filterNivel: 'Todos',
  setFilterNivel: vi.fn(),
  filterAnio: '2026',
  setFilterAnio: vi.fn(),
  filtroPeriodo: 'TODOS' as const,
  setFiltroPeriodo: vi.fn(),
  nivelesDisponibles: [],
  añosDisponibles: ['2026'],
  isAnyFilterActive: false,
  handleClearFilters: vi.fn(),
  isEvaluatedView: false,
});

describe('FiltrosReportes — filtro por monitor', () => {
  it('muestra el selector «Monitor» cuando se le pasa el setter y las opciones', () => {
    render(
      <FiltrosReportes
        {...base()}
        filterMonitor="Todos"
        setFilterMonitor={vi.fn()}
        monitoresDisponibles={[{ id: 'm1', nombre: 'Ana Torres' }]}
      />,
    );

    expect(screen.getByText('Monitor')).toBeInTheDocument();
    expect(screen.getByText('Todos los monitores')).toBeInTheDocument();
  });

  it('sin setter no muestra el selector: las pantallas que no lo usan no cambian', () => {
    render(<FiltrosReportes {...base()} />);

    expect(screen.queryByText('Monitor')).not.toBeInTheDocument();
    expect(screen.queryByText('Todos los monitores')).not.toBeInTheDocument();
  });

  it('se deshabilita si no hay monitores entre los que elegir', () => {
    render(
      <FiltrosReportes
        {...base()}
        filterMonitor="Todos"
        setFilterMonitor={vi.fn()}
        monitoresDisponibles={[]}
      />,
    );

    expect(screen.getByRole('combobox', { name: /monitor/i })).toBeDisabled();
  });
});
