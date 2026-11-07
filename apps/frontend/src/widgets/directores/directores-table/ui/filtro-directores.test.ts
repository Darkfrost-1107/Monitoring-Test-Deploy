import { describe, it, expect } from 'vitest';
import { directorFilter, subdirectorFilter } from './filtro-directores';
import { tieneElCargo } from '@features/docentes/lib/padron-docentes';
import type { Docente } from '@entities/model-docentes';

/**
 * Quién aparece en la tabla de directores.
 *
 * El filtro admitía a cualquiera con una designación de Director, estuviera
 * cerrada o no, de modo que al cesar a un director éste seguía listado en el
 * padrón del puesto que acababa de dejar.
 */

const director = (cargosList: { id: string; nombre: string; fechaFin: string | null }[]) =>
  ({
    id: 'd-1',
    nombres: 'Maritza',
    apellidos: 'Quispe',
    dni: '40000006',
    cargo: 'Director',
    activo: true,
    nivelEducativo: 'Secundaria',
    condicion: 'Nombrado',
    cargosList,
  }) as unknown as Docente;

const sinFiltros = () => new URLSearchParams();

const DESIGNACION_ABIERTA = { id: 'c-1', nombre: 'Director', fechaFin: null };
const DESIGNACION_CERRADA = { id: 'c-1', nombre: 'Director', fechaFin: '2026-08-09' };

describe('tabla de directores — sólo quien dirige hoy', () => {
  it('lista a quien tiene la designación abierta', () => {
    expect(directorFilter(director([DESIGNACION_ABIERTA]), sinFiltros())).toBe(true);
  });

  it('deja fuera al cesado: su designación está cerrada', () => {
    expect(directorFilter(director([DESIGNACION_CERRADA]), sinFiltros())).toBe(false);
  });

  /**
   * Cesar cierra la designación en el mismo registro que la abrió, así que el
   * historial queda y lo que cambia es sólo la vigencia.
   */
  it('el cesado conserva su historial aunque no se liste', () => {
    const cesado = director([DESIGNACION_CERRADA]);

    expect(cesado.cargosList).toHaveLength(1);
    expect(directorFilter(cesado, sinFiltros())).toBe(false);
  });

  /**
   * No desaparece del sistema: sin designación de monitoreo abierta pasa a
   * contarse como docente de aula, que es desde donde se lo vuelve a designar.
   */
  it('el cesado pasa a figurar como docente de aula', () => {
    expect(tieneElCargo(director([DESIGNACION_CERRADA]), 'Docente de Aula')).toBe(true);
  });

  it('quien nunca fue director no se lista', () => {
    expect(directorFilter(director([]), sinFiltros())).toBe(false);
  });
});

describe('tabla de directores — los filtros de la URL siguen aplicando', () => {
  it('el filtro por nivel deja fuera a los de otro nivel', () => {
    const params = new URLSearchParams({ nivelEducativo: 'Primaria' });

    expect(directorFilter(director([DESIGNACION_ABIERTA]), params)).toBe(false);
  });

  it('la búsqueda por DNI encuentra al director vigente', () => {
    const params = new URLSearchParams({ search: '40000006' });

    expect(directorFilter(director([DESIGNACION_ABIERTA]), params)).toBe(true);
  });

  /**
   * La modalidad no se guarda: se deduce del nivel. Es el único criterio que
   * esta tabla tiene y el padrón de docentes no, así que se conserva acá.
   */
  it('el filtro por modalidad deduce el nivel', () => {
    const params = new URLSearchParams({ modalidad: 'EBR' });

    expect(directorFilter(director([DESIGNACION_ABIERTA]), params)).toBe(true);
  });
});

describe('tabla de subdirectores — filtro de subdirector', () => {
  const SUBDIRECTOR_ABIERTO = { id: 'c-sub', nombre: 'Subdirector', fechaFin: null };
  const SUBDIRECTOR_CERRADO = { id: 'c-sub', nombre: 'Subdirector', fechaFin: '2026-10-01' };

  const subdirector = (cargosList: { id: string; nombre: string; fechaFin: string | null }[]) =>
    ({
      id: 'sub-1',
      nombres: 'MARCIA',
      apellidos: 'ZAPANA YERBA',
      dni: '29533362',
      cargo: 'Subdirector',
      activo: true,
      nivelEducativo: 'Secundaria',
      condicion: 'Encargado',
      institucionId: 'ie-123',
      cargosList,
    }) as unknown as Docente;

  it('lista a quien tiene la designación abierta de subdirector', () => {
    expect(subdirectorFilter(subdirector([SUBDIRECTOR_ABIERTO]), sinFiltros())).toBe(true);
  });

  it('no lista a un subdirector cesado con designación cerrada', () => {
    expect(subdirectorFilter(subdirector([SUBDIRECTOR_CERRADO]), sinFiltros())).toBe(false);
  });

  it('no lista a un director en la tabla de subdirectores', () => {
    expect(subdirectorFilter(director([DESIGNACION_ABIERTA]), sinFiltros())).toBe(false);
  });

  it('permite buscar por nombre de I.E.', () => {
    const getInstName = (id: string) => (id === 'ie-123' ? 'I.E. Juan Bustamante' : 'Otra');
    const params = new URLSearchParams({ search: 'Bustamante' });

    expect(subdirectorFilter(subdirector([SUBDIRECTOR_ABIERTO]), params, getInstName)).toBe(true);
  });
});
