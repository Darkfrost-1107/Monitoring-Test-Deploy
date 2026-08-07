import { describe, it, expect } from 'vitest';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';
import {
  ROLES_EVALUADORES,
  puedeEvaluarVisita,
  type UsuarioEvaluador,
  type VisitaEvaluable,
} from './evaluador';

/**
 * Pruebas de «quién puede levantar la ficha de esta visita».
 *
 * Fase 5 de PLAN_REMEDIACION.md. Esta regla vivía como un `useMemo` de 27 líneas
 * dentro de `CalendarioSidebar`, un componente de 917 líneas: no podía probarse
 * sin montar el widget entero con su cliente de consultas.
 *
 * La primera versión de este archivo fijó el comportamiento de entonces, con su
 * respaldo por inclusión de nombres y el falso positivo que ese respaldo admite.
 * Ese respaldo ya no existe: la asignación se decide sólo por identificador de
 * especialista. Lo que sigue describe la regla vigente.
 */

const usuario = (over: Partial<UsuarioEvaluador> = {}): UsuarioEvaluador => ({
  role: RoleCode.ESPECIALISTA,
  especialistaId: 'esp-1',
  ...over,
});

const visita = (over: Partial<VisitaEvaluable> = {}): VisitaEvaluable => ({
  monitorId: 'esp-1',
  ...over,
});

describe('ROLES_EVALUADORES', () => {
  it('agrupa a quienes pueden figurar como evaluador de una visita', () => {
    expect([...ROLES_EVALUADORES].sort()).toEqual(
      [
        RoleCode.ESPECIALISTA,
        RoleCode.COORDINADOR_PEDAGOGICO,
        RoleCode.JEFE_TALLER,
        RoleCode.JEFE_GESTION,
        RoleCode.JEFE_AREA,
        RoleCode.DIRECTOR_INSTITUCION,
      ].sort(),
    );
  });
});

describe('puedeEvaluarVisita — ausencia de datos', () => {
  it('niega sin usuario', () => {
    expect(puedeEvaluarVisita(null, visita())).toBe(false);
  });

  it('niega sin visita', () => {
    expect(puedeEvaluarVisita(usuario(), null)).toBe(false);
  });

  it('niega con usuario indefinido', () => {
    expect(puedeEvaluarVisita(undefined, visita())).toBe(false);
  });
});

describe('puedeEvaluarVisita — filtro por rol', () => {
  it.each(ROLES_EVALUADORES)('admite a %s cuando además es el asignado', (role) => {
    const actor = usuario({ role, especialistaId: 'esp-1' });
    expect(puedeEvaluarVisita(actor, visita({ monitorId: 'esp-1' }))).toBe(true);
  });

  it.each([RoleCode.DOCENTE, RoleCode.INVITADO, RoleCode.DIRECTOR_UGEL, RoleCode.SUPERUSUARIO])(
    'niega a %s aunque sea el asignado',
    (role) => {
      const actor = usuario({ role, especialistaId: 'esp-1' });
      expect(puedeEvaluarVisita(actor, visita({ monitorId: 'esp-1' }))).toBe(false);
    },
  );

  it('niega un código de rol desconocido', () => {
    const actor = usuario({ role: 'rol_inventado', especialistaId: 'esp-1' });
    expect(puedeEvaluarVisita(actor, visita({ monitorId: 'esp-1' }))).toBe(false);
  });
});

describe('puedeEvaluarVisita — identificación por especialista', () => {
  it('admite cuando el identificador coincide con el monitor de la visita', () => {
    const actor = usuario({ especialistaId: 'esp-7' });
    expect(puedeEvaluarVisita(actor, visita({ monitorId: 'esp-7' }))).toBe(true);
  });

  it('niega cuando el identificador no coincide', () => {
    const actor = usuario({ especialistaId: 'esp-7' });
    expect(puedeEvaluarVisita(actor, visita({ monitorId: 'esp-9' }))).toBe(false);
  });

  it('distingue mayúsculas: el identificador se compara literal', () => {
    const actor = usuario({ especialistaId: 'ESP-7' });
    expect(puedeEvaluarVisita(actor, visita({ monitorId: 'esp-7' }))).toBe(false);
  });
});

/**
 * Antes existía un respaldo que comparaba nombres por inclusión de subcadenas y
 * decidía la asignación cuando faltaba alguno de los dos identificadores. Ese
 * respaldo autorizaba de más —«Ana Torres» quedaba habilitada sobre una visita
 * de «Juana Pérez», porque «Juana» contiene «Ana»— y se retiró tras comprobar
 * en `evaluadores-sin-especialista.sql` que nadie dependía de él: los 65
 * usuarios con rol evaluador tienen registro de especialista y `monitor_id` es
 * una clave foránea no nula.
 *
 * Sin identificador no hay asignación demostrable, así que se niega.
 */
describe('puedeEvaluarVisita — sin identificador no hay asignación', () => {
  it('niega cuando el usuario no tiene especialista vinculado', () => {
    expect(puedeEvaluarVisita(usuario({ especialistaId: undefined }), visita())).toBe(false);
  });

  it('niega cuando el usuario tiene el identificador vacío', () => {
    expect(puedeEvaluarVisita(usuario({ especialistaId: '' }), visita({ monitorId: '' }))).toBe(
      false,
    );
  });

  it('niega cuando la visita no tiene monitor asignado', () => {
    expect(puedeEvaluarVisita(usuario({ especialistaId: 'esp-7' }), visita({ monitorId: '' }))).toBe(
      false,
    );
  });
});
