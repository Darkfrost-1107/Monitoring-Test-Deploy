import { aFechaDeCalendario, aFechaDeCalendarioOpcional } from './fecha-calendario.js';

/**
 * Pruebas de la serialización de columnas `@db.Date`.
 *
 * Fase 6 de PLAN_REMEDIACION.md. `fechaProgramada`, `fechaOriginal` y
 * `fechaPropuesta` son fechas de **calendario**, no instantes: la columna no
 * guarda hora. Prisma las entrega como `Date` a medianoche UTC, de modo que
 * serializarlas con `toISOString()` produce `2026-03-09T00:00:00.000Z`, y el
 * cliente —que está en Perú, UTC-5— las muestra como el 8 de marzo.
 *
 * El proyecto ya tenía la conversión correcta en `cronograma.mapper.ts`, pero
 * dos puntos la esquivaban y llamaban a `toISOString()` directo.
 */

describe('aFechaDeCalendario', () => {
  it('devuelve solo la parte de fecha', () => {
    expect(aFechaDeCalendario(new Date('2026-03-09T00:00:00.000Z'))).toBe('2026-03-09');
  });

  /**
   * Éste es el caso que importa: Prisma entrega una columna `@db.Date` como
   * medianoche UTC. La fecha correcta es la que dice el calendario, no la que
   * resulta de convertir ese instante a otro huso.
   */
  it('no se corre de día con la medianoche UTC que entrega Prisma', () => {
    expect(aFechaDeCalendario(new Date('2026-03-01T00:00:00.000Z'))).toBe('2026-03-01');
    expect(aFechaDeCalendario(new Date('2026-01-01T00:00:00.000Z'))).toBe('2026-01-01');
  });

  it('acepta una cadena ya serializada', () => {
    expect(aFechaDeCalendario('2026-03-09T00:00:00.000Z')).toBe('2026-03-09');
    expect(aFechaDeCalendario('2026-03-09')).toBe('2026-03-09');
  });

  /**
   * La columna está declarada `NOT NULL`: un valor ilegible ahí es corrupción
   * de datos. El servidor tiene registros y debe decirlo, en lugar de emitir
   * una fecha equivocada que el cliente mostraría como buena.
   */
  it('lanza ante una fecha inválida en una columna no nula', () => {
    expect(() => aFechaDeCalendario(new Date('no-es-fecha'))).toThrow(/inválida/);
  });
});

describe('aFechaDeCalendarioOpcional', () => {
  it('convierte igual que la versión no nula', () => {
    expect(aFechaDeCalendarioOpcional(new Date('2026-03-09T00:00:00.000Z'))).toBe('2026-03-09');
  });

  it('devuelve null cuando no hay fecha', () => {
    expect(aFechaDeCalendarioOpcional(null)).toBeNull();
    expect(aFechaDeCalendarioOpcional(undefined)).toBeNull();
  });

  it('devuelve null ante una fecha inválida, sin lanzar', () => {
    expect(aFechaDeCalendarioOpcional(new Date('no-es-fecha'))).toBeNull();
  });
});
