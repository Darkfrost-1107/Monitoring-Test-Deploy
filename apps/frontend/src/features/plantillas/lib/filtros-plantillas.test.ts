import { describe, it, expect } from 'vitest';
import {
  FILTROS_VACIOS,
  TODOS,
  aniosDisponibles,
  filtrarPlantillas,
  hayFiltroActivo,
  type PlantillaFiltrable,
} from './filtros-plantillas';

/**
 * Pruebas de los filtros del catálogo de plantillas.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Estaban dentro de un `useMemo` de
 * `PlantillasCatalog`, como una cadena de `if` con retornos negados.
 */

interface P extends PlantillaFiltrable {
  id: string;
}

const plantilla = (over: Partial<P> = {}): P => ({
  id: 'p1',
  tipoMonitoreo: 'Monitoreo Docente',
  autorNombre: 'ROSMINDA MAMANI HILASACA',
  estado: 'Vigente',
  anioAcademico: 2026,
  ...over,
});

const ids = (lista: P[]) => lista.map((p) => p.id);
const con = (over: Partial<typeof FILTROS_VACIOS>) => ({ ...FILTROS_VACIOS, ...over });

describe('hayFiltroActivo', () => {
  it('es falso con los filtros vacíos', () => {
    expect(hayFiltroActivo(FILTROS_VACIOS)).toBe(false);
  });

  it('es verdadero con texto de búsqueda', () => {
    expect(hayFiltroActivo(con({ texto: 'mamani' }))).toBe(true);
  });

  it('es verdadero con cualquier selector distinto de «Todos»', () => {
    expect(hayFiltroActivo(con({ tipo: 'Monitoreo Docente' }))).toBe(true);
    expect(hayFiltroActivo(con({ estado: 'Borrador' }))).toBe(true);
    expect(hayFiltroActivo(con({ anio: '2026' }))).toBe(true);
  });
});

describe('filtrarPlantillas — búsqueda por texto', () => {
  it('sin texto no acota', () => {
    expect(filtrarPlantillas([plantilla()], FILTROS_VACIOS)).toHaveLength(1);
  });

  it('busca en el tipo de monitoreo', () => {
    expect(filtrarPlantillas([plantilla()], con({ texto: 'docente' }))).toHaveLength(1);
  });

  /**
   * Reemplaza a la búsqueda por descripción. La descripción se fabricaba con la
   * fecha y la cantidad de desempeños, y dejó de mostrarse en la tarjeta:
   * buscarla era buscar texto invisible. El autor es lo que hoy distingue a las
   * tres plantillas que una institución tiene del mismo tipo y año.
   */
  it('busca en el nombre del autor', () => {
    expect(filtrarPlantillas([plantilla()], con({ texto: 'mamani' }))).toHaveLength(1);
  });

  it('busca en el nombre de la institución', () => {
    const p = plantilla({ institucionNombre: 'I.E. San Martín' });
    expect(filtrarPlantillas([p], con({ texto: 'san martín' }))).toHaveLength(1);
  });

  it('no distingue mayúsculas', () => {
    expect(filtrarPlantillas([plantilla()], con({ texto: 'RoSmInDa' }))).toHaveLength(1);
  });

  it('descarta lo que no coincide en ningún campo', () => {
    expect(filtrarPlantillas([plantilla()], con({ texto: 'inexistente' }))).toEqual([]);
  });

  it('tolera la plantilla sin institución', () => {
    const p = plantilla({ institucionNombre: undefined });
    expect(filtrarPlantillas([p], con({ texto: 'mamani' }))).toHaveLength(1);
  });

  /** Las plantillas anteriores al campo no traen autor y no deben romper. */
  it('tolera la plantilla sin autor', () => {
    const p = plantilla({ autorNombre: undefined });
    expect(filtrarPlantillas([p], con({ texto: 'docente' }))).toHaveLength(1);
  });
});

describe('filtrarPlantillas — selectores', () => {
  const lista = [
    plantilla({ id: 'a', tipoMonitoreo: 'Monitoreo Docente', estado: 'Vigente', anioAcademico: 2026 }),
    plantilla({ id: 'b', tipoMonitoreo: 'Monitoreo Directivo', estado: 'Borrador', anioAcademico: 2025 }),
  ];

  it('acota por tipo', () => {
    expect(ids(filtrarPlantillas(lista, con({ tipo: 'Monitoreo Directivo' })))).toEqual(['b']);
  });

  it('acota por estado', () => {
    expect(ids(filtrarPlantillas(lista, con({ estado: 'Vigente' })))).toEqual(['a']);
  });

  /** El año viene del selector como cadena y se compara contra un número. */
  it('acota por año, comparando la cadena del selector con el número', () => {
    expect(ids(filtrarPlantillas(lista, con({ anio: '2025' })))).toEqual(['b']);
  });

  it('«Todos» no acota en ningún selector', () => {
    expect(ids(filtrarPlantillas(lista, con({ tipo: TODOS, estado: TODOS, anio: TODOS })))).toEqual([
      'a',
      'b',
    ]);
  });

  it('combina los filtros: deben cumplirse todos', () => {
    expect(filtrarPlantillas(lista, con({ tipo: 'Monitoreo Docente', estado: 'Borrador' }))).toEqual(
      [],
    );
  });
});

describe('aniosDisponibles', () => {
  it('devuelve los años sin repetir, del más reciente al más antiguo', () => {
    const lista = [
      plantilla({ anioAcademico: 2024 }),
      plantilla({ anioAcademico: 2026 }),
      plantilla({ anioAcademico: 2024 }),
    ];

    expect(aniosDisponibles(lista)).toEqual([2026, 2024]);
  });

  it('con la lista vacía no devuelve años', () => {
    expect(aniosDisponibles([])).toEqual([]);
  });
});
