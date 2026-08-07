import { describe, it, expect } from 'vitest';
import {
  aFechaISOLocal,
  formatearFecha,
  hoyISO,
  aFechaLocal,
  formatearFechaConMes,
  formatearFechaEnPalabras,
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

  /**
   * DEFECTO CORREGIDO. La primera versión de esta función, escrita en la Fase 6,
   * ignoraba la zona: aplicaba la construcción local a cualquier cadena que
   * empezara con `YYYY-MM-DDTHH:MM`, incluida la que termina en `Z`. Un instante
   * UTC quedaba desplazado cinco horas y podía cambiar de día.
   */
  it('convierte a hora local una cadena con zona explícita', () => {
    // 2026-03-10 01:30 UTC son las 20:30 del 9 de marzo en Lima.
    const fecha = aFechaLocal('2026-03-10T01:30:00.000Z');

    expect(fecha?.getDate()).toBe(9);
    expect(fecha?.getHours()).toBe(20);
  });

  it('respeta también un desplazamiento explícito', () => {
    const fecha = aFechaLocal('2026-03-09T20:30:00-05:00');

    expect(fecha?.getDate()).toBe(9);
    expect(fecha?.getHours()).toBe(20);
  });

  it('trata como local la cadena SIN zona, que es la del formulario', () => {
    const fecha = aFechaLocal('2026-03-09T20:30');

    expect(fecha?.getDate()).toBe(9);
    expect(fecha?.getHours()).toBe(20);
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

describe('aFechaISOLocal', () => {
  it('devuelve la fecha en formato ISO corto', () => {
    expect(aFechaISOLocal('2026-03-09T14:30:00')).toBe('2026-03-09');
  });

  /**
   * Éste es el caso que estaba mal. `toISOString()` devuelve UTC: en Perú
   * (UTC-5), todo lo registrado después de las 19:00 caía en el día siguiente.
   * Un cargo asignado un martes a las 20:00 se mostraba como del miércoles.
   */
  it('no adelanta el día en un registro de la noche', () => {
    expect(aFechaISOLocal('2026-03-09T20:30:00')).toBe('2026-03-09');
    expect(aFechaISOLocal('2026-03-09T23:59:00')).toBe('2026-03-09');
  });

  it('acepta un objeto Date además de una cadena', () => {
    expect(aFechaISOLocal(new Date(2026, 2, 9, 20, 30))).toBe('2026-03-09');
  });

  it('antepone ceros a mes y día', () => {
    expect(aFechaISOLocal('2026-01-05T10:00:00')).toBe('2026-01-05');
  });

  it('devuelve cadena vacía ante un valor que no es fecha', () => {
    expect(aFechaISOLocal('cualquier-cosa')).toBe('');
    expect(aFechaISOLocal(null)).toBe('');
    expect(aFechaISOLocal(undefined)).toBe('');
  });
});

describe('hoyISO', () => {
  it('devuelve el día local en formato ISO corto', () => {
    expect(hoyISO(new Date(2026, 2, 9, 10, 0))).toBe('2026-03-09');
  });

  /**
   * El caso que estaba mal: `new Date().toISOString()` da el día en UTC, de
   * modo que en Perú, después de las 19:00, devolvía el día siguiente.
   */
  it('no adelanta el día por la noche', () => {
    expect(hoyISO(new Date(2026, 2, 9, 20, 30))).toBe('2026-03-09');
    expect(hoyISO(new Date(2026, 2, 9, 23, 59))).toBe('2026-03-09');
  });
});

describe('formatearFechaEnPalabras', () => {
  it('escribe día, mes en palabras y año', () => {
    expect(formatearFechaEnPalabras('2026-03-09T14:30:00')).toBe('9 de Marzo, 2026');
  });

  it('funciona con una fecha sin hora, sin correrse de día', () => {
    expect(formatearFechaEnPalabras('2026-03-01')).toBe('1 de Marzo, 2026');
  });

  it('avisa en lugar de devolver la cadena original', () => {
    expect(formatearFechaEnPalabras('cualquier-cosa')).toBe('Fecha inválida');
  });
});

describe('formatearFecha', () => {
  it('aplica las opciones que le pasan', () => {
    const resultado = formatearFecha('2026-03-09', { day: '2-digit', month: 'short', year: 'numeric' });

    expect(resultado).toContain('09');
    expect(resultado).toContain('2026');
  });

  /** El mismo beneficio que el resto del módulo: no se corre de día. */
  it('no adelanta ni atrasa el día', () => {
    expect(formatearFecha('2026-03-01', { day: '2-digit' })).toBe('01');
  });

  it('avisa cuando no es una fecha', () => {
    expect(formatearFecha('cualquier-cosa', { day: '2-digit' })).toBe('Fecha inválida');
  });
});
