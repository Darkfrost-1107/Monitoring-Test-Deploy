import { describe, it, expect } from 'vitest';
import { lemaDelAnio, LEMAS_OFICIALES } from './lema-del-anio';

/**
 * El lema oficial que encabeza todo documento del Estado peruano. Estaba
 * escrito a mano dentro de `FichaPrintable`, fijo en el de 2025.
 */

describe('lemaDelAnio', () => {
  it('devuelve el lema declarado para el año', () => {
    expect(lemaDelAnio(2025)).toBe(LEMAS_OFICIALES[2025]);
  });

  /**
   * El lema lo fija un decreto supremo cada año. Repetir el del año anterior
   * en un documento oficial es afirmar algo falso; se prefiere no encabezarlo
   * hasta que alguien cargue el vigente.
   */
  it('devuelve nulo para un año sin lema declarado, en vez del anterior', () => {
    expect(lemaDelAnio(2099)).toBeNull();
  });

  it('devuelve nulo sin año', () => {
    expect(lemaDelAnio(undefined)).toBeNull();
    expect(lemaDelAnio(null)).toBeNull();
  });

  it('acepta el año como texto, que es como llega de la plantilla', () => {
    expect(lemaDelAnio('2025')).toBe(LEMAS_OFICIALES[2025]);
  });

  it('devuelve nulo ante un año que no es un número', () => {
    expect(lemaDelAnio('sin año')).toBeNull();
  });
});
