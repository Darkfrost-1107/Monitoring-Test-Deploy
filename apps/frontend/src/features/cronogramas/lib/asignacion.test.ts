import { describe, it, expect } from 'vitest';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';
import {
  especialistasAsignables,
  institucionesAsignables,
  modalidadesPermitidas,
  nivelesPermitidos,
  type EspecialistaAsignable,
  type InstitucionAsignable,
  type UsuarioAsignador,
} from './asignacion';

/**
 * Pruebas de la cascada de asignación de un cronograma.
 *
 * Fase 5 de PLAN_REMEDIACION.md. Estas cuatro reglas vivían como `useMemo`
 * dentro de `CronogramaPage`, un componente de 1.446 líneas. Deciden quién
 * puede monitorear qué: a qué modalidades accede el usuario, qué niveles ofrece
 * cada modalidad, qué especialistas pueden asignarse y a qué instituciones.
 * Ninguna tenía cobertura.
 */

const usuario = (over: Partial<UsuarioAsignador> = {}): UsuarioAsignador => ({
  role: RoleCode.JEFE_GESTION,
  ...over,
});

const especialista = (over: Partial<EspecialistaAsignable> = {}): EspecialistaAsignable => ({
  id: 'esp-1',
  cargo: 'Especialista',
  activo: true,
  nivelEducativo: 'Primaria',
  modalidad: 'EBR',
  ...over,
});

const institucion = (over: Partial<InstitucionAsignable> = {}): InstitucionAsignable => ({
  id: 'ie-1',
  modalidad: 'EBR',
  nivelEducativo: 'Primaria',
  estado: 'Activa',
  ...over,
});

describe('modalidadesPermitidas', () => {
  it('el jefe de gestión accede a todas', () => {
    expect(modalidadesPermitidas(usuario()).length).toBeGreaterThan(1);
  });

  it('sin usuario devuelve todas', () => {
    expect(modalidadesPermitidas(null).length).toBeGreaterThan(1);
  });

  it('un jefe de área sin nivel asignado no queda restringido', () => {
    const actor = usuario({ role: RoleCode.JEFE_AREA, especialistaNivel: undefined });
    expect(modalidadesPermitidas(actor).length).toBeGreaterThan(1);
  });

  it.each([
    ['Inicial', ['EBE', 'EBR']],
    ['Primaria', ['EBR']],
    ['Secundaria', ['CEPTRO', 'EBA', 'EBR']],
  ])('el jefe de área de %s accede a %s', (nivel, esperadas) => {
    const actor = usuario({ role: RoleCode.JEFE_AREA, especialistaNivel: nivel });
    expect([...modalidadesPermitidas(actor)].sort()).toEqual(esperadas);
  });
});

describe('nivelesPermitidos', () => {
  it('sin modalidad no ofrece niveles', () => {
    expect(nivelesPermitidos('', usuario())).toEqual([]);
  });

  it('ofrece los niveles de la modalidad', () => {
    expect(nivelesPermitidos('EBR', usuario()).length).toBeGreaterThan(0);
  });

  it('una modalidad desconocida no ofrece niveles', () => {
    expect(nivelesPermitidos('INEXISTENTE', usuario())).toEqual([]);
  });

  it('el jefe de área sólo ve su propio nivel dentro de EBR', () => {
    const actor = usuario({ role: RoleCode.JEFE_AREA, especialistaNivel: 'Primaria' });
    expect(nivelesPermitidos('EBR', actor)).toEqual(['Primaria']);
  });

  /**
   * La restricción por nivel se aplica sólo a EBR. Las otras modalidades tienen
   * su propia estructura de niveles y no se corresponden una a una con la de
   * educación básica regular.
   */
  it('el jefe de área no queda restringido fuera de EBR', () => {
    const actor = usuario({ role: RoleCode.JEFE_AREA, especialistaNivel: 'Primaria' });
    expect(nivelesPermitidos('EBA', actor)).toEqual(nivelesPermitidos('EBA', usuario()));
  });
});

describe('especialistasAsignables — sin cascada completa', () => {
  it('no ofrece nadie sin modalidad', () => {
    expect(especialistasAsignables([especialista()], '', 'Primaria', usuario())).toEqual([]);
  });

  it('no ofrece nadie sin nivel', () => {
    expect(especialistasAsignables([especialista()], 'EBR', '', usuario())).toEqual([]);
  });
});

describe('especialistasAsignables — EBR', () => {
  const asignables = (esp: EspecialistaAsignable[], actor = usuario()) =>
    especialistasAsignables(esp, 'EBR', 'Primaria', actor).map((e) => e.id);

  it('ofrece al especialista de la misma modalidad y nivel', () => {
    expect(asignables([especialista({ id: 'ok' })])).toEqual(['ok']);
  });

  it('descarta al de otro nivel', () => {
    expect(asignables([especialista({ id: 'x', nivelEducativo: 'Secundaria' })])).toEqual([]);
  });

  it('descarta al de otra modalidad', () => {
    expect(asignables([especialista({ id: 'x', modalidad: 'EBA' })])).toEqual([]);
  });

  /** EBR es la modalidad principal de la UGEL y se asume cuando falta el dato. */
  it('asume EBR cuando el especialista no declara modalidad', () => {
    expect(asignables([especialista({ id: 'ok', modalidad: undefined })])).toEqual(['ok']);
  });

  it('descarta al inactivo', () => {
    expect(asignables([especialista({ id: 'x', activo: false })])).toEqual([]);
  });

  it('descarta cargos que no monitorean', () => {
    expect(asignables([especialista({ id: 'x', cargo: 'Director' })])).toEqual([]);
  });
});

describe('especialistasAsignables — jefe de gestión', () => {
  const jefe = (id: string) => especialista({ id, cargo: 'Jefe de Gestión' });

  /**
   * Un jefe de gestión puede asignarse a sí mismo pero no a otro par: la carga
   * de trabajo de un jefe la decide él, no un colega.
   */
  it('el jefe de gestión puede asignarse a sí mismo', () => {
    const actor = usuario({ especialistaId: 'jefe-1' });
    const resultado = especialistasAsignables([jefe('jefe-1')], 'EBR', 'Primaria', actor);
    expect(resultado.map((e) => e.id)).toEqual(['jefe-1']);
  });

  it('no puede asignar a otro jefe de gestión', () => {
    const actor = usuario({ especialistaId: 'jefe-1' });
    const resultado = especialistasAsignables([jefe('jefe-2')], 'EBR', 'Primaria', actor);
    expect(resultado).toEqual([]);
  });
});

describe('especialistasAsignables — CEPTRO', () => {
  const asignables = (esp: EspecialistaAsignable[]) =>
    especialistasAsignables(esp, 'CEPTRO', 'Secundaria', usuario()).map((e) => e.id);

  /**
   * CEPTRO es educación técnico-productiva: exige un especialista de Secundaria
   * con la especialidad EPT, sin importar de qué modalidad venga.
   */
  it('exige Secundaria con especialidad EPT', () => {
    const apto = especialista({
      id: 'ok',
      nivelEducativo: 'Secundaria',
      especialidades: ['EPT'],
      modalidad: 'EBR',
    });
    expect(asignables([apto])).toEqual(['ok']);
  });

  it('descarta a quien no tiene EPT', () => {
    const sinEpt = especialista({ id: 'x', nivelEducativo: 'Secundaria', especialidades: ['CTA'] });
    expect(asignables([sinEpt])).toEqual([]);
  });

  it('descarta a quien no es de Secundaria aunque tenga EPT', () => {
    const primaria = especialista({ id: 'x', nivelEducativo: 'Primaria', especialidades: ['EPT'] });
    expect(asignables([primaria])).toEqual([]);
  });

  it('ignora la modalidad de origen del especialista', () => {
    const deOtraModalidad = especialista({
      id: 'ok',
      modalidad: 'EBA',
      nivelEducativo: 'Secundaria',
      especialidades: ['EPT'],
    });
    expect(asignables([deOtraModalidad])).toEqual(['ok']);
  });
});

describe('especialistasAsignables — EBA y EBE', () => {
  /**
   * EBA y EBE se cubren con especialistas de Inicial o Primaria, con
   * independencia del nivel que pida el cronograma.
   */
  it.each(['EBA', 'EBE'])('%s admite especialistas de Inicial o Primaria', (modalidad) => {
    const inicial = especialista({ id: 'ini', nivelEducativo: 'Inicial' });
    const primaria = especialista({ id: 'pri', nivelEducativo: 'Primaria' });
    const secundaria = especialista({ id: 'sec', nivelEducativo: 'Secundaria' });

    const resultado = especialistasAsignables(
      [inicial, primaria, secundaria],
      modalidad,
      'Secundaria',
      usuario(),
    );

    expect(resultado.map((e) => e.id).sort()).toEqual(['ini', 'pri']);
  });
});

describe('institucionesAsignables', () => {
  it('no ofrece nada sin modalidad o sin nivel', () => {
    expect(institucionesAsignables([institucion()], '', 'Primaria')).toEqual([]);
    expect(institucionesAsignables([institucion()], 'EBR', '')).toEqual([]);
  });

  it('ofrece la institución que coincide en modalidad y nivel', () => {
    const resultado = institucionesAsignables([institucion({ id: 'ok' })], 'EBR', 'Primaria');
    expect(resultado.map((i) => i.id)).toEqual(['ok']);
  });

  it('descarta la de otra modalidad o de otro nivel', () => {
    expect(institucionesAsignables([institucion({ modalidad: 'EBA' })], 'EBR', 'Primaria')).toEqual([]);
    expect(
      institucionesAsignables([institucion({ nivelEducativo: 'Inicial' })], 'EBR', 'Primaria'),
    ).toEqual([]);
  });

  it('descarta la institución cerrada', () => {
    const cerrada = institucion({ estado: 'Inactiva', activo: false });
    expect(institucionesAsignables([cerrada], 'EBR', 'Primaria')).toEqual([]);
  });

  /** Conviven dos formas de marcar vigencia; basta con una de las dos. */
  it('admite la institución activa por cualquiera de las dos marcas', () => {
    const porEstado = institucion({ id: 'a', estado: 'Activa', activo: false });
    const porBandera = institucion({ id: 'b', estado: 'Inactiva', activo: true });

    const resultado = institucionesAsignables([porEstado, porBandera], 'EBR', 'Primaria');
    expect(resultado.map((i) => i.id).sort()).toEqual(['a', 'b']);
  });
});
