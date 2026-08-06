// `plainToInstance` resuelve tipos por reflexión. En la aplicación real lo
// carga NestJS a través de @nestjs/core; en una prueba unitaria aislada hay
// que importarlo explícitamente antes del módulo bajo prueba.
import 'reflect-metadata';
import { validate } from './env.validation.js';

/**
 * Estas pruebas cubren el control de seguridad introducido en la Fase 0 de
 * PLAN_REMEDIACION.md: las claves sensibles dejaron de tener valor por defecto,
 * de modo que su ausencia aborta el arranque en lugar de producir un inicio
 * silencioso con credenciales conocidas.
 */

/** Entorno mínimo válido: sólo las claves sin valor por defecto. */
const entornoValido = (): Record<string, unknown> => ({
  DATABASE_URL: 'postgresql://usuario:clave@db.interno:5432/monitoring?schema=public',
  JWT_SECRET: 'a'.repeat(64),
  JWT_REFRESH_SECRET: 'b'.repeat(64),
});

describe('validate (variables de entorno)', () => {
  describe('claves requeridas', () => {
    it('acepta un entorno que define las tres claves sensibles', () => {
      const resultado = validate(entornoValido());

      expect(resultado.DATABASE_URL).toContain('postgresql://');
      expect(resultado.JWT_SECRET).toHaveLength(64);
      expect(resultado.JWT_REFRESH_SECRET).toHaveLength(64);
    });

    it.each(['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'])(
      'aborta cuando falta %s',
      (clave) => {
        const entorno = entornoValido();
        delete entorno[clave];

        expect(() => validate(entorno)).toThrow(/Environment validation failed/);
      },
    );

    it('aborta cuando DATABASE_URL está presente pero vacía', () => {
      expect(() => validate({ ...entornoValido(), DATABASE_URL: '' })).toThrow(
        /Environment validation failed/,
      );
    });
  });

  describe('longitud mínima de los secretos de firma', () => {
    it.each(['JWT_SECRET', 'JWT_REFRESH_SECRET'])(
      'rechaza %s de menos de 64 caracteres',
      (clave) => {
        // 52 caracteres: la longitud exacta del marcador que el proyecto usaba
        // como valor por defecto, pese a declarar "AT_LEAST_64_CHARS".
        const entorno = { ...entornoValido(), [clave]: 'x'.repeat(52) };

        expect(() => validate(entorno)).toThrow(/Environment validation failed/);
      },
    );

    it('acepta exactamente 64 caracteres', () => {
      expect(() => validate({ ...entornoValido(), JWT_SECRET: 'x'.repeat(64) })).not.toThrow();
    });
  });

  describe('rechazo de secretos de ejemplo en producción', () => {
    it('acepta un secreto de ejemplo fuera de producción', () => {
      const entorno = {
        ...entornoValido(),
        NODE_ENV: 'development',
        JWT_SECRET: `dev-only-insecure-${'x'.repeat(50)}`,
      };

      expect(() => validate(entorno)).not.toThrow();
    });

    it.each([
      ['JWT_SECRET', `dev-only-insecure-${'x'.repeat(50)}`],
      ['JWT_REFRESH_SECRET', `CHANGE_ME_${'x'.repeat(60)}`],
      ['DATABASE_URL', 'postgresql://example:example@localhost:5432/monitoring'],
    ])('aborta en producción cuando %s contiene un valor de ejemplo', (clave, valor) => {
      const entorno = { ...entornoValido(), NODE_ENV: 'production', [clave]: valor };

      expect(() => validate(entorno)).toThrow(/contiene un valor de ejemplo/);
    });

    it('acepta secretos propios en producción', () => {
      const entorno = {
        ...entornoValido(),
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://sigepro:9f3a1c@db.interno:5432/monitoring?schema=public',
        JWT_SECRET: '7c1f'.repeat(16),
        JWT_REFRESH_SECRET: '2e9b'.repeat(16),
      };

      expect(() => validate(entorno)).not.toThrow();
    });
  });

  describe('valores por defecto que sí deben conservarse', () => {
    it('aplica los valores por defecto de las claves no sensibles', () => {
      const resultado = validate(entornoValido());

      expect(resultado.PORT).toBe(3000);
      expect(resultado.FRONTEND_URL).toBe('http://localhost:5173');
      expect(resultado.BCRYPT_SALT_ROUNDS).toBe(12);
      expect(resultado.NODE_ENV).toBe('development');
    });
  });
});
