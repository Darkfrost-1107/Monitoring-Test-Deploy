import { RoleCode } from '../../common/enums/role.enum.js';
import {
  BASE_CAPABILITIES,
  CargoNombre,
  CARGO_COMPATIBILITY,
  CARGO_PRIORIDAD,
  computeEffectivePermissions,
  canAddCargo,
  DOCENTE_CARGO_CAPABILITIES,
  ESPECIALISTA_CARGO_CAPABILITIES,
  EspecialistaCargoEnum,
  resolvePrincipalCargo,
  ROL_CAPABILITIES,
} from './capability-map.js';

describe('capability-map', () => {
  describe('BASE_CAPABILITIES', () => {
    it('contiene reports:read para que toda persona vea sus propios reportes', () => {
      expect(BASE_CAPABILITIES).toContain('reports:read');
    });
    it('contiene monitoreo:read para que todo usuario autenticado pueda leer sus propias fichas', () => {
      expect(BASE_CAPABILITIES).toContain('monitoreo:read');
    });
  });

  describe('computeEffectivePermissions', () => {
    it('un director_ugel tiene dashboard/instituciones:read, notificaciones:send, visitas:solicitar y carpeta_pedagogica:read (+ base)', () => {
      const perms = computeEffectivePermissions(RoleCode.DIRECTOR_UGEL, null, []);
      expect(new Set(perms)).toEqual(
        new Set([
          ...BASE_CAPABILITIES,
          'dashboard:read',
          'instituciones:read',
          'notificaciones:send',
          'visitas:solicitar',
          'carpeta_pedagogica:read',
        ]),
      );
    });

    it('un docente sin cargos activos ve reports:read, monitoreo:read y su carpeta pedagogica', () => {
      // `carpeta_pedagogica:write` es la unica capacidad de escritura de un
      // docente sin cargo, y no le alcanza para tocar la carpeta de otro: el
      // endpoint resuelve el docente desde la sesion.
      const perms = computeEffectivePermissions(RoleCode.DOCENTE, null, []);
      expect(new Set(perms)).toEqual(new Set([...BASE_CAPABILITIES, 'carpeta_pedagogica:write']));
    });

    it('un docente sin cargos NO puede leer la carpeta pedagogica de otros', () => {
      const perms = computeEffectivePermissions(RoleCode.DOCENTE, null, []);
      expect(perms).not.toContain('carpeta_pedagogica:read');
    });

    it('un docente con cargo Director tiene acceso a instituciones:write y docentes:write', () => {
      const perms = computeEffectivePermissions(RoleCode.DOCENTE, null, [CargoNombre.DIRECTOR]);
      expect(perms).toContain('instituciones:write');
      expect(perms).toContain('docentes:write');
      expect(perms).toContain('monitoreo:execute');
    });

    it('un jefe_taller con docente de aula combina capacidades de ambos', () => {
      const perms = computeEffectivePermissions(RoleCode.JEFE_TALLER, null, [
        CargoNombre.JEFE_DE_TALLER,
        CargoNombre.DOCENTE_DE_AULA,
      ]);
      // ROL_CAPABILITIES de JEFE_TALLER ya da monitoreo:execute. El cargo lo refuerza
      // (idempotente porque usamos Set). Base capabilities presentes.
      expect(perms).toContain('reports:read');
      expect(perms).toContain('monitoreo:execute');
      expect(perms).toContain('docentes:read');
    });

    it('un especialista con cargo Jefe de Gestion tiene permisos combinados', () => {
      const perms = computeEffectivePermissions(
        RoleCode.ESPECIALISTA,
        EspecialistaCargoEnum.JEFE_GESTION,
        [],
      );
      expect(perms).toContain('especialistas:write');
      expect(perms).toContain('monitoreo:execute');
    });

    it('el resultado no tiene duplicados aunque la misma capability venga de varias fuentes', () => {
      const perms = computeEffectivePermissions(RoleCode.JEFE_TALLER, null, [
        CargoNombre.JEFE_DE_TALLER,
      ]);
      const unique = new Set(perms);
      expect(perms.length).toBe(unique.size);
    });
  });

  describe('canAddCargo (reglas de coexistencia)', () => {
    it('Director no se puede agregar si ya tiene otro cargo', () => {
      expect(canAddCargo([CargoNombre.DOCENTE_DE_AULA], CargoNombre.DIRECTOR)).toBe(false);
    });

    it('Director se puede agregar si no tiene cargos', () => {
      expect(canAddCargo([], CargoNombre.DIRECTOR)).toBe(true);
    });

    it('Jefe de Taller se puede combinar con Docente de Aula', () => {
      expect(canAddCargo([CargoNombre.DOCENTE_DE_AULA], CargoNombre.JEFE_DE_TALLER)).toBe(true);
      expect(canAddCargo([CargoNombre.JEFE_DE_TALLER], CargoNombre.DOCENTE_DE_AULA)).toBe(true);
    });

    it('Director NO se puede combinar con Jefe de Taller', () => {
      expect(canAddCargo([CargoNombre.JEFE_DE_TALLER], CargoNombre.DIRECTOR)).toBe(false);
    });

    it('Subdirector es unico, igual que Director', () => {
      expect(canAddCargo([CargoNombre.DOCENTE_DE_AULA], CargoNombre.SUBDIRECTOR)).toBe(false);
    });
  });

  describe('resolvePrincipalCargo (es_principal por prioridad)', () => {
    it('sin cargos devuelve null', () => {
      expect(resolvePrincipalCargo([])).toBeNull();
    });

    it('un solo cargo gana por ser el unico', () => {
      expect(resolvePrincipalCargo([CargoNombre.DOCENTE_DE_AULA])).toBe(
        CargoNombre.DOCENTE_DE_AULA,
      );
    });

    it('Director gana sobre Docente de Aula', () => {
      expect(resolvePrincipalCargo([CargoNombre.DOCENTE_DE_AULA, CargoNombre.DIRECTOR])).toBe(
        CargoNombre.DIRECTOR,
      );
    });

    it('Coordinador Pedagogico gana sobre Jefe de Taller (3 > 2)', () => {
      expect(
        resolvePrincipalCargo([CargoNombre.JEFE_DE_TALLER, CargoNombre.COORDINADOR_PEDAGOGICO]),
      ).toBe(CargoNombre.COORDINADOR_PEDAGOGICO);
    });

    it('Jefe de Taller gana sobre PIP (2 > 1)', () => {
      expect(resolvePrincipalCargo([CargoNombre.PIP, CargoNombre.JEFE_DE_TALLER])).toBe(
        CargoNombre.JEFE_DE_TALLER,
      );
    });
  });

  describe('coherencia entre los 3 mapas', () => {
    it('ROL_CAPABILITIES tiene una entrada por cada RoleCode', () => {
      const rolesInMap = Object.keys(ROL_CAPABILITIES);
      const allRoles = Object.values(RoleCode);
      for (const r of allRoles) {
        expect(rolesInMap).toContain(r);
      }
    });

    it('CARGO_COMPATIBILITY tiene una entrada por cada CargoNombre', () => {
      const cargosInMap = Object.keys(CARGO_COMPATIBILITY);
      const allCargos = Object.values(CargoNombre);
      for (const c of allCargos) {
        expect(cargosInMap).toContain(c);
      }
    });

    it('CARGO_PRIORIDAD tiene una entrada por cada CargoNombre', () => {
      const cargosInMap = Object.keys(CARGO_PRIORIDAD);
      const allCargos = Object.values(CargoNombre);
      for (const c of allCargos) {
        expect(cargosInMap).toContain(c);
      }
    });

    it('ESPECIALISTA_CARGO_CAPABILITIES tiene una entrada por cada EspecialistaCargoEnum', () => {
      const cargosInMap = Object.keys(ESPECIALISTA_CARGO_CAPABILITIES);
      const allCargos = Object.values(EspecialistaCargoEnum);
      for (const c of allCargos) {
        expect(cargosInMap).toContain(c);
      }
    });

    it('DOCENTE_CARGO_CAPABILITIES tiene una entrada por cada CargoNombre', () => {
      const cargosInMap = Object.keys(DOCENTE_CARGO_CAPABILITIES);
      const allCargos = Object.values(CargoNombre);
      for (const c of allCargos) {
        expect(cargosInMap).toContain(c);
      }
    });
  });
});
