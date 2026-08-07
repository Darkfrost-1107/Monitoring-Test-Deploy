import { describe, it, expect } from 'vitest';
import {
  CARGOS_ASIGNABLES,
  esDeEPT,
  candidatosParaCargo,
  cargaHorariaDelCargo,
  condicionInicial,
  CONDICIONES_DEL_CARGO,
  type DocenteCandidato,
} from './asignacion-de-cargo';

/**
 * A quién se le puede asignar el cargo de Coordinador Pedagógico o Jefe de
 * Taller, y con qué condiciones. Vivía dentro de `DocenteAssignPage`, entre el
 * efecto de carga y el armado del DTO.
 */

const docente = (over: Partial<DocenteCandidato> = {}): DocenteCandidato => ({
  id: 'd-1',
  activo: true,
  cargo: 'Docente de Aula',
  especialidad: 'Matemática',
  condicion: 'Nombrado',
  cargaHoraria: 30,
  ...over,
});

describe('esDeEPT', () => {
  it('reconoce la especialidad exacta', () => {
    expect(esDeEPT('EPT')).toBe(true);
  });

  it('la reconoce dentro de una lista separada por comas', () => {
    expect(esDeEPT('Matemática, EPT, Comunicación')).toBe(true);
  });

  it('ignora mayúsculas y espacios', () => {
    expect(esDeEPT('  matemática ,  ept  ')).toBe(true);
  });

  /**
   * Se compara contra el elemento completo y no por inclusión: una
   * especialidad que contenga las letras «ept» —«Aceptación», «Recepción»— no
   * es Educación para el Trabajo.
   */
  it('no la confunde con otra que la contenga como subcadena', () => {
    expect(esDeEPT('Conceptos Básicos')).toBe(false);
    expect(esDeEPT('EPTX')).toBe(false);
  });

  it('es falso sin especialidad', () => {
    expect(esDeEPT('')).toBe(false);
    expect(esDeEPT(null)).toBe(false);
    expect(esDeEPT(undefined)).toBe(false);
  });
});

describe('candidatosParaCargo', () => {
  const lista = [
    docente({ id: 'aula-activo' }),
    docente({ id: 'aula-inactivo', activo: false }),
    docente({ id: 'ya-coordinador', cargo: 'Coordinador Pedagógico' }),
    docente({ id: 'aula-ept', especialidad: 'EPT' }),
  ];

  it('para Coordinador Pedagógico son los docentes de aula activos', () => {
    const ids = candidatosParaCargo(lista, 'Coordinador Pedagógico').map((d) => d.id);
    expect(ids).toEqual(['aula-activo', 'aula-ept']);
  });

  /**
   * El Jefe de Taller dirige el taller de Educación para el Trabajo: sólo un
   * docente de esa especialidad puede ocuparlo.
   */
  it('para Jefe de Taller son sólo los de EPT', () => {
    const ids = candidatosParaCargo(lista, 'Jefe de Taller').map((d) => d.id);
    expect(ids).toEqual(['aula-ept']);
  });

  it('no propone a quien ya tiene otro cargo', () => {
    expect(candidatosParaCargo([docente({ cargo: 'Director' })], 'Coordinador Pedagógico')).toEqual(
      [],
    );
  });
});

describe('cargaHorariaDelCargo', () => {
  it('el Coordinador Pedagógico tiene una carga fija de 40 horas', () => {
    expect(cargaHorariaDelCargo('Coordinador Pedagógico', docente({ cargaHoraria: 12 }))).toBe(40);
  });

  it('el Jefe de Taller conserva la carga que ya tenía el docente', () => {
    expect(cargaHorariaDelCargo('Jefe de Taller', docente({ cargaHoraria: 24 }))).toBe(24);
  });

  it('sin carga previa el Jefe de Taller parte de la del docente de aula', () => {
    expect(cargaHorariaDelCargo('Jefe de Taller', docente({ cargaHoraria: 0 }))).toBe(30);
  });

  it('sin docente devuelve la carga propia del cargo', () => {
    expect(cargaHorariaDelCargo('Coordinador Pedagógico', null)).toBe(40);
    expect(cargaHorariaDelCargo('Jefe de Taller', null)).toBe(30);
  });
});

describe('condicionInicial', () => {
  it.each(CONDICIONES_DEL_CARGO)('conserva la condición %s del docente', (condicion) => {
    expect(condicionInicial(docente({ condicion }))).toBe(condicion);
  });

  /**
   * El cargo exige Nombrado o Destacado. Un contratado se propone como
   * Nombrado, que es lo que el usuario tendrá que confirmar o corregir en el
   * selector antes de guardar.
   */
  it('propone Nombrado cuando la condición actual no habilita el cargo', () => {
    expect(condicionInicial(docente({ condicion: 'Contratado' }))).toBe('Nombrado');
    expect(condicionInicial(docente({ condicion: '' }))).toBe('Nombrado');
    expect(condicionInicial(null)).toBe('Nombrado');
  });
});

describe('CARGOS_ASIGNABLES', () => {
  it('son los dos cargos que esta pantalla asigna', () => {
    expect(CARGOS_ASIGNABLES).toEqual(['Coordinador Pedagógico', 'Jefe de Taller']);
  });
});
