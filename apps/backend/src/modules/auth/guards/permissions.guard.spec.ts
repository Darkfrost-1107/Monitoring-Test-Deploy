import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { Capability } from '@sistema-monitoreo/shared-contracts';
import { PermissionsGuard } from './permissions.guard.js';

/**
 * Pruebas del punto de aplicación de la autorización.
 *
 * `PermissionsGuard` es lo que efectivamente devuelve 403: el mapa de
 * capacidades decide qué tiene cada usuario, pero es este guard el que impide
 * la petición. Estaba al 18,75 % de cobertura, la cifra más baja del módulo de
 * política siendo la pieza de mayor consecuencia.
 *
 * Fase 2 de PLAN_REMEDIACION.md.
 */

/** Contexto de ejecución mínimo con el usuario indicado en la petición. */
const contextoCon = (user: unknown): ExecutionContext =>
  ({
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

/** Reflector que devuelve las capacidades exigidas por el handler. */
const reflectorQueExige = (permisos: unknown): Reflector =>
  ({ getAllAndOverride: () => permisos }) as unknown as Reflector;

describe('PermissionsGuard', () => {
  describe('handlers sin capacidades declaradas', () => {
    it.each([
      ['sin metadatos', undefined],
      ['con lista vacía', []],
    ])('permite el acceso %s', (_caso, exigidas) => {
      const guard = new PermissionsGuard(reflectorQueExige(exigidas));
      expect(guard.canActivate(contextoCon(undefined))).toBe(true);
    });

    it('no consulta al usuario cuando no hay capacidades que exigir', () => {
      // Un handler público no debe fallar por ausencia de sesión.
      const guard = new PermissionsGuard(reflectorQueExige([]));
      expect(() => guard.canActivate(contextoCon(null))).not.toThrow();
    });
  });

  describe('peticiones sin capacidades identificables', () => {
    const guard = () => new PermissionsGuard(reflectorQueExige([Capability.DOCENTES_READ]));

    it.each([
      ['sin usuario en la petición', undefined],
      ['con usuario nulo', null],
      ['con usuario sin campo permissions', { id: 'u-1' }],
    ])('rechaza %s', (_caso, user) => {
      expect(() => guard().canActivate(contextoCon(user))).toThrow(ForbiddenException);
    });

    it('distingue el motivo: permisos no identificados', () => {
      expect(() => guard().canActivate(contextoCon({ id: 'u-1' }))).toThrow(
        /permisos no identificados/,
      );
    });
  });

  describe('evaluación conjuntiva de capacidades', () => {
    const conPermisos = (permissions: string[], exigidas: Capability[]) =>
      new PermissionsGuard(reflectorQueExige(exigidas)).canActivate(contextoCon({ permissions }));

    it('permite cuando el usuario tiene la capacidad exigida', () => {
      expect(conPermisos([Capability.DOCENTES_READ], [Capability.DOCENTES_READ])).toBe(true);
    });

    it('permite cuando tiene todas las exigidas', () => {
      expect(
        conPermisos(
          [Capability.DOCENTES_READ, Capability.DOCENTES_WRITE, Capability.DASHBOARD_READ],
          [Capability.DOCENTES_READ, Capability.DOCENTES_WRITE],
        ),
      ).toBe(true);
    });

    it('rechaza cuando le falta una de varias exigidas', () => {
      // Conjuntivo, no disyuntivo: tener una no alcanza.
      expect(() =>
        conPermisos(
          [Capability.DOCENTES_READ],
          [Capability.DOCENTES_READ, Capability.DOCENTES_WRITE],
        ),
      ).toThrow(ForbiddenException);
    });

    it('rechaza cuando no tiene ninguna', () => {
      expect(() => conPermisos([Capability.REPORTS_READ], [Capability.SUPERADMIN_ACCESS])).toThrow(
        /no cuenta con los permisos requeridos/,
      );
    });

    it('rechaza al usuario con lista de capacidades vacía', () => {
      expect(() => conPermisos([], [Capability.DOCENTES_READ])).toThrow(ForbiddenException);
    });

    it('no concede por coincidencia parcial del nombre', () => {
      // `docentes:read` no debe satisfacer una exigencia de `docentes:write`
      // aunque compartan prefijo.
      expect(() => conPermisos(['docentes:'], [Capability.DOCENTES_READ])).toThrow(
        ForbiddenException,
      );
    });

    it('exige coincidencia exacta, sin distinguir por mayúsculas ni espacios', () => {
      expect(() => conPermisos(['DOCENTES:READ'], [Capability.DOCENTES_READ])).toThrow(
        ForbiddenException,
      );
      expect(() => conPermisos([' docentes:read'], [Capability.DOCENTES_READ])).toThrow(
        ForbiddenException,
      );
    });
  });
});
