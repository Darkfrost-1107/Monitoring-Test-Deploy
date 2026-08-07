import { describe, it, expect } from 'vitest';
import { ESCALAS_MAGISTERIALES, escalaARomano, escalaANumero } from './escala';

/**
 * La escala magisterial va y viene entre el número que guarda la base y el
 * romano que se muestra. La conversión estaba escrita tres veces —dos en
 * `docente-service.ts` y una en `DocenteAssignPage`— y las tres degradaban en
 * silencio a la escala más baja ante un valor que no reconocían.
 */

describe('ESCALAS_MAGISTERIALES', () => {
  it('son las ocho de la Ley de Reforma Magisterial', () => {
    expect(ESCALAS_MAGISTERIALES).toEqual(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']);
  });
});

describe('escalaARomano', () => {
  it('convierte cada número a su romano', () => {
    expect(escalaARomano(1)).toBe('I');
    expect(escalaARomano(5)).toBe('V');
    expect(escalaARomano(8)).toBe('VIII');
  });

  /**
   * Hoy los 869 docentes de la base tienen `escala_magisterial` nula. La
   * versión anterior devolvía 'I' en ese caso: un docente sin escala declarada
   * aparecía en pantalla como escala I, y al asignarle un cargo ese 'I' se
   * escribía de vuelta como 1. La ausencia no es la escala más baja.
   */
  it('devuelve nulo cuando no hay escala declarada', () => {
    expect(escalaARomano(null)).toBeNull();
    expect(escalaARomano(undefined)).toBeNull();
  });

  it('devuelve nulo ante un número fuera de la escala', () => {
    expect(escalaARomano(0)).toBeNull();
    expect(escalaARomano(9)).toBeNull();
    expect(escalaARomano(-1)).toBeNull();
    expect(escalaARomano(2.5)).toBeNull();
  });
});

describe('escalaANumero', () => {
  it('convierte cada romano a su número', () => {
    expect(escalaANumero('I')).toBe(1);
    expect(escalaANumero('V')).toBe(5);
    expect(escalaANumero('VIII')).toBe(8);
  });

  it('devuelve nulo cuando no hay escala declarada', () => {
    expect(escalaANumero(null)).toBeNull();
    expect(escalaANumero(undefined)).toBeNull();
    expect(escalaANumero('')).toBeNull();
  });

  it('devuelve nulo ante un romano que no es una escala', () => {
    expect(escalaANumero('IX')).toBeNull();
    expect(escalaANumero('X')).toBeNull();
  });

  it('es la inversa exacta de escalaARomano', () => {
    for (const [indice, romano] of ESCALAS_MAGISTERIALES.entries()) {
      expect(escalaANumero(romano)).toBe(indice + 1);
      expect(escalaARomano(indice + 1)).toBe(romano);
    }
  });
});
