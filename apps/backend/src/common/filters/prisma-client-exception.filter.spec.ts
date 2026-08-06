import { jest } from '@jest/globals';
import { HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaClientExceptionFilter } from './prisma-client-exception.filter.js';

/**
 * Pruebas de caracterización del filtro de errores de Prisma.
 *
 * Fase 3 de PLAN_REMEDIACION.md. Todo error de base de datos de la aplicación
 * pasa por aquí: es lo que convierte un fallo de Prisma en la respuesta que ve
 * el usuario. Estaba sin cobertura pese a decidir el código de estado y el
 * mensaje de cada uno.
 *
 * El caso P2002 tiene un árbol de parseo con cinco caminos para averiguar qué
 * campo estaba duplicado —array, cadena, objeto, y dos expresiones regulares
 * sobre el mensaje— y ninguno estaba verificado.
 */

/** Respuesta de Express reducida a lo que el filtro usa. */
const respuestaFalsa = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json, host: { switchToHttp: () => ({ getResponse: () => ({ status }) }) } };
};

const errorPrisma = (
  code: string,
  message = 'error de prueba',
  meta?: Record<string, unknown>,
): Prisma.PrismaClientKnownRequestError =>
  new Prisma.PrismaClientKnownRequestError(message, { code, clientVersion: '7.8.0', meta });

/** Ejecuta el filtro y devuelve el cuerpo con el que respondió. */
const capturar = (exception: Prisma.PrismaClientKnownRequestError) => {
  const r = respuestaFalsa();
  new PrismaClientExceptionFilter().catch(exception, r.host as unknown as ArgumentsHost);
  return {
    status: r.status.mock.calls[0][0] as number,
    body: r.json.mock.calls[0][0] as { statusCode: number; message: string; error: string },
  };
};

beforeAll(() => {
  // El filtro registra cada error; silenciarlo mantiene legible la salida.
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
});

afterAll(() => jest.restoreAllMocks());

describe('PrismaClientExceptionFilter', () => {
  describe('correspondencia entre código de Prisma y estado HTTP', () => {
    it.each([
      ['P2002', HttpStatus.CONFLICT, 'valor duplicado'],
      ['P2025', HttpStatus.NOT_FOUND, 'registro inexistente'],
      ['P2003', HttpStatus.BAD_REQUEST, 'relación faltante'],
    ])('%s responde %d (%s)', (code, esperado) => {
      expect(capturar(errorPrisma(code)).status).toBe(esperado);
    });

    it('un código desconocido responde 500', () => {
      expect(capturar(errorPrisma('P9999')).status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('forma de la respuesta', () => {
    it('incluye estado, mensaje y código de Prisma', () => {
      const { body } = capturar(errorPrisma('P2025'));

      expect(body).toEqual({
        statusCode: HttpStatus.NOT_FOUND,
        message: expect.any(String),
        error: 'P2025',
      });
    });

    it('no filtra al cliente el mensaje interno de Prisma', () => {
      // El mensaje de Prisma revela nombres de tabla, columna e índice. Sólo
      // debe ir al registro, nunca a la respuesta.
      const interno =
        'Invalid `prisma.usuario.create()`: Unique constraint failed on the fields: (`dni`) en tabla usuarios_privada';
      const { body } = capturar(errorPrisma('P2002', interno, { target: ['dni'] }));

      expect(body.message).not.toContain('prisma.usuario');
      expect(body.message).not.toContain('usuarios_privada');
    });

    it('un error no contemplado devuelve un mensaje genérico', () => {
      const { body } = capturar(errorPrisma('P9999', 'detalle interno del motor'));

      expect(body.message).toBe('Error interno del servidor en la base de datos');
      expect(body.message).not.toContain('detalle interno');
    });
  });

  describe('P2002 — identificación del campo duplicado', () => {
    it('lo toma del primer elemento cuando meta.target es un array', () => {
      const { body } = capturar(errorPrisma('P2002', 'x', { target: ['dni'] }));
      expect(body.message).toContain('DNI');
    });

    it('lo toma directamente cuando meta.target es una cadena', () => {
      const { body } = capturar(errorPrisma('P2002', 'x', { target: 'correo' }));
      expect(body.message).toContain('correo electrónico');
    });

    it('recurre al mensaje cuando meta.target no viene', () => {
      const { body } = capturar(
        errorPrisma('P2002', 'Unique constraint failed on the fields: (`dni`)'),
      );
      expect(body.message).toContain('DNI');
    });

    it('cae en un mensaje general cuando no logra identificar el campo', () => {
      const { body } = capturar(errorPrisma('P2002', 'sin pistas sobre el campo'));

      expect(body.message).toContain('ya está en uso');
      expect(body.message).toContain('DNI, correo, celular');
    });
  });

  describe('P2002 — normalización del nombre del campo', () => {
    it.each([
      ['usuarios_dni_key', 'DNI'],
      ['persona_correo_key', 'correo electrónico'],
      ['dni', 'DNI'],
      ['email', 'correo electrónico'],
    ])('convierte %p en un nombre legible que contiene %p', (target, esperado) => {
      // Quita el sufijo `_key`, se queda con el último segmento y traduce los
      // nombres técnicos a los que el usuario reconoce.
      const { body } = capturar(errorPrisma('P2002', 'x', { target: [target] }));
      expect(body.message).toContain(esperado);
    });

    it.each([['telefono'], ['celular']])('%s recibe un mensaje propio', (target) => {
      const { body } = capturar(errorPrisma('P2002', 'x', { target: [target] }));
      expect(body.message).toContain('celular/teléfono');
    });

    it('no expone comillas ni paréntesis del nombre técnico', () => {
      const { body } = capturar(errorPrisma('P2002', 'x', { target: '(`dni`)' }));

      expect(body.message).not.toMatch(/[()`'"]/);
    });
  });

  describe('registro de la incidencia', () => {
    it('registra como error lo que devuelve 500', () => {
      const error = jest.spyOn(Logger.prototype, 'error');
      error.mockClear();

      capturar(errorPrisma('P9999'));

      expect(error).toHaveBeenCalled();
    });

    it('registra como aviso lo que devuelve un estado contemplado', () => {
      const warn = jest.spyOn(Logger.prototype, 'warn');
      const error = jest.spyOn(Logger.prototype, 'error');
      warn.mockClear();
      error.mockClear();

      capturar(errorPrisma('P2025'));

      expect(warn).toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    });
  });
});
