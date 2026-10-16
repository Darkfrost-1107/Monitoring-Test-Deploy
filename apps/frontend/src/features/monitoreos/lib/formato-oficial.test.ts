import { describe, it, expect } from 'vitest';
import { tieneFormatoOficial } from './formato-oficial';

/**
 * Qué fichas se imprimen con el formulario oficial que genera el backend. Hoy sólo
 * la docente: el directivo y la EIB tienen otros formularios, que todavía no se
 * han incorporado, y conservan la impresión anterior.
 */
describe('tieneFormatoOficial', () => {
  it('la ficha docente sí', () => {
    expect(tieneFormatoOficial('DOCENTE')).toBe(true);
  });

  it.each(['DIRECTIVO', 'DOCENTE_EIB'])('la ficha %s todavía no', (instrumento) => {
    expect(tieneFormatoOficial(instrumento)).toBe(false);
  });

  it('un instrumento desconocido o ausente no se imprime con el formulario docente', () => {
    expect(tieneFormatoOficial(undefined)).toBe(false);
    expect(tieneFormatoOficial('OTRO')).toBe(false);
  });
});
