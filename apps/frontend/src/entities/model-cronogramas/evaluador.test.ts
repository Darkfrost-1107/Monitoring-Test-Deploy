import { describe, it, expect } from 'vitest';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';
import {
  ROLES_EVALUADORES,
  puedeEvaluarVisita,
  type UsuarioEvaluador,
  type VisitaEvaluable,
} from './evaluador';

/**
 * Pruebas de caracterización de «quién puede levantar la ficha de esta visita».
 *
 * Fase 5 de PLAN_REMEDIACION.md. Esta regla vivía como un `useMemo` de 27 líneas
 * dentro de `CalendarioSidebar`, un componente de 917 líneas: no podía probarse
 * sin montar el widget entero con su cliente de consultas.
 *
 * Lo que se fija acá es el comportamiento **de hoy**, defectos incluidos y
 * marcados como tales. Esa es la condición para poder descomponer el componente
 * sin cambiar lo que el usuario ve. La corrección del respaldo por nombre es un
 * cambio de comportamiento y se decide aparte, no de contrabando dentro de un
 * refactor.
 */

const usuario = (over: Partial<UsuarioEvaluador> = {}): UsuarioEvaluador => ({
  role: RoleCode.ESPECIALISTA,
  nombres: 'Carlos',
  apellidos: 'Mendoza',
  ...over,
});

const visita = (over: Partial<VisitaEvaluable> = {}): VisitaEvaluable => ({
  monitorId: 'esp-1',
  especialista: 'Carlos Mendoza',
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

  it('niega cuando el identificador no coincide, aunque el nombre sí', () => {
    const actor = usuario({ especialistaId: 'esp-7', nombres: 'Carlos', apellidos: 'Mendoza' });
    const objetivo = visita({ monitorId: 'esp-9', especialista: 'Carlos Mendoza' });
    expect(puedeEvaluarVisita(actor, objetivo)).toBe(false);
  });

  it('el identificador tiene prioridad sobre el nombre: es la vía exacta', () => {
    const actor = usuario({ especialistaId: 'esp-7', nombres: 'Otro', apellidos: 'Nombre' });
    expect(puedeEvaluarVisita(actor, visita({ monitorId: 'esp-7' }))).toBe(true);
  });
});

describe('puedeEvaluarVisita — respaldo por nombre (legado)', () => {
  it('cae al respaldo cuando el usuario no tiene especialista vinculado', () => {
    const actor = usuario({ especialistaId: undefined });
    expect(puedeEvaluarVisita(actor, visita({ especialista: 'Carlos Mendoza' }))).toBe(true);
  });

  it('cae al respaldo cuando la visita no tiene monitor asignado', () => {
    const actor = usuario({ especialistaId: 'esp-7' });
    expect(puedeEvaluarVisita(actor, visita({ monitorId: '', especialista: 'Carlos Mendoza' }))).toBe(
      true,
    );
  });

  it('admite cuando el nombre de la visita contiene el nombre completo', () => {
    const actor = usuario({ especialistaId: undefined, nombres: 'Carlos', apellidos: 'Mendoza' });
    const objetivo = visita({ especialista: 'Prof. Carlos Mendoza Ríos' });
    expect(puedeEvaluarVisita(actor, objetivo)).toBe(true);
  });

  it('admite cuando el nombre completo contiene el nombre de la visita', () => {
    const actor = usuario({
      especialistaId: undefined,
      nombres: 'Carlos Alberto',
      apellidos: 'Mendoza',
    });
    const objetivo = visita({ especialista: 'Alberto Mendoza' });
    expect(puedeEvaluarVisita(actor, objetivo)).toBe(true);
  });

  it('admite cuando la visita menciona sólo el nombre de pila', () => {
    const actor = usuario({ especialistaId: undefined, nombres: 'Carlos', apellidos: 'Mendoza' });
    const objetivo = visita({ especialista: 'Carlos Quispe' });
    expect(puedeEvaluarVisita(actor, objetivo)).toBe(true);
  });

  it('ignora diferencias de mayúsculas', () => {
    const actor = usuario({ especialistaId: undefined, nombres: 'CARLOS', apellidos: 'MENDOZA' });
    expect(puedeEvaluarVisita(actor, visita({ especialista: 'carlos mendoza' }))).toBe(true);
  });

  it('niega cuando no hay ninguna coincidencia', () => {
    const actor = usuario({ especialistaId: undefined, nombres: 'Lucía', apellidos: 'Fernández' });
    expect(puedeEvaluarVisita(actor, visita({ especialista: 'Carlos Mendoza' }))).toBe(false);
  });

  /**
   * DEFECTO CONOCIDO, fijado a propósito.
   *
   * El respaldo compara por inclusión de cadenas, de modo que un nombre de pila
   * corto autoriza sobre cualquier visita cuyo evaluador lo contenga como
   * subcadena. «Ana» queda habilitada sobre una visita de «Juana Pérez».
   *
   * No es un caso rebuscado: los nombres de pila cortos son comunes y el
   * respaldo se activa siempre que falte el vínculo con especialista, que es el
   * estado de los datos migrados. Se fija acá para que la corrección sea un
   * cambio visible y medible, no un efecto colateral del refactor.
   */
  it('DEFECTO: un nombre de pila corto autoriza por subcadena', () => {
    const actor = usuario({ especialistaId: undefined, nombres: 'Ana', apellidos: 'Torres' });
    const objetivo = visita({ especialista: 'Juana Pérez' });
    expect(puedeEvaluarVisita(actor, objetivo)).toBe(true);
  });
});
