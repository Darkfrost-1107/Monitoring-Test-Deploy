import {
  Capability,
  ALL_CAPABILITIES,
  CAPABILITY_LABELS,
  isCapability,
  hasAllCapabilities,
  hasAnyCapability,
  RoleCode,
  getRoleScope,
  isUgelRole,
  isInstitutionRole,
  MONITOR_CAMPO_ROLES,
  UGEL_ROLES,
  INSTITUTION_ROLES,
  READ_ONLY_ROLES,
  ALL_ROLE_CODES,
} from '@sistema-monitoreo/shared-contracts';
import {
  BASE_CAPABILITIES,
  ROL_CAPABILITIES,
  ESPECIALISTA_CARGO_CAPABILITIES,
  DOCENTE_CARGO_CAPABILITIES,
  computeEffectivePermissions,
} from './capability-map.js';

/**
 * Contrato de capacidades y de ámbito (Fase 2 de PLAN_REMEDIACION.md).
 *
 * `capability-map.spec.ts` ya cubre la composición de capacidades efectivas y no
 * se duplica aquí. Estas pruebas cubren lo que la Fase 2 incorporó: el
 * vocabulario compartido con el frontend, los evaluadores comunes y la noción de
 * ámbito organizativo.
 */
describe('Contrato de capacidades', () => {
  describe('vocabulario compartido', () => {
    it('no declara capacidades duplicadas', () => {
      expect(new Set(ALL_CAPABILITIES).size).toBe(ALL_CAPABILITIES.length);
    });

    it('usa el formato dominio:accion en todas', () => {
      for (const capacidad of ALL_CAPABILITIES) {
        expect(capacidad).toMatch(/^[a-z_]+:[a-z_]+$/);
      }
    });

    it('etiqueta toda capacidad con un texto no vacío', () => {
      for (const capacidad of ALL_CAPABILITIES) {
        expect(CAPABILITY_LABELS[capacidad]?.trim()).toBeTruthy();
      }
    });

    it.each([['monitoreo:exec'], ['MONITOREO_EXECUTE'], ['docentes'], ['']])(
      'rechaza la capacidad inexistente %p',
      (valor) => {
        expect(isCapability(valor)).toBe(false);
      },
    );

    it.each([[null], [undefined], [7], [{}]])('rechaza el valor no textual %p', (valor) => {
      expect(isCapability(valor)).toBe(false);
    });
  });

  describe('coherencia entre el vocabulario y el mapa que lo reparte', () => {
    it('toda capacidad concedida por el mapa pertenece al vocabulario', () => {
      const repartidas = new Set<string>([
        ...BASE_CAPABILITIES,
        ...Object.values(ROL_CAPABILITIES).flat(),
        ...Object.values(ESPECIALISTA_CARGO_CAPABILITIES).flat(),
        ...Object.values(DOCENTE_CARGO_CAPABILITIES).flat(),
      ]);

      for (const capacidad of repartidas) {
        expect(isCapability(capacidad)).toBe(true);
      }
    });

    it('toda capacidad del vocabulario la concede alguna fuente', () => {
      const repartidas = new Set<string>([
        ...BASE_CAPABILITIES,
        ...Object.values(ROL_CAPABILITIES).flat(),
        ...Object.values(ESPECIALISTA_CARGO_CAPABILITIES).flat(),
        ...Object.values(DOCENTE_CARGO_CAPABILITIES).flat(),
      ]);

      // Una capacidad declarada que nadie concede es letra muerta: o falta
      // asignarla, o sobra en el vocabulario.
      for (const capacidad of ALL_CAPABILITIES) {
        expect(repartidas.has(capacidad)).toBe(true);
      }
    });
  });

  describe('evaluadores compartidos con el frontend', () => {
    const concedidas = [Capability.DOCENTES_READ, Capability.MONITOREO_EXECUTE];

    it('hasAllCapabilities exige todas, igual que PermissionsGuard', () => {
      expect(hasAllCapabilities(concedidas, [Capability.DOCENTES_READ])).toBe(true);
      expect(hasAllCapabilities(concedidas, concedidas)).toBe(true);
      expect(
        hasAllCapabilities(concedidas, [Capability.DOCENTES_READ, Capability.DOCENTES_WRITE]),
      ).toBe(false);
    });

    it('hasAnyCapability alcanza con una', () => {
      expect(
        hasAnyCapability(concedidas, [Capability.DOCENTES_WRITE, Capability.DOCENTES_READ]),
      ).toBe(true);
      expect(hasAnyCapability(concedidas, [Capability.SUPERADMIN_ACCESS])).toBe(false);
    });

    it('trata la ausencia de capacidades como conjunto vacío', () => {
      expect(hasAllCapabilities(undefined, [Capability.DOCENTES_READ])).toBe(false);
      expect(hasAnyCapability(undefined, [Capability.DOCENTES_READ])).toBe(false);
      expect(hasAllCapabilities([], [Capability.DOCENTES_READ])).toBe(false);
    });

    it('una lista vacía de requisitos se cumple siempre', () => {
      expect(hasAllCapabilities(undefined, [])).toBe(true);
      expect(hasAnyCapability(undefined, [])).toBe(true);
    });
  });

  describe('ámbito organizativo', () => {
    it('clasifica cada rol en exactamente un ámbito conocido', () => {
      for (const rol of Object.values(RoleCode)) {
        expect(['ugel', 'institucion', 'sin-ambito']).toContain(getRoleScope(rol));
      }
    });

    it('los tres ámbitos particionan el conjunto de roles sin solapamiento ni huecos', () => {
      const sinAmbito = ALL_ROLE_CODES.filter((r) => getRoleScope(r) === 'sin-ambito');

      expect(UGEL_ROLES.length + INSTITUTION_ROLES.length + sinAmbito.length).toBe(
        ALL_ROLE_CODES.length,
      );
      // Ningún rol puede estar en dos ámbitos a la vez.
      for (const rol of UGEL_ROLES) {
        expect(INSTITUTION_ROLES).not.toContain(rol);
      }
    });

    it('UGEL_ROLES e INSTITUTION_ROLES se derivan del mapa de ámbitos', () => {
      // Si alguna vez se volvieran a enumerar a mano, esta prueba detectaría la
      // divergencia: son la misma clasificación y deben coincidir siempre.
      for (const rol of UGEL_ROLES) {
        expect(getRoleScope(rol)).toBe('ugel');
      }
      for (const rol of INSTITUTION_ROLES) {
        expect(getRoleScope(rol)).toBe('institucion');
      }
      expect(UGEL_ROLES).toHaveLength(ALL_ROLE_CODES.filter((r) => isUgelRole(r)).length);
      expect(INSTITUTION_ROLES).toHaveLength(
        ALL_ROLE_CODES.filter((r) => isInstitutionRole(r)).length,
      );
    });

    it('los ejes de agrupación son independientes entre sí', () => {
      // READ_ONLY_ROLES agrupa por capacidad de mutar, no por ámbito: no debe
      // coincidir con ninguna de las listas de ámbito.
      expect(READ_ONLY_ROLES).not.toEqual(UGEL_ROLES);
      expect(READ_ONLY_ROLES).not.toEqual(INSTITUTION_ROLES);
      // MONITOR_CAMPO_ROLES agrupa por tarea y cruza ámbitos a propósito.
      expect(MONITOR_CAMPO_ROLES.some((r) => isUgelRole(r))).toBe(true);
      expect(MONITOR_CAMPO_ROLES.some((r) => isInstitutionRole(r))).toBe(true);
    });

    it.each([
      [RoleCode.DIRECTOR_UGEL],
      [RoleCode.JEFE_AREA],
      [RoleCode.JEFE_GESTION],
      [RoleCode.ESPECIALISTA],
    ])('%s pertenece a la UGEL', (rol) => {
      expect(isUgelRole(rol)).toBe(true);
      expect(isInstitutionRole(rol)).toBe(false);
    });

    it.each([
      [RoleCode.DIRECTOR_INSTITUCION],
      [RoleCode.COORDINADOR_PEDAGOGICO],
      [RoleCode.JEFE_TALLER],
      [RoleCode.DOCENTE],
    ])('%s pertenece a una institución educativa', (rol) => {
      expect(isInstitutionRole(rol)).toBe(true);
      expect(isUgelRole(rol)).toBe(false);
    });

    it('los monitores de campo cruzan los dos ámbitos, y eso es deliberado', () => {
      // Lo que los agrupa es la tarea —levantar la ficha en el aula—, no la
      // pertenencia organizativa. Si esta prueba empezara a fallar porque todos
      // caen en el mismo ámbito, habría que revisar si el conjunto sigue
      // haciendo falta o si `useScope` ya lo expresa.
      expect(isUgelRole(RoleCode.ESPECIALISTA)).toBe(true);
      expect(isInstitutionRole(RoleCode.COORDINADOR_PEDAGOGICO)).toBe(true);
      expect(isInstitutionRole(RoleCode.JEFE_TALLER)).toBe(true);

      expect(MONITOR_CAMPO_ROLES).toHaveLength(3);
    });

    it('ejecutar monitoreo no implica ser monitor de campo', () => {
      // El director de institución tiene monitoreo:execute pero supervisa; no
      // levanta la ficha en el aula.
      const director = computeEffectivePermissions(RoleCode.DIRECTOR_INSTITUCION, null, []);
      expect(director).toContain(Capability.MONITOREO_EXECUTE);
      expect(MONITOR_CAMPO_ROLES).not.toContain(RoleCode.DIRECTOR_INSTITUCION);
    });

    it('el ámbito NO se deduce de la capacidad', () => {
      // Este es el motivo por el que `useCan` no sustituye a `useScope`:
      // especialista y director de institución comparten monitoreo:execute
      // pero miran el sistema desde lados opuestos de la organización.
      const especialista = computeEffectivePermissions(RoleCode.ESPECIALISTA, null, []);
      const director = computeEffectivePermissions(RoleCode.DIRECTOR_INSTITUCION, null, []);

      expect(especialista).toContain(Capability.MONITOREO_EXECUTE);
      expect(director).toContain(Capability.MONITOREO_EXECUTE);

      expect(getRoleScope(RoleCode.ESPECIALISTA)).toBe('ugel');
      expect(getRoleScope(RoleCode.DIRECTOR_INSTITUCION)).toBe('institucion');
    });
  });
});
