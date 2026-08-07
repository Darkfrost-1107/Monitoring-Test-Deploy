import { describe, it, expect } from 'vitest';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';
import {
  cronogramasVisibles,
  type CronogramaVisible,
  type UsuarioObservador,
} from './visibilidad';

/**
 * Pruebas de qué cronogramas ve cada usuario.
 *
 * Fase 5 de PLAN_REMEDIACION.md. Esta regla estaba escrita dos veces —en
 * `CronogramaPage` y en `CalendarioPage`— y las dos copias no coincidían: la de
 * cronogramas comparaba la institución sólo por nombre, la del calendario
 * también por identificador. Dos pantallas discrepando sobre qué ve el mismo
 * director.
 *
 * Es filtrado de presentación, no el control de acceso de fondo: el backend
 * aplica RLS sobre las mismas filas.
 */

const usuario = (over: Partial<UsuarioObservador> = {}): UsuarioObservador => ({
  role: RoleCode.JEFE_GESTION,
  nombres: 'Carlos',
  apellidos: 'Mendoza',
  ...over,
});

const cronograma = (over: Partial<CronogramaVisible> = {}): CronogramaVisible => ({
  institucion: 'IE 1234',
  institucionId: 'ie-1',
  docenteDirectivo: 'Luis Quispe',
  tipo: 'DOCENTE',
  modalidad: 'EBR',
  nivel: 'Primaria',
  ...over,
});

const idsVisibles = (lista: CronogramaVisible[], actor: UsuarioObservador | null) =>
  cronogramasVisibles(
    lista.map((c, i) => ({ ...c, id: `c${i}` })),
    actor,
  ).map((c) => c.id);

describe('cronogramasVisibles — roles sin restricción', () => {
  it('el jefe de gestión ve todo', () => {
    expect(idsVisibles([cronograma(), cronograma()], usuario())).toEqual(['c0', 'c1']);
  });

  it('sin usuario no se filtra nada', () => {
    expect(idsVisibles([cronograma()], null)).toEqual(['c0']);
  });
});

describe('cronogramasVisibles — director de institución', () => {
  const director = (over: Partial<UsuarioObservador> = {}) =>
    usuario({ role: RoleCode.DIRECTOR_INSTITUCION, ...over });

  it('ve las visitas de su institución por identificador', () => {
    const actor = director({ institucion: 'ie-1', institucionNombre: undefined });
    expect(idsVisibles([cronograma({ institucionId: 'ie-1' })], actor)).toEqual(['c0']);
  });

  it('ve las visitas de su institución por nombre', () => {
    const actor = director({ institucion: undefined, institucionNombre: 'IE 1234' });
    expect(idsVisibles([cronograma({ institucion: 'IE 1234' })], actor)).toEqual(['c0']);
  });

  it('compara el nombre sin distinguir mayúsculas', () => {
    const actor = director({ institucionNombre: 'ie 1234' });
    expect(idsVisibles([cronograma({ institucion: 'IE 1234' })], actor)).toEqual(['c0']);
  });

  it('no ve las visitas de otra institución', () => {
    const actor = director({ institucion: 'ie-9', institucionNombre: 'IE 9999' });
    expect(idsVisibles([cronograma()], actor)).toEqual([]);
  });

  /**
   * Un director también es evaluado: ve la visita dirigida a él aunque esté
   * registrada en otra institución.
   */
  it('ve la visita directiva dirigida a él aunque sea de otra institución', () => {
    const actor = director({ institucion: 'ie-9', nombres: 'Carlos', apellidos: 'Mendoza' });
    const propia = cronograma({
      institucionId: 'otra',
      tipo: 'DIRECTIVO',
      docenteDirectivo: 'Carlos Mendoza',
    });

    expect(idsVisibles([propia], actor)).toEqual(['c0']);
  });

  it('no toma como propia una visita a docente con su mismo nombre', () => {
    const actor = director({ institucion: 'ie-9' });
    const ajena = cronograma({
      institucionId: 'otra',
      tipo: 'DOCENTE',
      docenteDirectivo: 'Carlos Mendoza',
    });

    expect(idsVisibles([ajena], actor)).toEqual([]);
  });
});

describe('cronogramasVisibles — jefe de área', () => {
  const jefe = (nivel: string) =>
    usuario({ role: RoleCode.JEFE_AREA, especialistaNivel: nivel });

  it('sin nivel asignado no queda restringido', () => {
    const actor = usuario({ role: RoleCode.JEFE_AREA, especialistaNivel: undefined });
    expect(idsVisibles([cronograma({ nivel: 'Secundaria' })], actor)).toEqual(['c0']);
  });

  it('el de Inicial ve Inicial y la modalidad EBE', () => {
    const inicial = cronograma({ nivel: 'Inicial' });
    const ebe = cronograma({ modalidad: 'EBE', nivel: 'Primaria' });
    const otro = cronograma({ nivel: 'Secundaria', modalidad: 'EBR' });

    expect(idsVisibles([inicial, ebe, otro], jefe('Inicial'))).toEqual(['c0', 'c1']);
  });

  it('el de Primaria ve sólo Primaria', () => {
    const primaria = cronograma({ nivel: 'Primaria' });
    const secundaria = cronograma({ nivel: 'Secundaria' });

    expect(idsVisibles([primaria, secundaria], jefe('Primaria'))).toEqual(['c0']);
  });

  it('el de Secundaria ve Secundaria, EBA y CEPTRO', () => {
    const secundaria = cronograma({ nivel: 'Secundaria', modalidad: 'EBR' });
    const eba = cronograma({ nivel: 'Primaria', modalidad: 'EBA' });
    const ceptro = cronograma({ nivel: 'Primaria', modalidad: 'CEPTRO' });
    const primaria = cronograma({ nivel: 'Primaria', modalidad: 'EBR' });

    expect(idsVisibles([secundaria, eba, ceptro, primaria], jefe('Secundaria'))).toEqual([
      'c0',
      'c1',
      'c2',
    ]);
  });

  it('acepta la modalidad heredada SECUNDARIA aunque el nivel no coincida', () => {
    const heredado = cronograma({ nivel: 'Primaria', modalidad: 'SECUNDARIA' });
    expect(idsVisibles([heredado], jefe('Secundaria'))).toEqual(['c0']);
  });

  it('compara la modalidad sin distinguir mayúsculas', () => {
    const eba = cronograma({ nivel: 'Primaria', modalidad: 'eba' });
    expect(idsVisibles([eba], jefe('Secundaria'))).toEqual(['c0']);
  });

  it('tolera un cronograma sin modalidad', () => {
    const sinModalidad = cronograma({ nivel: 'Primaria', modalidad: undefined });
    expect(idsVisibles([sinModalidad], jefe('Primaria'))).toEqual(['c0']);
  });
});
