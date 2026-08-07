import { describe, it, expect } from 'vitest';
import { LIMITE_LADO_EVIDENCIA, calcularDimensiones } from './imagen';

/**
 * Pruebas del redimensionado de evidencias.
 *
 * Fase 5 de PLAN_REMEDIACION.md. Vivía dentro de `compressImage`, en la
 * cabecera de un componente de 1.294 líneas. La aritmética decide el tamaño con
 * que se guarda cada fotografía de evidencia; el resto de la función es
 * manipulación del lienzo y no se puede probar sin navegador, pero esto sí.
 */

describe('calcularDimensiones', () => {
  it('no agranda una imagen que ya entra en el límite', () => {
    expect(calcularDimensiones(800, 600, 1024, 1024)).toEqual({ ancho: 800, alto: 600 });
  });

  it('deja intacta una imagen exactamente en el límite', () => {
    expect(calcularDimensiones(1024, 768, 1024, 1024)).toEqual({ ancho: 1024, alto: 768 });
  });

  it('reduce una imagen apaisada por su ancho', () => {
    expect(calcularDimensiones(2048, 1024, 1024, 1024)).toEqual({ ancho: 1024, alto: 512 });
  });

  it('reduce una imagen vertical por su alto', () => {
    expect(calcularDimensiones(1024, 2048, 1024, 1024)).toEqual({ ancho: 512, alto: 1024 });
  });

  it('conserva la proporción al reducir', () => {
    const { ancho, alto } = calcularDimensiones(3000, 2000, 1024, 1024);
    expect(ancho / alto).toBeCloseTo(3000 / 2000, 2);
  });

  it('redondea a píxeles enteros', () => {
    const { ancho, alto } = calcularDimensiones(1777, 1000, 1024, 1024);
    expect(Number.isInteger(ancho)).toBe(true);
    expect(Number.isInteger(alto)).toBe(true);
  });

  /**
   * Una imagen cuadrada no es más ancha que alta, de modo que entra por la rama
   * del alto. El resultado es el mismo, pero conviene dejarlo fijado.
   */
  it('reduce una imagen cuadrada por igual en ambos lados', () => {
    expect(calcularDimensiones(2048, 2048, 1024, 1024)).toEqual({ ancho: 1024, alto: 1024 });
  });

  it('respeta límites distintos para cada lado', () => {
    expect(calcularDimensiones(2000, 1000, 500, 800)).toEqual({ ancho: 500, alto: 250 });
  });
});

describe('LIMITE_LADO_EVIDENCIA', () => {
  it('declara el lado máximo de una evidencia', () => {
    expect(LIMITE_LADO_EVIDENCIA).toBe(1024);
  });
});
