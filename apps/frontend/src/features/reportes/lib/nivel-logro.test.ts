import { describe, it, expect } from 'vitest';
import { nivelLogroARomano, nivelNumericoARomano } from './nivel-logro';

/**
 * Pruebas de la presentación del nivel de logro.
 *
 * Fase 7 de PLAN_REMEDIACION.md. La tabla de equivalencias estaba escrita dos
 * veces en `ReportesGrid`, en ambos casos con el mismo respaldo `|| 'III'`.
 */

describe('nivelLogroARomano', () => {
  it('traduce los cuatro niveles', () => {
    expect(nivelLogroARomano('INICIO')).toBe('I');
    expect(nivelLogroARomano('EN_PROCESO')).toBe('II');
    expect(nivelLogroARomano('LOGRO_ESPERADO')).toBe('III');
    expect(nivelLogroARomano('LOGRO_DESTACADO')).toBe('IV');
  });

  /**
   * Antes devolvía `'III'` ante cualquier valor desconocido o ausente: una
   * ficha sin calificar se mostraba como logro esperado.
   */
  it('devuelve null ante un valor desconocido, sin suponer logro esperado', () => {
    expect(nivelLogroARomano('CUALQUIER_COSA')).toBeNull();
    expect(nivelLogroARomano('')).toBeNull();
    expect(nivelLogroARomano(null)).toBeNull();
    expect(nivelLogroARomano(undefined)).toBeNull();
  });
});

describe('nivelNumericoARomano', () => {
  it('devuelve nulo cuando no hay nivel registrado', () => {
    expect(nivelNumericoARomano(undefined)).toBeNull();
    expect(nivelNumericoARomano(null)).toBeNull();
  });

  it('traduce del 1 al 4', () => {
    expect(nivelNumericoARomano(1)).toBe('I');
    expect(nivelNumericoARomano(2)).toBe('II');
    expect(nivelNumericoARomano(3)).toBe('III');
    expect(nivelNumericoARomano(4)).toBe('IV');
  });

  /** Antes devolvía `'I'`: un valor inesperado parecía una calificación real. */
  it('devuelve null fuera de rango', () => {
    expect(nivelNumericoARomano(0)).toBeNull();
    expect(nivelNumericoARomano(5)).toBeNull();
    expect(nivelNumericoARomano(-1)).toBeNull();
  });
});
