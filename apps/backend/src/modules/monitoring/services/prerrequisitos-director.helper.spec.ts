import { RoleCode } from '../../../common/enums/role.enum.js';
import {
  motivoPrerrequisitosPendientes,
  prerrequisitosCumplidos,
  rolRequierePrerrequisitos,
} from './prerrequisitos-director.helper.js';

/**
 * El director de la I.E. sube primero; recién entonces el Coordinador Pedagógico
 * y el Jefe de Taller pueden actuar. Estas pruebas fijan la regla; la consulta de
 * los dos artefactos vive en el servicio.
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
  it('se cumplen sólo con el plan Y la plantilla', () => {
    expect(prerrequisitosCumplidos({ tienePlan: true, tienePlantilla: true })).toBe(true);
  });

  it('no se cumplen con uno solo', () => {
    expect(prerrequisitosCumplidos({ tienePlan: true, tienePlantilla: false })).toBe(false);
    expect(prerrequisitosCumplidos({ tienePlan: false, tienePlantilla: true })).toBe(false);
  });

  it('no se cumplen sin ninguno', () => {
    expect(prerrequisitosCumplidos({ tienePlan: false, tienePlantilla: false })).toBe(false);
  });
});

describe('motivoPrerrequisitosPendientes', () => {
  it('no da motivo cuando todo está listo', () => {
    expect(motivoPrerrequisitosPendientes({ tienePlan: true, tienePlantilla: true })).toBe('');
  });

  it('nombra el plan cuando falta', () => {
    const msg = motivoPrerrequisitosPendientes({ tienePlan: false, tienePlantilla: true });
    expect(msg).toContain('Plan de Monitoreo Anual');
    expect(msg).not.toContain('plantilla');
  });

  it('nombra la plantilla cuando falta', () => {
    const msg = motivoPrerrequisitosPendientes({ tienePlan: true, tienePlantilla: false });
    expect(msg).toContain('plantilla');
    expect(msg).not.toContain('Plan de Monitoreo Anual');
  });

  it('nombra los dos cuando faltan los dos', () => {
    const msg = motivoPrerrequisitosPendientes({ tienePlan: false, tienePlantilla: false });
    expect(msg).toContain('Plan de Monitoreo Anual');
    expect(msg).toContain('plantilla');
  });
});
