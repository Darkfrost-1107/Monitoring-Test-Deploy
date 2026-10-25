import { describe, it, expect } from 'vitest';
import { tieneFormatoOficial } from './formato-oficial';

/**
 * Qué fichas se imprimen con el formulario oficial que genera el backend. Docente,
 * directiva y EIB.
 */
describe('tieneFormatoOficial', () => {
  it.each(['DOCENTE', 'DIRECTIVO', 'DOCENTE_EIB'])('la ficha %s sí', (instrumento) => {
    expect(tieneFormatoOficial(instrumento)).toBe(true);
  });

  it('un instrumento desconocido o ausente no se imprime con un formulario que no es suyo', () => {
    expect(tieneFormatoOficial(undefined)).toBe(false);
    expect(tieneFormatoOficial('OTRO')).toBe(false);
  });
});
