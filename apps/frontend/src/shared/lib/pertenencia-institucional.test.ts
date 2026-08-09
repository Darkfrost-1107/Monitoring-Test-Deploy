import { describe, it, expect } from 'vitest';
import {
  esDeLaInstitucionDelUsuario,
  type PertenenciaDelUsuario,
  type RegistroConInstitucion,
} from './pertenencia-institucional';

/**
 * Pruebas de la pertenencia institucional.
 *
 * La regla vivía duplicada en `visibilidad.ts` y en `decision.ts`, y las dos
 * copias resolvían con un `||` que dejaba el nombre como segunda vía de acceso
 * en vez de respaldo. Con cinco instituciones homónimas en la base, eso mezclaba
 * sedes.
 */

const registro = (over: Partial<RegistroConInstitucion> = {}): RegistroConInstitucion => ({
  institucionId: 'ie-1',
  institucion: 'COORDINACION DE PRONOEI - UGEL LAMPA',
  ...over,
});

const usuario = (over: PertenenciaDelUsuario = {}): PertenenciaDelUsuario => ({ ...over });

describe('esDeLaInstitucionDelUsuario — con identificador', () => {
  it('reconoce su institución cuando el identificador coincide', () => {
    expect(esDeLaInstitucionDelUsuario(usuario({ institucion: 'ie-1' }), registro())).toBe(true);
  });

  it('rechaza otra institución cuando el identificador no coincide', () => {
    expect(esDeLaInstitucionDelUsuario(usuario({ institucion: 'ie-9' }), registro())).toBe(false);
  });

  /** El corazón del defecto: el nombre no puede rescatar un identificador que no coincide. */
  it('rechaza una homónima aunque el nombre sea idéntico', () => {
    const deOtraSede = usuario({
      institucion: 'ie-9',
      institucionNombre: 'COORDINACION DE PRONOEI - UGEL LAMPA',
    });
    expect(esDeLaInstitucionDelUsuario(deOtraSede, registro())).toBe(false);
  });
});

describe('esDeLaInstitucionDelUsuario — respaldo por nombre', () => {
  it('usa el nombre cuando el usuario no trae identificador', () => {
    const porNombre = usuario({ institucionNombre: 'COORDINACION DE PRONOEI - UGEL LAMPA' });
    expect(esDeLaInstitucionDelUsuario(porNombre, registro())).toBe(true);
  });

  it('compara el nombre sin distinguir mayúsculas', () => {
    const porNombre = usuario({ institucionNombre: 'coordinacion de pronoei - ugel lampa' });
    expect(esDeLaInstitucionDelUsuario(porNombre, registro())).toBe(true);
  });

  it('rechaza cuando el nombre difiere', () => {
    const porNombre = usuario({ institucionNombre: 'I.E. 1234' });
    expect(esDeLaInstitucionDelUsuario(porNombre, registro())).toBe(false);
  });

  it('sin identificador ni nombre no pertenece a ninguna institución', () => {
    expect(esDeLaInstitucionDelUsuario(usuario(), registro())).toBe(false);
  });
});
