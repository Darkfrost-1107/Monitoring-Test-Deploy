import { describe, it, expect } from 'vitest';
import { SIN_DATO, medirVisita } from './medicion-visita';

/**
 * Pruebas de la presentación de la calificación en el listado de reportes.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Estaba escrito dos veces en `ReportesGrid` y
 * en ambas se apoyaba en `getFichaState`, que devolvía datos inventados.
 */

describe('medirVisita — visita calificada', () => {
  it('escribe el promedio con dos decimales y el puntaje', () => {
    const medicion = medirVisita({
      nivelLogro: 'LOGRO_ESPERADO',
      promedio: 3.2,
      puntajeTotal: 16,
    });

    expect(medicion.calificada).toBe(true);
    expect(medicion.calificacion).toBe('Promedio 3.20 (16 pts)');
    expect(medicion.calificacionCorta).toBe('Prom. 3.20');
    expect(medicion.nivelRomano).toBe('III');
  });

  it('calcula el avance sobre el máximo del baremo', () => {
    expect(medirVisita({ nivelLogro: 'LOGRO_DESTACADO', promedio: 4 }).porcentaje).toBe(100);
    expect(medirVisita({ nivelLogro: 'EN_PROCESO', promedio: 2 }).porcentaje).toBe(50);
  });

  it('no deja que el avance se salga de la barra', () => {
    expect(medirVisita({ nivelLogro: 'LOGRO_DESTACADO', promedio: 9 }).porcentaje).toBe(100);
    expect(medirVisita({ nivelLogro: 'INICIO', promedio: -1 }).porcentaje).toBe(0);
  });

  it('muestra cero puntos cuando el puntaje no viene', () => {
    expect(medirVisita({ nivelLogro: 'INICIO', promedio: 1 }).calificacion).toBe(
      'Promedio 1.00 (0 pts)',
    );
  });
});

describe('medirVisita — visita sin calificar', () => {
  /**
   * Antes esta visita mostraba «33 / 35 aspectos», una barra al 80 % y
   * «Nivel III», todo salido del relleno inventado de `getFichaState`.
   */
  it('sin nivel de logro no informa calificación ni nivel', () => {
    const medicion = medirVisita({ nivelLogro: undefined, promedio: undefined });

    expect(medicion.calificada).toBe(false);
    expect(medicion.calificacion).toBe(SIN_DATO);
    expect(medicion.calificacionCorta).toBe(SIN_DATO);
    expect(medicion.porcentaje).toBe(0);
    expect(medicion.nivelRomano).toBeNull();
  });

  it('un nivel desconocido tampoco se muestra como logro esperado', () => {
    expect(medirVisita({ nivelLogro: 'CUALQUIER_COSA', promedio: 3 }).nivelRomano).toBeNull();
  });

  it('con nivel pero sin promedio no inventa el puntaje', () => {
    const medicion = medirVisita({ nivelLogro: 'LOGRO_ESPERADO', promedio: undefined });

    expect(medicion.calificada).toBe(false);
    expect(medicion.calificacion).toBe(SIN_DATO);
  });
});
