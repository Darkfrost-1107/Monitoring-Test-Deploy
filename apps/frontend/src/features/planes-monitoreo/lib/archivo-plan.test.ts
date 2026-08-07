import { describe, it, expect } from 'vitest';
import { TAMANO_MAXIMO, motivoDeRechazo, pesoEnMegas } from './archivo-plan';

/**
 * Pruebas de la validación del PDF del plan de monitoreo.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Estaba dentro del manejador `onChange` del
 * campo de archivo.
 */

const archivo = (over: Partial<{ type: string; size: number }> = {}) => ({
  type: 'application/pdf',
  size: 1024,
  ...over,
});

describe('motivoDeRechazo', () => {
  it('acepta un PDF dentro del límite', () => {
    expect(motivoDeRechazo(archivo())).toBeNull();
  });

  it('acepta un archivo justo en el límite', () => {
    expect(motivoDeRechazo(archivo({ size: TAMANO_MAXIMO }))).toBeNull();
  });

  it('rechaza lo que no es PDF', () => {
    expect(motivoDeRechazo(archivo({ type: 'image/png' }))).toBe(
      'El archivo debe ser en formato PDF.',
    );
  });

  it('rechaza el que se pasa del límite', () => {
    expect(motivoDeRechazo(archivo({ size: TAMANO_MAXIMO + 1 }))).toBe(
      'El archivo no debe exceder los 10MB.',
    );
  });

  /** El formato se informa primero: es el problema más concreto de los dos. */
  it('informa el formato antes que el peso cuando fallan los dos', () => {
    expect(motivoDeRechazo(archivo({ type: 'image/png', size: TAMANO_MAXIMO + 1 }))).toBe(
      'El archivo debe ser en formato PDF.',
    );
  });
});

describe('pesoEnMegas', () => {
  it('convierte bytes a megabytes con dos decimales', () => {
    expect(pesoEnMegas(1024 * 1024)).toBe('1.00');
    expect(pesoEnMegas(1024 * 1024 * 2.5)).toBe('2.50');
  });
});
