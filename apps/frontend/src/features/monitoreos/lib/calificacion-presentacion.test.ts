import { describe, it, expect } from 'vitest';
import { resolverCalificacion } from './calificacion-presentacion';

/**
 * Pruebas de la calificación consolidada que se muestra al cerrar la ficha.
 *
 * Fase 5 de PLAN_REMEDIACION.md. El cálculo en sí es del contrato compartido y
 * lo aplica también el backend al persistir; lo que se prueba acá es la capa de
 * presentación: cuántos puntos son el máximo, qué etiqueta lleva el nivel y con
 * qué color se pinta.
 *
 * Antecedente H-28: esta pantalla tuvo su propia tabla de niveles, que coincidía
 * con el backend sólo para plantillas de cinco desempeños. El evaluador podía
 * ver un nivel de logro y guardarse otro.
 */

const conNiveles = (romanos: string[]) =>
  resolverCalificacion(
    romanos.map((romano, idx) => ({ id: `d${idx}`, romano })),
  );

describe('resolverCalificacion — puntaje máximo', () => {
  it('son cuatro puntos por desempeño', () => {
    expect(conNiveles(['I', 'I', 'I']).puntajeMax).toBe(12);
    expect(conNiveles(['I', 'I', 'I', 'I', 'I']).puntajeMax).toBe(20);
  });

  /**
   * El máximo se calcula sobre los desempeños de la plantilla, no sobre los
   * calificados. Un desempeño sin calificar baja el porcentaje, no el techo.
   */
  it('cuenta los desempeños sin calificar en el máximo', () => {
    expect(conNiveles(['IV', '', '']).puntajeMax).toBe(12);
  });
});

describe('resolverCalificacion — puntaje obtenido', () => {
  it('suma los niveles calificados', () => {
    expect(conNiveles(['IV', 'III', 'II']).puntajeTotal).toBe(9);
  });

  it('ignora los desempeños sin calificar', () => {
    expect(conNiveles(['IV', '', 'II']).puntajeTotal).toBe(6);
  });

  it('es cero sin nada calificado', () => {
    expect(conNiveles(['', '', '']).puntajeTotal).toBe(0);
  });
});

describe('resolverCalificacion — presentación del nivel', () => {
  it('trae una etiqueta legible del nivel alcanzado', () => {
    expect(conNiveles(['IV', 'IV', 'IV']).nivel).toBeTruthy();
    expect(typeof conNiveles(['IV', 'IV', 'IV']).nivel).toBe('string');
  });

  it('trae color de texto y de fondo para el nivel', () => {
    const calificacion = conNiveles(['IV', 'IV', 'IV']);
    expect(calificacion.nivelColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(calificacion.nivelBg).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('distingue el mejor desempeño del peor con colores distintos', () => {
    expect(conNiveles(['IV', 'IV', 'IV']).nivelColor).not.toBe(
      conNiveles(['I', 'I', 'I']).nivelColor,
    );
  });

  it('sube de nivel al mejorar las calificaciones', () => {
    const bajo = conNiveles(['I', 'I', 'I']);
    const alto = conNiveles(['IV', 'IV', 'IV']);

    expect(alto.porcentaje).toBeGreaterThan(bajo.porcentaje);
    expect(alto.nivel).not.toBe(bajo.nivel);
  });
});

describe('resolverCalificacion — plantilla vacía', () => {
  /**
   * Una plantilla sin desempeños no debería existir, pero si llega no puede
   * hacer explotar la pantalla de una ficha ya cerrada.
   */
  it('no falla sin desempeños', () => {
    const calificacion = resolverCalificacion([]);
    expect(calificacion.puntajeMax).toBe(0);
    expect(calificacion.puntajeTotal).toBe(0);
  });
});
