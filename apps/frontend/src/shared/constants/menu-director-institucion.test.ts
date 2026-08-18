import { describe, it, expect } from 'vitest';
import { hasPermission } from './roles';

/**
 * Qué gestiona el Director de I.E. desde su menú.
 *
 * ── Por qué se fija con pruebas ──
 * El permiso `instituciones_jefes_taller` se perdió del director en el PR de
 * firmas (#70), que no tenía nada que ver con permisos: la entrada «Jefe de
 * Taller» desapareció de su barra sin que nadie lo decidiera. Como el acceso
 * vive en una lista de strings, un cambio en otro tema puede tumbarlo sin que la
 * compilación lo note. Estas pruebas lo hacen notar.
 *
 * El Coordinador Pedagógico y el Jefe de Taller son los dos cargos de una
 * institución, ambos sólo en Secundaria. El director gestiona a los dos.
 */
describe('menú del Director de I.E.', () => {
  it('gestiona a su Coordinador Pedagógico', () => {
    expect(hasPermission('director_institucion', 'instituciones_coordinadores')).toBe(true);
  });

  it('gestiona a su Jefe de Taller', () => {
    expect(hasPermission('director_institucion', 'instituciones_jefes_taller')).toBe(true);
  });

  it('gestiona a sus docentes', () => {
    expect(hasPermission('director_institucion', 'instituciones_docentes')).toBe(true);
  });

  /**
   * El nivel lo decide `sidebar.tsx` por `institucionNivel`, no el permiso: en
   * una I.E. que no es Secundaria estos dos cargos se ocultan aunque el permiso
   * esté. El permiso es la condición; el nivel, el filtro.
   */
  it('los dos cargos de institución van juntos: si uno está, el otro también', () => {
    const coord = hasPermission('director_institucion', 'instituciones_coordinadores');
    const jefe = hasPermission('director_institucion', 'instituciones_jefes_taller');

    expect(jefe).toBe(coord);
  });

  /** No gestiona especialistas ni jefes de área: eso es de la UGEL. */
  it('no alcanza la gestión de la UGEL', () => {
    expect(hasPermission('director_institucion', 'especialistas')).toBe(false);
    expect(hasPermission('director_institucion', 'jefes_area')).toBe(false);
  });
});
