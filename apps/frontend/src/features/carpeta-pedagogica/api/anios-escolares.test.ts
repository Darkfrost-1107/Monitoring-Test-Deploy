import { describe, it, expect } from 'vitest';
import {
  ANIO_ESCOLAR_INICIAL,
  anioEscolarVigente,
  aniosEscolaresDisponibles,
} from '@sistema-monitoreo/shared-contracts';

/**
 * Años que ofrece el selector de la carpeta pedagógica.
 *
 * La lista arranca en el año de puesta en marcha y crece con el calendario. No
 * mira hacia atrás —antes de esa fecha la función no existía— ni hacia adelante:
 * el portafolio documenta un ciclo lectivo en curso, no uno que no empezó.
 *
 * Se prueba con un año inyectado y no con el reloj del sistema, porque una
 * prueba que depende de la fecha real cambia de resultado sola.
 */
describe('aniosEscolaresDisponibles', () => {
  it('arranca en el año de puesta en marcha', () => {
    expect(aniosEscolaresDisponibles(2026)[0]).toBe(ANIO_ESCOLAR_INICIAL);
  });

  it('va en orden creciente', () => {
    const anios = aniosEscolaresDisponibles(2030);
    expect(anios).toEqual([...anios].sort((a, b) => a - b));
  });

  it('termina en el año en curso y NO ofrece el siguiente', () => {
    // Reglas del cliente: estando en 2026 no se carga un enlace para 2027.
    expect(aniosEscolaresDisponibles(2026)).toEqual([2026]);
  });

  it('crece con el calendario sin dejar huecos', () => {
    expect(aniosEscolaresDisponibles(2029)).toEqual([2026, 2027, 2028, 2029]);
  });

  it('nunca incluye un año futuro', () => {
    const enCurso = 2028;
    for (const anio of aniosEscolaresDisponibles(enCurso)) {
      expect(anio).toBeLessThanOrEqual(enCurso);
    }
  });

  it('nunca ofrece un año anterior a la puesta en marcha', () => {
    // Un reloj mal configurado no debe producir una lista vacía ni años que el
    // servidor va a rechazar.
    expect(aniosEscolaresDisponibles(2010)).toEqual([ANIO_ESCOLAR_INICIAL]);
  });

  it('no repite años', () => {
    const anios = aniosEscolaresDisponibles(2028);
    expect(new Set(anios).size).toBe(anios.length);
  });
});

describe('anioEscolarVigente', () => {
  it('es el año en curso', () => {
    expect(anioEscolarVigente(2028)).toBe(2028);
  });

  it('coincide con el último de la lista disponible', () => {
    const anios = aniosEscolaresDisponibles(2029);
    expect(anioEscolarVigente(2029)).toBe(anios[anios.length - 1]);
  });

  it('no cae por debajo de la puesta en marcha con un reloj atrasado', () => {
    expect(anioEscolarVigente(2010)).toBe(ANIO_ESCOLAR_INICIAL);
  });
});
