import { describe, it, expect } from 'vitest';
import {
  CARGOS_ASIGNABLES,
  esDeEPT,
  coincideEspecialidad,
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

  it('reconoce la denominación oficial Educación para el Trabajo con o sin tildes', () => {
    expect(esDeEPT('Educación para el Trabajo')).toBe(true);
    expect(esDeEPT('Educacion para el Trabajo')).toBe(true);
    expect(esDeEPT('educación para el trabajo')).toBe(true);
    expect(esDeEPT('Educación para el Trabajo (EPT)')).toBe(true);
  });

  it('la reconoce dentro de una lista separada por comas', () => {
    expect(esDeEPT('Matemática, EPT, Comunicación')).toBe(true);
    expect(esDeEPT('Matemática, Educación para el Trabajo, Comunicación')).toBe(true);
  });

  it('ignora mayúsculas y espacios', () => {
    expect(esDeEPT('  matemática ,  ept  ')).toBe(true);
    expect(esDeEPT('  matemática ,  educación para el trabajo  ')).toBe(true);
  });

  /**
   * Se compara contra el elemento completo y no por inclusión: una
   * especialidad que contenga las letras «ept» —«Aceptación», «Recepción»— no
   * es Educación para el Trabajo.
   */
  it('no la confunde con otra que la contenga como subcadena', () => {
    expect(esDeEPT('Conceptos Básicos')).toBe(false);
    expect(esDeEPT('EPTX')).toBe(false);
    expect(esDeEPT('Aceptación')).toBe(false);
    expect(esDeEPT('Recepción')).toBe(false);
  });

  it('reconoce especialidades técnicas con mención o variante', () => {
    expect(esDeEPT('EPT - Computación e Informática')).toBe(true);
    expect(esDeEPT('Educación para el Trabajo: Mecánica')).toBe(true);
    expect(esDeEPT('Área de Educación para el Trabajo')).toBe(true);
    expect(esDeEPT('EPT (Electricidad)')).toBe(true);
  });

  it('es falso sin especialidad', () => {
    expect(esDeEPT('')).toBe(false);
    expect(esDeEPT(null)).toBe(false);
    expect(esDeEPT(undefined)).toBe(false);
  });
});

describe('coincideEspecialidad', () => {
  it('reconoce equivalencia cruzada entre EPT y Educación para el Trabajo', () => {
    expect(coincideEspecialidad('EPT', 'Educación para el Trabajo')).toBe(true);
    expect(coincideEspecialidad('Educación para el Trabajo', 'EPT')).toBe(true);
    expect(coincideEspecialidad('Matemática, EPT', 'Educación para el Trabajo')).toBe(true);
    expect(coincideEspecialidad('EPT - Computación', 'EPT')).toBe(true);
  });

  it('compara otras especialidades con normalización de mayúsculas y tildes', () => {
    expect(coincideEspecialidad('Matemática', 'matematica')).toBe(true);
    expect(coincideEspecialidad('Comunicación', 'COMUNICACION')).toBe(true);
    expect(coincideEspecialidad('Física, Química', 'Química')).toBe(true);
  });

  it('retorna falso cuando las especialidades no coinciden', () => {
    expect(coincideEspecialidad('Matemática', 'EPT')).toBe(false);
    expect(coincideEspecialidad('Educación Física', 'Educación para el Trabajo')).toBe(false);
  });

  it('si no hay especialidad filtro retorna verdadero (sin restricción)', () => {
    expect(coincideEspecialidad('Cualquiera', '')).toBe(true);
    expect(coincideEspecialidad('Cualquiera', null)).toBe(true);
    expect(coincideEspecialidad('Cualquiera', undefined)).toBe(true);
  });
});

describe('candidatosParaCargo', () => {
  const lista = [
    docente({ id: 'aula-activo' }),
    docente({ id: 'aula-inactivo', activo: false }),
    docente({ id: 'ya-coordinador', cargo: 'Coordinador Pedagógico' }),
    docente({ id: 'aula-ept', especialidad: 'EPT' }),
  ];

  /**
   * Los dos cargos se reparten el aula por especialidad: EPT es del Jefe de
   * Taller y el resto del Coordinador. Un docente de EPT figuraba en las dos
   * listas, porque la regla exigía la especialidad para uno pero no la
   * descartaba del otro.
   */
  it('para Coordinador Pedagógico son los docentes de aula activos que no son de EPT', () => {
    const ids = candidatosParaCargo(lista, 'Coordinador Pedagógico').map((d) => d.id);
    expect(ids).toEqual(['aula-activo']);
  });

  it('ningún docente puede ser candidato a los dos cargos a la vez', () => {
    const coordinadores = candidatosParaCargo(lista, 'Coordinador Pedagógico').map((d) => d.id);
    const jefes = candidatosParaCargo(lista, 'Jefe de Taller').map((d) => d.id);

    expect(coordinadores.filter((id) => jefes.includes(id))).toEqual([]);
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
