import { describe, it, expect } from 'vitest';
import { mensajeDeFallo, SIN_CONEXION } from './resultado-de-accion';

/**
 * Qué se le dice al usuario cuando una acción sobre el padrón no sale.
 *
 * Las cuatro tablas de padrón mostraban estos errores con `alert()` del
 * navegador: bloquean la pestaña entera y desaparecen sin dejar rastro al
 * aceptarlos, justo cuando lo que hay que hacer es leer el motivo.
 */

describe('mensajeDeFallo', () => {
  it('prefiere el mensaje que devuelve el servidor', () => {
    const respuesta = { ok: false, error: { message: 'El docente tiene visitas programadas.' } };
    expect(mensajeDeFallo(respuesta, 'Error genérico')).toBe(
      'El docente tiene visitas programadas.',
    );
  });

  /**
   * El respaldo describe la acción que falló. Sin él, un error sin mensaje
   * dejaba al usuario con un recuadro vacío.
   */
  it('usa el respaldo cuando el servidor no explica nada', () => {
    expect(mensajeDeFallo({ ok: false }, 'Error al dar de baja.')).toBe('Error al dar de baja.');
    expect(mensajeDeFallo({ ok: false, error: {} }, 'Error al dar de baja.')).toBe(
      'Error al dar de baja.',
    );
  });

  it('usa el respaldo cuando el mensaje del servidor viene vacío', () => {
    const respuesta = { ok: false, error: { message: '   ' } };
    expect(mensajeDeFallo(respuesta, 'Error al reactivar.')).toBe('Error al reactivar.');
  });

  it('tolera un error que no tiene la forma esperada', () => {
    expect(mensajeDeFallo({ ok: false, error: 'texto suelto' }, 'Respaldo')).toBe('Respaldo');
    expect(mensajeDeFallo({ ok: false, error: null }, 'Respaldo')).toBe('Respaldo');
  });

  it('devuelve nulo cuando la acción salió bien', () => {
    expect(mensajeDeFallo({ ok: true }, 'Respaldo')).toBeNull();
  });
});

describe('SIN_CONEXION', () => {
  it('dice qué hacer, no sólo qué pasó', () => {
    expect(SIN_CONEXION).toMatch(/intente/i);
  });
});
