import { describe, it, expect } from 'vitest';
import { ESTADOS_VISITA } from '@sistema-monitoreo/shared-contracts';
import {
  claseBadgeEstado,
  claseEtiquetaVisita,
  clasePuntoEstado,
  formatearFechaLarga,
  formatearFechaVisita,
  formatearHoraVisita,
} from './visita-presentacion';

/**
 * Pruebas de los traductores de estado a presentación.
 *
 * Fase 5 de PLAN_REMEDIACION.md. Vivían sueltos en la cabecera de
 * `CalendarioSidebar`. `formatearFechaVisita` tiene tres caminos de salida y
 * ninguno estaba cubierto, siendo la fecha que el evaluador usa para saber si
 * hoy le toca la visita.
 */

describe('formatearFechaVisita', () => {
  it('formatea una fecha ISO al formato peruano', () => {
    expect(formatearFechaVisita('2026-03-09T14:30:00.000Z')).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  /**
   * CAMBIO DE COMPORTAMIENTO, deliberado. Estas tres pruebas fijaban el
   * repliegue silencioso: ante una fecha ilegible la función devolvía la cadena
   * original —o un trozo de ella— y el usuario veía un dato incorrecto sin
   * ninguna señal. Al consolidar en `shared/lib/fecha`, una fecha que no se
   * puede interpretar se informa como tal.
   */
  it('avisa cuando el valor no es una fecha, en lugar de devolver un trozo', () => {
    expect(formatearFechaVisita('no-es-fecha T sobrante')).toBe('Fecha inválida');
    expect(formatearFechaVisita('cualquier-cosa')).toBe('Fecha inválida');
    expect(formatearFechaVisita('')).toBe('Fecha inválida');
  });
});

describe('claseBadgeEstado', () => {
  it.each([
    ['PROGRAMADO', 'blue'],
    ['EN_PROCESO', 'rose'],
    ['COMPLETADO', 'emerald'],
    ['REPROGRAMADO', 'amber'],
    ['CANCELADO', 'slate'],
  ] as const)('usa la paleta %s → %s', (estado, paleta) => {
    expect(claseBadgeEstado(estado)).toContain(paleta);
  });

  it('declara una paleta para ANULADO, que antes caía a la neutra', () => {
    expect(claseBadgeEstado('ANULADO')).toBe('bg-slate-100 text-slate-700');
  });

  /**
   * La tabla se tipa contra `EstadoVisita`. Esta prueba comprueba en ejecución
   * lo que el compilador ya exige: que no falte ninguno. Si el contrato suma un
   * estado, falla acá además de romper la compilación.
   */
  it('cubre todos los estados del contrato', () => {
    for (const estado of ESTADOS_VISITA) {
      expect(claseBadgeEstado(estado)).toBeTruthy();
    }
  });
});

describe('clasePuntoEstado', () => {
  it.each([
    ['PROGRAMADO', 'bg-blue-500'],
    ['EN_PROCESO', 'bg-rose-500'],
    ['COMPLETADO', 'bg-emerald-500'],
    ['REPROGRAMADO', 'bg-amber-500'],
    ['CANCELADO', 'bg-slate-400'],
  ] as const)('asigna a %s el punto %s', (estado, esperado) => {
    expect(clasePuntoEstado(estado)).toBe(esperado);
  });

  it('declara un punto para ANULADO, que antes caía al neutro', () => {
    expect(clasePuntoEstado('ANULADO')).toBe('bg-slate-400');
  });

  it('cubre todos los estados del contrato', () => {
    for (const estado of ESTADOS_VISITA) {
      expect(clasePuntoEstado(estado)).toBeTruthy();
    }
  });
});

describe('formatearHoraVisita', () => {
  it('convierte la hora ISO a formato de 12 horas', () => {
    expect(formatearHoraVisita('2026-03-09T14:30:00')).toBe('2:30 PM');
  });

  it('muestra la medianoche como 12 AM, no como 0', () => {
    expect(formatearHoraVisita('2026-03-09T00:15:00')).toBe('12:15 AM');
  });

  it('muestra el mediodía como 12 PM, no como 0', () => {
    expect(formatearHoraVisita('2026-03-09T12:00:00')).toBe('12:00 PM');
  });

  it('trata las once de la mañana como AM y las once de la noche como PM', () => {
    expect(formatearHoraVisita('2026-03-09T11:59:00')).toBe('11:59 AM');
    expect(formatearHoraVisita('2026-03-09T23:59:00')).toBe('11:59 PM');
  });

  it('avisa cuando no hay hora que leer, en lugar de devolver el valor crudo', () => {
    expect(formatearHoraVisita('no-es-fecha')).toBe('Fecha inválida');
  });
});

describe('formatearFechaLarga', () => {
  it('escribe la fecha en palabras con el día de la semana', () => {
    const resultado = formatearFechaLarga('2026-03-09T14:30:00');

    expect(resultado).toContain('9');
    expect(resultado).toContain('marzo');
    expect(resultado).toContain('2026');
  });

  it('empieza en mayúscula', () => {
    const resultado = formatearFechaLarga('2026-03-09');
    expect(resultado[0]).toBe(resultado[0].toUpperCase());
  });

  it('interpreta la fecha en horario local, sin desplazarla por zona horaria', () => {
    // Con interpretación UTC, un 1 de mes retrocedería al mes anterior.
    expect(formatearFechaLarga('2026-03-01')).toContain('marzo');
  });

  it('avisa cuando no es una fecha, en lugar de devolver el valor crudo', () => {
    expect(formatearFechaLarga('cualquier-cosa')).toBe('Fecha inválida');
  });
});

describe('claseEtiquetaVisita', () => {
  it.each([
    ['PROGRAMADO', 'blue'],
    ['EN_PROCESO', 'rose'],
    ['COMPLETADO', 'emerald'],
    ['REPROGRAMADO', 'amber'],
  ] as const)('usa la paleta %s → %s', (estado, paleta) => {
    expect(claseEtiquetaVisita(estado)).toContain(paleta);
  });

  it('declara una etiqueta para ANULADO, sin hover: no es pulsable', () => {
    expect(claseEtiquetaVisita('ANULADO')).toContain('slate');
    expect(claseEtiquetaVisita('ANULADO')).not.toContain('hover');
  });

  it('cubre todos los estados del contrato', () => {
    for (const estado of ESTADOS_VISITA) {
      expect(claseEtiquetaVisita(estado)).toBeTruthy();
    }
  });
});
