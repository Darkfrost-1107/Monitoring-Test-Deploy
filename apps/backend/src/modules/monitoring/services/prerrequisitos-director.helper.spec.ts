import { RoleCode } from '../../../common/enums/role.enum.js';
import {
  motivoPrerrequisitosPendientes,
  prerrequisitosCumplidos,
  rolRequierePrerrequisitos,
} from './prerrequisitos-director.helper.js';

/**
 * El director de la I.E. sube su plan primero; recién entonces el Coordinador
 * Pedagógico y el Jefe de Taller pueden actuar. Estas pruebas fijan la regla; la
 * consulta del artefacto vive en el servicio.
 */

describe('rolRequierePrerrequisitos', () => {
  it('sujeta al Coordinador Pedagogico y al Jefe de Taller', () => {
    expect(rolRequierePrerrequisitos(RoleCode.COORDINADOR_PEDAGOGICO)).toBe(true);
    expect(rolRequierePrerrequisitos(RoleCode.JEFE_TALLER)).toBe(true);
  });

  /** El director es quien cumple la regla, no quien la espera. */
  it('no sujeta al Director de I.E.', () => {
    expect(rolRequierePrerrequisitos(RoleCode.DIRECTOR_INSTITUCION)).toBe(false);
  });

  it('no sujeta a los roles de la UGEL', () => {
    expect(rolRequierePrerrequisitos(RoleCode.JEFE_GESTION)).toBe(false);
    expect(rolRequierePrerrequisitos(RoleCode.JEFE_AREA)).toBe(false);
  });
});

describe('prerrequisitosCumplidos', () => {
  it('se cumplen con el plan del director', () => {
    expect(prerrequisitosCumplidos({ tienePlan: true })).toBe(true);
  });

  it('no se cumplen sin el plan', () => {
    expect(prerrequisitosCumplidos({ tienePlan: false })).toBe(false);
  });
});

describe('motivoPrerrequisitosPendientes', () => {
  it('no da motivo cuando el plan está listo', () => {
    expect(motivoPrerrequisitosPendientes({ tienePlan: true })).toBe('');
  });

  it('nombra el plan cuando falta', () => {
    expect(motivoPrerrequisitosPendientes({ tienePlan: false })).toContain(
      'Plan de Monitoreo Anual',
    );
  });

  /**
   * La plantilla del director dejó de ser un requisito: hoy puede no crear
   * ninguna en todo el año, porque las fichas obligatorias son las de la UGEL y
   * una propia sólo nace de una solicitud aprobada. Nombrarla mandaba al
   * coordinador a pedir algo que nadie tiene que entregar.
   */
  it('no menciona la plantilla del director', () => {
    expect(motivoPrerrequisitosPendientes({ tienePlan: false })).not.toContain('plantilla');
  });
});
