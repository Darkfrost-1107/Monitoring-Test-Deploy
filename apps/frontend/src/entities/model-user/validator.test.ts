import { describe, it, expect } from 'vitest';
import { RoleCode, ALL_ROLE_CODES } from '@sistema-monitoreo/shared-contracts';
import { userSchema, userValidator } from './validator';
import { ADMIN_ROLES, READ_ONLY_ROLES } from './constants';
import type { User } from './model';

/**
 * Pruebas de caracterización del validador de usuario.
 *
 * Fase 3 de PLAN_REMEDIACION.md. Completa la cobertura de `model-user`, la
 * entidad de mayor radio de impacto del frontend.
 *
 * Registran comportamientos que estaban en el código sin quedar escritos en
 * ninguna parte: sin sesión se considera sólo lectura, y la pertenencia a una
 * institución se deduce del campo `institucion` y no del rol.
 */

const usuario = (over: Partial<User> = {}): User => ({
  id: 'u-1',
  dni: '40000001',
  nombres: 'Carlos',
  apellidos: 'Mendoza',
  role: RoleCode.ESPECIALISTA,
  firstLogin: false,
  ...over,
});

describe('userSchema', () => {
  const valido = {
    dni: '40000001',
    nombres: 'Carlos',
    apellidos: 'Mendoza',
    role: RoleCode.ESPECIALISTA,
    firstLogin: false,
  };

  it('acepta un usuario con los campos mínimos', () => {
    expect(userSchema.safeParse(valido).success).toBe(true);
  });

  it.each([...ALL_ROLE_CODES])('acepta el rol %s del contrato', (rol) => {
    expect(userSchema.safeParse({ ...valido, role: rol }).success).toBe(true);
  });

  it.each([['admin'], ['ADMIN'], ['SPECIALIST'], ['']])(
    'rechaza el rol %p, ajeno al contrato',
    (rol) => {
      expect(userSchema.safeParse({ ...valido, role: rol }).success).toBe(false);
    },
  );

  describe('DNI', () => {
    it.each([
      ['4000000', 'siete dígitos'],
      ['400000012', 'nueve dígitos'],
      ['4000000A', 'con letra'],
      ['', 'vacío'],
    ])('rechaza %p (%s)', (dni) => {
      expect(userSchema.safeParse({ ...valido, dni }).success).toBe(false);
    });

    it('acepta exactamente ocho dígitos', () => {
      expect(userSchema.safeParse({ ...valido, dni: '00000000' }).success).toBe(true);
    });
  });

  it('exige al menos dos caracteres en nombres y apellidos', () => {
    expect(userSchema.safeParse({ ...valido, nombres: 'C' }).success).toBe(false);
    expect(userSchema.safeParse({ ...valido, apellidos: 'M' }).success).toBe(false);
  });

  it('trata institución y distrito como opcionales', () => {
    const conOpcionales = { ...valido, institucion: 'ie-1', distrito: 'Lampa' };
    expect(userSchema.safeParse(conOpcionales).success).toBe(true);
  });
});

describe('userValidator.isAdmin', () => {
  it.each([...ADMIN_ROLES])('reconoce a %s como administrativo', (rol) => {
    expect(userValidator.isAdmin(usuario({ role: rol }))).toBe(true);
  });

  it('no reconoce al resto de los roles', () => {
    const resto = ALL_ROLE_CODES.filter((r) => !ADMIN_ROLES.includes(r));
    for (const rol of resto) {
      expect(userValidator.isAdmin(usuario({ role: rol }))).toBe(false);
    }
  });

  it('sin sesión no es administrativo', () => {
    expect(userValidator.isAdmin(null)).toBe(false);
  });

  it('no incluye a superusuario', () => {
    // `superusuario` asigna altos cargos, pero no administra el padrón: son
    // atribuciones distintas y el validador las mantiene separadas.
    expect(userValidator.isAdmin(usuario({ role: RoleCode.SUPERUSUARIO }))).toBe(false);
  });
});

describe('userValidator.isReadOnly', () => {
  it.each([...READ_ONLY_ROLES])('reconoce a %s como sólo lectura', (rol) => {
    expect(userValidator.isReadOnly(usuario({ role: rol }))).toBe(true);
  });

  it('sin sesión se considera sólo lectura', () => {
    // Comportamiento defensivo: ante la ausencia de usuario se niega la
    // capacidad de mutar en lugar de concederla.
    expect(userValidator.isReadOnly(null)).toBe(true);
  });

  it('un rol con capacidad de mutar no es sólo lectura', () => {
    expect(userValidator.isReadOnly(usuario({ role: RoleCode.JEFE_GESTION }))).toBe(false);
  });
});

describe('userValidator.isInstitutionStaff', () => {
  it('se deduce del campo institución, no del rol', () => {
    // Un especialista de UGEL con institución asignada da `true`; es una
    // comprobación sobre el dato, no sobre la posición organizativa. Para esta
    // última existe `useScope`.
    expect(userValidator.isInstitutionStaff(usuario({ institucion: 'ie-1' }))).toBe(true);
    expect(
      userValidator.isInstitutionStaff(
        usuario({ role: RoleCode.DIRECTOR_INSTITUCION, institucion: undefined }),
      ),
    ).toBe(false);
  });

  it('una institución vacía no cuenta', () => {
    expect(userValidator.isInstitutionStaff(usuario({ institucion: '' }))).toBe(false);
  });

  it('sin sesión no pertenece a ninguna institución', () => {
    expect(userValidator.isInstitutionStaff(null)).toBe(false);
  });
});
