import { describe, it, expect } from 'vitest';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';
import { esDirectorDeLaVisita, rolDeFirma } from './rol-de-firma';

/**
 * Pruebas del rol con el que se ofrece firmar.
 *
 * Quién firma lo decide el servidor; esto es presentación. Repiten su misma
 * precedencia a propósito: si divergiera, la pantalla ofrecería firmar algo que
 * el servidor después rechaza.
 */

const director = { role: RoleCode.DIRECTOR_INSTITUCION, institucion: 'ie-1' };

describe('esDirectorDeLaVisita', () => {
  it('reconoce al director en una visita de su institucion', () => {
    expect(esDirectorDeLaVisita(director, { institucionId: 'ie-1' })).toBe(true);
  });

  /** Sin este control, un director firmaria fichas de cualquier otra I.E. */
  it('no lo reconoce en una visita de otra institucion', () => {
    expect(esDirectorDeLaVisita(director, { institucionId: 'ie-2' })).toBe(false);
  });

  it('no reconoce a otros roles de la misma institucion', () => {
    const coordinador = { role: RoleCode.COORDINADOR_PEDAGOGICO, institucion: 'ie-1' };

    expect(esDirectorDeLaVisita(coordinador, { institucionId: 'ie-1' })).toBe(false);
  });

  it('no lo reconoce si falta el dato de una de las dos partes', () => {
    expect(esDirectorDeLaVisita({ role: RoleCode.DIRECTOR_INSTITUCION }, { institucionId: 'ie-1' })).toBe(
      false,
    );
    expect(esDirectorDeLaVisita(director, {})).toBe(false);
  });

  it('tolera que no haya usuario ni visita', () => {
    expect(esDirectorDeLaVisita(null, { institucionId: 'ie-1' })).toBe(false);
    expect(esDirectorDeLaVisita(director, null)).toBe(false);
  });
});

describe('rolDeFirma', () => {
  it('el evaluado firma como evaluado', () => {
    expect(rolDeFirma({ esEvaluado: true, esEvaluador: false, esDirectorDeLaIE: false })).toBe(
      'EVALUADO',
    );
  });

  it('el monitor firma como evaluador', () => {
    expect(rolDeFirma({ esEvaluado: false, esEvaluador: true, esDirectorDeLaIE: false })).toBe(
      'EVALUADOR',
    );
  });

  it('el director firma como director', () => {
    expect(rolDeFirma({ esEvaluado: false, esEvaluador: false, esDirectorDeLaIE: true })).toBe(
      'DIRECTOR',
    );
  });

  /**
   * Un director puede monitorear a los docentes de su propia institucion: el
   * cargo trae `monitoreo:execute`. Ahi firma como evaluador, no dos veces.
   */
  it('ser parte de la visita gana sobre el visto bueno', () => {
    expect(rolDeFirma({ esEvaluado: false, esEvaluador: true, esDirectorDeLaIE: true })).toBe(
      'EVALUADOR',
    );
    expect(rolDeFirma({ esEvaluado: true, esEvaluador: false, esDirectorDeLaIE: true })).toBe(
      'EVALUADO',
    );
  });

  it('quien no es ninguna de las tres cosas no firma', () => {
    expect(rolDeFirma({ esEvaluado: false, esEvaluador: false, esDirectorDeLaIE: false })).toBeNull();
  });
});
