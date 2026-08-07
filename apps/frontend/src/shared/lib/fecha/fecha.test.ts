import { describe, it, expect } from 'vitest';
import {
  aFechaLocal,
  formatearFechaConMes,
  esFechaValida,
  formatearFechaCorta,
  formatearFechaHora,
  partesDeFechaHora,
} from './fecha';

/**
 * Pruebas del manejo de fechas.
 *
 * Fase 6 de PLAN_REMEDIACION.md, H-17. El proyecto formateaba fechas
 * segmentando cadenas a mano en treinta archivos, con `try/catch` que devolvían
 * un valor cualquiera cuando el análisis fallaba.
 *
 * ── El defecto que esto corrige ──
 * `new Date('2026-03-09')` interpreta la forma corta como medianoche UTC. En
 * Perú (UTC-5) eso es el 8 de marzo a las 19:00, de modo que la fecha se
 * muestra un día antes. Es el error de zona horaria clásico y aparecía en cada
 * lugar que pasaba una fecha «pelada» al constructor.
 *
 * Las pruebas fijan el huso de Lima porque es donde corre el sistema.
 */

describe('aFechaLocal', () => {
  /**
   * Éste es el caso que estaba mal: una fecha sin hora debe leerse como ese día
   * en el calendario local, no como un instante UTC.
   */
  it('interpreta una fecha sin hora como día local, no como UTC', () => {
    const fecha = aFechaLocal('2026-03-09');

    expect(fecha?.getFullYear()).toBe(2026);
    expect(fecha?.getMonth()).toBe(2);
    expect(fecha?.getDate()).toBe(9);
  });

  it('no se corre de día en el primero del mes', () => {
    expect(aFechaLocal('2026-03-01')?.getDate()).toBe(1);
    expect(aFechaLocal('2026-03-01')?.getMonth()).toBe(2);
  });

  it('no se corre de año en el primero de enero', () => {
    expect(aFechaLocal('2026-01-01')?.getFullYear()).toBe(2026);
  });

  it('conserva la hora cuando la cadena la trae', () => {
    const fecha = aFechaLocal('2026-03-09T14:30');

    expect(fecha?.getHours()).toBe(14);
    expect(fecha?.getMinutes()).toBe(30);
  });

  it('devuelve null ante un valor que no es fecha', () => {
    expect(aFechaLocal('cualquier-cosa')).toBeNull();
    expect(aFechaLocal('')).toBeNull();
    expect(aFechaLocal(null)).toBeNull();
    expect(aFechaLocal(undefined)).toBeNull();
  });

  it('devuelve null ante una fecha imposible', () => {
    expect(aFechaLocal('2026-02-31')).toBeNull();
    expect(aFechaLocal('2026-13-01')).toBeNull();
  });
});

describe('esFechaValida', () => {
  it('reconoce una fecha interpretable', () => {
    expect(esFechaValida('2026-03-09')).toBe(true);
    expect(esFechaValida('2026-03-09T14:30:00')).toBe(true);
  });

  it('rechaza lo que no lo es', () => {
    expect(esFechaValida('cualquier-cosa')).toBe(false);
    expect(esFechaValida(undefined)).toBe(false);
  });
});

describe('partesDeFechaHora', () => {
  it('separa día y hora de una cadena ISO', () => {
    expect(partesDeFechaHora('2026-03-09T14:30:00')).toEqual({
      dia: '2026-03-09',
      hora: '14:30',
    });
  });

  it('recorta los segundos, que el formulario no edita', () => {
    expect(partesDeFechaHora('2026-03-09T14:30:45').hora).toBe('14:30');
  });

  it('devuelve la hora vacía cuando la cadena no la trae', () => {
    expect(partesDeFechaHora('2026-03-09')).toEqual({ dia: '2026-03-09', hora: '' });
  });
});

describe('formatearFechaCorta', () => {
  it('escribe la fecha en formato peruano', () => {
    expect(formatearFechaCorta('2026-03-09')).toBe('09/03/2026');
  });

  /** La prueba que falla con el defecto original: mostraría 08/03/2026. */
  it('no adelanta ni atrasa el día', () => {
    expect(formatearFechaCorta('2026-03-01')).toBe('01/03/2026');
    expect(formatearFechaCorta('2026-01-01')).toBe('01/01/2026');
  });

  /**
   * Sin repliegue silencioso: una fecha ilegible se muestra como tal. Antes se
   * devolvía la cadena original —o peor, un valor inventado— y el usuario no
   * tenía forma de saber que estaba viendo algo incorrecto.
   */
  it('avisa cuando la fecha no se puede interpretar', () => {
    expect(formatearFechaCorta('cualquier-cosa')).toBe('Fecha inválida');
    expect(formatearFechaCorta(null)).toBe('Fecha inválida');
  });

  it('admite un texto propio para el caso inválido', () => {
    expect(formatearFechaCorta(null, '—')).toBe('—');
  });
});

describe('formatearFechaHora', () => {
  it('escribe día y hora en formato de 12 horas', () => {
    expect(formatearFechaHora('2026-03-09T14:30:00')).toBe('09/03/2026, 2:30 PM');
  });

  it('muestra la medianoche como 12 AM', () => {
    expect(formatearFechaHora('2026-03-09T00:15:00')).toBe('09/03/2026, 12:15 AM');
  });

  it('muestra el mediodía como 12 PM', () => {
    expect(formatearFechaHora('2026-03-09T12:00:00')).toBe('09/03/2026, 12:00 PM');
  });

  it('avisa cuando la fecha no se puede interpretar', () => {
    expect(formatearFechaHora('cualquier-cosa')).toBe('Fecha inválida');
  });
});

describe('formatearFechaConMes', () => {
  it('escribe el mes en palabras y la hora en 24 horas', () => {
    expect(formatearFechaConMes('2026-03-09T14:30:00')).toBe('9 de Marzo, 14:30 hrs');
  });

  it('no antepone cero al día', () => {
    expect(formatearFechaConMes('2026-03-09T08:05:00')).toBe('9 de Marzo, 8:05 hrs');
  });

  it('antepone cero a los minutos', () => {
    expect(formatearFechaConMes('2026-03-09T14:05:00')).toContain(':05');
  });

  /**
   * La versión anterior devolvía «Oct 2023» escrito a mano ante una fecha
   * ilegible: el usuario veía octubre de 2023 en lugar de un aviso.
   */
  it('avisa en lugar de inventar un mes y un año', () => {
    const resultado = formatearFechaConMes('cualquier-cosa');

    expect(resultado).toBe('Fecha inválida');
    expect(resultado).not.toContain('Oct');
    expect(resultado).not.toContain('2023');
  });
});
