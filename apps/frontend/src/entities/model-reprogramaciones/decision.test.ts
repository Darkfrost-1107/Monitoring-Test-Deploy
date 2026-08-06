import { describe, it, expect } from 'vitest';
import { RoleCode, NivelEducativoEBR } from '@sistema-monitoreo/shared-contracts';
import {
  puedeDecidirReprogramacion,
  esSolicitudDeInstitucion,
  type UsuarioDecisor,
  type VisitaDecidible,
} from './decision';

/**
 * Pruebas de caracterización de la regla de decisión de reprogramaciones.
 *
 * Fijan el comportamiento que tenían las dos copias duplicadas
 * (`canDecide` en CalendarioSidebar y `canDecideRequest` en
 * BandejaReprogramaciones) antes de unificarlas, de modo que la extracción sea
 * verificablemente equivalente y no una reescritura de buena fe.
 */

const visita = (over: Partial<VisitaDecidible> = {}): VisitaDecidible => ({
  nivel: NivelEducativoEBR.SECUNDARIA,
  institucionId: 'ie-1',
  institucion: 'I.E. Ejemplo',
  ...over,
});

const usuario = (over: Partial<UsuarioDecisor> & { role: string }): UsuarioDecisor => ({ ...over });

describe('esSolicitudDeInstitucion', () => {
  it.each([[RoleCode.COORDINADOR_PEDAGOGICO], [RoleCode.JEFE_TALLER]])(
    'reconoce a %s como solicitante de la institución',
    (rol) => {
      expect(esSolicitudDeInstitucion(rol)).toBe(true);
    },
  );

  it.each([[RoleCode.ESPECIALISTA], [RoleCode.JEFE_AREA], [RoleCode.DIRECTOR_UGEL], [undefined]])(
    'no reconoce a %s como solicitante de la institución',
    (rol) => {
      expect(esSolicitudDeInstitucion(rol)).toBe(false);
    },
  );
});

describe('puedeDecidirReprogramacion', () => {
  describe('ausencia de datos', () => {
    it.each([
      ['sin usuario', null, visita()],
      ['sin visita', usuario({ role: RoleCode.JEFE_GESTION }), null],
      ['sin ninguno', null, null],
    ])('no decide %s', (_caso, u, v) => {
      expect(puedeDecidirReprogramacion(u, v, RoleCode.ESPECIALISTA)).toBe(false);
    });
  });

  describe('monitores de campo: solicitan, no deciden', () => {
    it.each([[RoleCode.ESPECIALISTA], [RoleCode.COORDINADOR_PEDAGOGICO], [RoleCode.JEFE_TALLER]])(
      '%s nunca decide',
      (rol) => {
        expect(
          puedeDecidirReprogramacion(usuario({ role: rol }), visita(), RoleCode.ESPECIALISTA),
        ).toBe(false);
      },
    );
  });

  describe('jefe de gestión: resuelve lo nacido en la UGEL', () => {
    const jefeGestion = usuario({ role: RoleCode.JEFE_GESTION });

    it('decide una solicitud de un especialista', () => {
      expect(puedeDecidirReprogramacion(jefeGestion, visita(), RoleCode.ESPECIALISTA)).toBe(true);
    });

    it.each([[RoleCode.COORDINADOR_PEDAGOGICO], [RoleCode.JEFE_TALLER]])(
      'no decide una solicitud nacida en la institución (%s)',
      (rol) => {
        expect(puedeDecidirReprogramacion(jefeGestion, visita(), rol)).toBe(false);
      },
    );

    it('no lo restringe el nivel de la visita', () => {
      expect(
        puedeDecidirReprogramacion(
          jefeGestion,
          visita({ nivel: NivelEducativoEBR.PRIMARIA }),
          RoleCode.ESPECIALISTA,
        ),
      ).toBe(true);
    });
  });

  describe('jefe de área: lo nacido en la UGEL, dentro de su nivel', () => {
    it('decide cuando el nivel de la visita coincide con el suyo', () => {
      const u = usuario({ role: RoleCode.JEFE_AREA, especialistaNivel: 'Secundaria' });
      expect(puedeDecidirReprogramacion(u, visita(), RoleCode.ESPECIALISTA)).toBe(true);
    });

    it('no decide cuando el nivel de la visita es otro', () => {
      const u = usuario({ role: RoleCode.JEFE_AREA, especialistaNivel: 'Primaria' });
      expect(puedeDecidirReprogramacion(u, visita(), RoleCode.ESPECIALISTA)).toBe(false);
    });

    it('sin nivel asignado no queda restringido', () => {
      const u = usuario({ role: RoleCode.JEFE_AREA });
      expect(puedeDecidirReprogramacion(u, visita(), RoleCode.ESPECIALISTA)).toBe(true);
    });

    it('no decide una solicitud nacida en la institución, aunque el nivel coincida', () => {
      const u = usuario({ role: RoleCode.JEFE_AREA, especialistaNivel: 'Secundaria' });
      expect(puedeDecidirReprogramacion(u, visita(), RoleCode.JEFE_TALLER)).toBe(false);
    });
  });

  describe('director de institución: lo suyo, sólo en Secundaria', () => {
    const director = usuario({ role: RoleCode.DIRECTOR_INSTITUCION, institucion: 'ie-1' });

    it('decide una solicitud de su colegio nacida en la institución', () => {
      expect(puedeDecidirReprogramacion(director, visita(), RoleCode.COORDINADOR_PEDAGOGICO)).toBe(
        true,
      );
    });

    it('no decide fuera de Secundaria', () => {
      expect(
        puedeDecidirReprogramacion(
          director,
          visita({ nivel: NivelEducativoEBR.PRIMARIA }),
          RoleCode.COORDINADOR_PEDAGOGICO,
        ),
      ).toBe(false);
    });

    it('no decide sobre otro colegio', () => {
      expect(
        puedeDecidirReprogramacion(
          director,
          visita({ institucionId: 'ie-9' }),
          RoleCode.COORDINADOR_PEDAGOGICO,
        ),
      ).toBe(false);
    });

    it('no decide una solicitud nacida en la UGEL, aunque sea de su colegio', () => {
      expect(puedeDecidirReprogramacion(director, visita(), RoleCode.ESPECIALISTA)).toBe(false);
    });

    it('identifica su colegio por nombre cuando no hay identificador', () => {
      const porNombre = usuario({
        role: RoleCode.DIRECTOR_INSTITUCION,
        institucionNombre: 'I.E. Ejemplo',
      });
      expect(puedeDecidirReprogramacion(porNombre, visita(), RoleCode.JEFE_TALLER)).toBe(true);
    });

    it('compara el nombre del colegio sin distinguir mayúsculas', () => {
      const porNombre = usuario({
        role: RoleCode.DIRECTOR_INSTITUCION,
        institucionNombre: 'i.e. EJEMPLO',
      });
      expect(puedeDecidirReprogramacion(porNombre, visita(), RoleCode.JEFE_TALLER)).toBe(true);
    });
  });

  describe('roles sin participación en la decisión', () => {
    it.each([[RoleCode.DIRECTOR_UGEL], [RoleCode.DOCENTE], [RoleCode.INVITADO], [RoleCode.SUPERUSUARIO]])(
      '%s no decide',
      (rol) => {
        expect(
          puedeDecidirReprogramacion(usuario({ role: rol }), visita(), RoleCode.ESPECIALISTA),
        ).toBe(false);
      },
    );
  });
});
