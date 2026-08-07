import { describe, it, expect } from 'vitest';
import {
  NIVELES_JEFE_AREA,
  normalizarNivel,
  nivelesOcupados,
  candidatosDelNivel,
  opcionesDeNivel,
  primerNivelLibre,
  type EspecialistaClasificable,
} from './niveles-jefe-area';

/**
 * Quién puede ascender a Jefe de Área y sobre qué nivel.
 *
 * La regla vivía dentro de `JefeAreaFormBase`, mezclada con el formulario de
 * edición y el de ascenso en un mismo componente de 368 líneas.
 */

const esp = (over: Partial<EspecialistaClasificable> = {}): EspecialistaClasificable => ({
  cargo: 'Especialista',
  nivelEducativo: 'Secundaria',
  ...over,
});

describe('NIVELES_JEFE_AREA', () => {
  it('son los tres niveles de Educación Básica Regular', () => {
    expect(NIVELES_JEFE_AREA).toEqual(['Inicial', 'Primaria', 'Secundaria']);
  });
});

describe('normalizarNivel', () => {
  it('reconoce los tres niveles sin importar mayúsculas', () => {
    expect(normalizarNivel('inicial')).toBe('Inicial');
    expect(normalizarNivel('PRIMARIA')).toBe('Primaria');
    expect(normalizarNivel('Secundaria')).toBe('Secundaria');
  });

  it('ignora los espacios de los extremos', () => {
    expect(normalizarNivel('  Primaria ')).toBe('Primaria');
  });

  /**
   * La versión anterior devolvía 'Secundaria' ante cualquier valor que no
   * reconociera, incluido el vacío. Como el resultado alimenta el cálculo de
   * niveles ocupados, un especialista de nivel desconocido bloqueaba Secundaria
   * para todos los demás. Un dato que no se entiende no es un dato: es nulo.
   */
  it('devuelve nulo ante un nivel ausente', () => {
    expect(normalizarNivel(undefined)).toBeNull();
    expect(normalizarNivel(null)).toBeNull();
    expect(normalizarNivel('')).toBeNull();
  });

  it('devuelve nulo ante un nivel que no es de Básica Regular', () => {
    expect(normalizarNivel('EBA')).toBeNull();
    expect(normalizarNivel('CEPROs')).toBeNull();
  });
});

describe('nivelesOcupados', () => {
  it('reúne los niveles que ya tienen Jefe de Área', () => {
    const lista = [
      esp({ cargo: 'Jefe de Área', nivelEducativo: 'Inicial' }),
      esp({ cargo: 'Jefe de Área', nivelEducativo: 'Secundaria' }),
      esp({ cargo: 'Especialista', nivelEducativo: 'Primaria' }),
    ];
    expect(nivelesOcupados(lista)).toEqual(['Inicial', 'Secundaria']);
  });

  it('no cuenta a quienes no son Jefe de Área', () => {
    const lista = [esp({ cargo: 'Jefe de Gestión', nivelEducativo: 'Primaria' })];
    expect(nivelesOcupados(lista)).toEqual([]);
  });

  it('descarta al Jefe de Área cuyo nivel no se reconoce, en vez de suponerlo', () => {
    const lista = [esp({ cargo: 'Jefe de Área', nivelEducativo: 'EBA' })];
    expect(nivelesOcupados(lista)).toEqual([]);
  });

  it('no repite un nivel ocupado por más de un registro', () => {
    const lista = [
      esp({ cargo: 'Jefe de Área', nivelEducativo: 'Primaria' }),
      esp({ cargo: 'Jefe de Área', nivelEducativo: 'primaria' }),
    ];
    expect(nivelesOcupados(lista)).toEqual(['Primaria']);
  });
});

describe('candidatosDelNivel', () => {
  it('deja sólo a los especialistas del nivel pedido', () => {
    const lista = [
      esp({ nivelEducativo: 'Primaria' }),
      esp({ nivelEducativo: 'Secundaria' }),
      esp({ nivelEducativo: 'primaria' }),
    ];
    expect(candidatosDelNivel(lista, 'Primaria')).toHaveLength(2);
  });

  it('excluye a quien ya tiene otro cargo', () => {
    const lista = [
      esp({ cargo: 'Jefe de Área', nivelEducativo: 'Primaria' }),
      esp({ cargo: 'Director', nivelEducativo: 'Primaria' }),
      esp({ cargo: 'Especialista', nivelEducativo: 'Primaria' }),
    ];
    expect(candidatosDelNivel(lista, 'Primaria')).toHaveLength(1);
  });

  it('excluye al especialista de nivel desconocido en lugar de darlo por Secundaria', () => {
    const lista = [esp({ nivelEducativo: 'EBA' })];
    expect(candidatosDelNivel(lista, 'Secundaria')).toEqual([]);
  });
});

describe('opcionesDeNivel', () => {
  it('marca como no disponibles los niveles ocupados', () => {
    expect(opcionesDeNivel(['Primaria'])).toEqual([
      { value: 'Inicial', label: 'Inicial', disabled: false },
      { value: 'Primaria', label: 'Primaria', disabled: true },
      { value: 'Secundaria', label: 'Secundaria', disabled: false },
    ]);
  });
});

describe('primerNivelLibre', () => {
  it('devuelve el primero que no esté ocupado', () => {
    expect(primerNivelLibre(['Inicial'])).toBe('Primaria');
  });

  it('devuelve el primero de todos cuando no hay ninguno ocupado', () => {
    expect(primerNivelLibre([])).toBe('Inicial');
  });

  /**
   * Los tres niveles ocupados es el estado normal de una UGEL con su plana
   * completa, no un caso de borde: el formulario tiene que decirlo en vez de
   * abrirse sobre un nivel que el servidor va a rechazar.
   */
  it('devuelve nulo cuando los tres niveles están ocupados', () => {
    expect(primerNivelLibre(['Inicial', 'Primaria', 'Secundaria'])).toBeNull();
  });
});
