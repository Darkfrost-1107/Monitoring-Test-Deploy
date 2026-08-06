import { RoleCode, ROLE_LABELS, ALL_ROLE_CODES, isRoleCode } from './role.enum.js';
import { ROL_CAPABILITIES } from '../../shared/auth/capability-map.js';

/**
 * Pruebas del contrato canónico de roles (Fase 1 de PLAN_REMEDIACION.md).
 *
 * La exhaustividad frente a `Record<RoleCode, …>` la garantiza el compilador y
 * está verificada: agregar un rol al contrato rompe la compilación en
 * `ROLE_LABELS`, en `ROL_CAPABILITIES` del backend y en `ROLE_PERMISSIONS` del
 * frontend. Lo que estas pruebas cubren es lo que el tipado no puede: la
 * correspondencia con los datos sembrados y el comportamiento en la frontera.
 */

/**
 * Códigos sembrados por `database/seeders/auth.js`. Se replican aquí a
 * propósito: si el seeder y el contrato divergen, esta prueba debe fallar. Un
 * import compartido haría que ambos se movieran juntos y ocultaría la deriva.
 */
const CODIGOS_SEMBRADOS = [
  'director_ugel',
  'jefe_area',
  'jefe_gestion',
  'especialista',
  'director_institucion',
  'coordinador_pedagogico',
  'jefe_taller',
  'docente',
  'invitado',
  'superusuario',
];

describe('Contrato de roles', () => {
  describe('correspondencia con los datos sembrados', () => {
    it('declara exactamente los códigos que siembra database/seeders/auth.js', () => {
      expect([...ALL_ROLE_CODES].sort()).toEqual([...CODIGOS_SEMBRADOS].sort());
    });

    it('no declara el rol admin, que el backend nunca emitió', () => {
      expect(ALL_ROLE_CODES).not.toContain('admin');
    });

    it('conserva superusuario, que es el rol que gestiona altos cargos', () => {
      expect(ALL_ROLE_CODES).toContain(RoleCode.SUPERUSUARIO);
      expect(ROL_CAPABILITIES[RoleCode.SUPERUSUARIO]).toContain('superadmin:access');
    });
  });

  describe('unicidad y consistencia interna', () => {
    it('no repite códigos', () => {
      expect(new Set(ALL_ROLE_CODES).size).toBe(ALL_ROLE_CODES.length);
    });

    it('etiqueta todos los roles con un texto no vacío', () => {
      for (const codigo of ALL_ROLE_CODES) {
        expect(ROLE_LABELS[codigo]?.trim()).toBeTruthy();
      }
    });

    it('asigna capabilities a todos los roles del contrato', () => {
      for (const codigo of ALL_ROLE_CODES) {
        expect(ROL_CAPABILITIES[codigo]).toBeDefined();
      }
    });
  });

  describe('isRoleCode en la frontera con la base de datos', () => {
    it.each([...CODIGOS_SEMBRADOS])('acepta %s', (codigo) => {
      expect(isRoleCode(codigo)).toBe(true);
    });

    it.each([
      ['admin', 'rol retirado'],
      ['ADMIN', 'mayúsculas del enum de Prisma retirado'],
      ['SPECIALIST', 'valor del contrato huérfano anterior'],
      ['', 'cadena vacía'],
      ['director-ugel', 'separador incorrecto'],
    ])('rechaza %s (%s)', (valor) => {
      expect(isRoleCode(valor)).toBe(false);
    });

    it.each([[null], [undefined], [42], [{}], [[]]])('rechaza el valor no textual %p', (valor) => {
      expect(isRoleCode(valor)).toBe(false);
    });
  });
});
