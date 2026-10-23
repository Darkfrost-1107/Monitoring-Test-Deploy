import { describe, it, expect } from 'vitest';
import { tieneFormatoOficial } from './formato-oficial';

/**
 * Qué fichas se imprimen con el formulario oficial que genera el backend. Hoy la
 * docente y la directiva; la EIB tiene otro formulario, que todavía no se incorpora, y
 * conserva la impresión anterior.
 */
describe('tieneFormatoOficial', () => {
  it.each(['DOCENTE', 'DIRECTIVO'])('la ficha %s sí', (instrumento) => {
    expect(tieneFormatoOficial(instrumento)).toBe(true);
  });

  it('la ficha EIB todavía no', () => {
    expect(tieneFormatoOficial('DOCENTE_EIB')).toBe(false);
  });

  it('un instrumento desconocido o ausente no se imprime con un formulario que no es suyo', () => {
    expect(tieneFormatoOficial(undefined)).toBe(false);
    expect(tieneFormatoOficial('OTRO')).toBe(false);
  });
});
