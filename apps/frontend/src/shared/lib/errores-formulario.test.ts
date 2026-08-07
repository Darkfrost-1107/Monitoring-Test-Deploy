import { describe, it, expect } from 'vitest';
import { esErrorDeCelular, mensajeDeError } from './errores-formulario';

/**
 * Pruebas de qué error se le muestra al usuario en cada campo.
 *
 * Fase 6 de PLAN_REMEDIACION.md, H-18. Estas dos reglas estaban escritas
 * palabra por palabra en los tres formularios de persona. Deciden si el
 * usuario ve o no el motivo por el que su formulario no se guardó.
 */

describe('esErrorDeCelular', () => {
  /**
   * El backend responde con un texto libre. La única forma de saber a qué campo
   * corresponde es buscar la palabra, y el mensaje puede llegar en cualquiera
   * de las dos formas en que se nombra ese dato.
   */
  it('reconoce el mensaje que menciona el celular', () => {
    expect(esErrorDeCelular('El celular ya está registrado')).toBe(true);
  });

  it('reconoce el mensaje que menciona el teléfono', () => {
    expect(esErrorDeCelular('El teléfono ya está en uso')).toBe(true);
  });

  it('ignora mayúsculas', () => {
    expect(esErrorDeCelular('CELULAR DUPLICADO')).toBe(true);
  });

  it('no reconoce un error de otro campo', () => {
    expect(esErrorDeCelular('El DNI ya está registrado')).toBe(false);
  });

  it('es falso sin error de servidor', () => {
    expect(esErrorDeCelular(null)).toBe(false);
    expect(esErrorDeCelular(undefined)).toBe(false);
    expect(esErrorDeCelular('')).toBe(false);
  });

  /**
   * DEFECTO CONOCIDO, fijado. La búsqueda es por subcadena sin acento, de modo
   * que un mensaje que diga «telefono» sin tilde no se reconoce y el error
   * queda sin mostrarse en ningún campo.
   */
  it('DEFECTO: no reconoce «telefono» sin tilde', () => {
    expect(esErrorDeCelular('El telefono ya existe')).toBe(false);
  });
});

describe('mensajeDeError', () => {
  const errores = { nombres: 'Requerido', celular: 'Formato inválido' };

  /**
   * Los errores de validación no se muestran mientras el usuario escribe:
   * aparecen recién al intentar guardar. Marcar en rojo un campo que todavía no
   * terminó de completarse es hostil.
   */
  it('calla los errores de validación antes del primer envío', () => {
    expect(mensajeDeError('nombres', { errores, enviado: false })).toBe('');
  });

  it('muestra el error de validación después de enviar', () => {
    expect(mensajeDeError('nombres', { errores, enviado: true })).toBe('Requerido');
  });

  it('no muestra nada si el campo no tiene error', () => {
    expect(mensajeDeError('correo', { errores, enviado: true })).toBe('');
  });

  /**
   * El error del servidor sí se muestra de inmediato: llega después de un
   * intento de guardado, de modo que el usuario ya pidió el resultado.
   */
  it('muestra el error del servidor en el campo que le corresponde, aun sin enviar', () => {
    const conServidor = {
      errores,
      enviado: false,
      serverError: 'El celular ya está registrado',
    };

    expect(mensajeDeError('celular', conServidor)).toBe('El celular ya está registrado');
  });

  it('el error del servidor tiene prioridad sobre el de validación', () => {
    const conServidor = {
      errores,
      enviado: true,
      serverError: 'El celular ya está registrado',
    };

    expect(mensajeDeError('celular', conServidor)).toBe('El celular ya está registrado');
  });

  it('no aplica el error del servidor a un campo que no le corresponde', () => {
    const conServidor = {
      errores,
      enviado: true,
      serverError: 'El celular ya está registrado',
    };

    expect(mensajeDeError('nombres', conServidor)).toBe('Requerido');
  });

  it('un error de servidor de otro campo no altera el celular', () => {
    const otroCampo = { errores, enviado: true, serverError: 'El DNI ya existe' };
    expect(mensajeDeError('celular', otroCampo)).toBe('Formato inválido');
  });
});
