import { describe, it, expect } from 'vitest';
import { aniosDeFiltro } from './anios-de-filtro';

/**
 * Pruebas de los años que ofrece el filtro.
 *
 * La lista salía sólo de las fichas cargadas, así que un año aparecía recién con
 * su primera ficha. El Análisis de Desempeño arranca en el año en curso, de modo
 * que sin garantizarlo el filtro podía abrirse en un año que no era una de sus
 * opciones.
 */

describe('aniosDeFiltro', () => {
  it('incluye el ano en curso aunque no tenga fichas', () => {
    expect(aniosDeFiltro([], 2027)).toEqual(['2027']);
  });

  it('no lo repite cuando ya tiene fichas', () => {
    expect(aniosDeFiltro(['2026'], 2026)).toEqual(['2026']);
  });

  it('conserva los anos anteriores', () => {
    expect(aniosDeFiltro(['2025', '2026'], 2027)).toEqual(['2027', '2026', '2025']);
  });

  /** El año en curso es el que se consulta: va primero. */
  it('ordena del mas reciente al mas antiguo', () => {
    expect(aniosDeFiltro(['2024', '2026', '2025'], 2026)).toEqual(['2026', '2025', '2024']);
  });

  it('no duplica los anos repetidos de las fichas', () => {
    expect(aniosDeFiltro(['2026', '2026', '2025'], 2026)).toEqual(['2026', '2025']);
  });

  /** Una ficha con fecha adelantada no rompe el orden ni desplaza al año en curso. */
  it('deja pasar un ano posterior al actual', () => {
    expect(aniosDeFiltro(['2028'], 2026)).toEqual(['2028', '2026']);
  });
});
