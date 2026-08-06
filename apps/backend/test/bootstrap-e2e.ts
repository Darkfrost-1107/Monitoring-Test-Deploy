import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';

/**
 * Arranque de la aplicación para pruebas de extremo a extremo.
 *
 * Fase 3 de PLAN_REMEDIACION.md. Replica la configuración de `main.ts` que no
 * vive en `AppModule`: el prefijo global, el pipe de validación y el lector de
 * cookies.
 *
 * Sin esto, la aplicación bajo prueba no se parece a la real. Es exactamente lo
 * que le pasaba a `app.e2e-spec.ts`: pedía `/api/health` mientras el módulo
 * servía `/health`, de modo que la única prueba de extremo a extremo del
 * proyecto fallaba. Nadie lo notó porque CI no ejecuta esta suite.
 */

/**
 * Impide que la suite se ejecute contra una base que no sea de pruebas.
 *
 * Esta guarda existe por un incidente concreto: una primera versión de la suite
 * se ejecutó contra la base de desarrollo y, al comprobar el rechazo de
 * credenciales incorrectas, incrementó los contadores de intentos fallidos y
 * **dejó bloqueada la cuenta del Director de UGEL**.
 *
 * Un recorrido de extremo a extremo nunca es de sólo lectura: iniciar sesión
 * registra la última conexión y crea la fila de sesión, y fallar al iniciarla
 * bloquea la cuenta. Esos efectos no se ven al leer el caso de prueba.
 *
 * La base debe llamarse de forma que se reconozca como efímera, o hay que
 * declarar la excepción explícitamente con `E2E_PERMITIR_BASE_NO_EFIMERA=1`.
 */
function exigirBaseEfimera(): void {
  if (process.env.E2E_PERMITIR_BASE_NO_EFIMERA === '1') return;

  const url = process.env.DATABASE_URL ?? '';
  const esEfimera = /(_test|_e2e|-test|-e2e)(\?|$)/.test(url) || /localhost:5433/.test(url);

  if (!esEfimera) {
    throw new Error(
      'Las pruebas de extremo a extremo mutan datos: inician sesión, crean filas de sesión y ' +
        'pueden bloquear cuentas al comprobar credenciales incorrectas.\n\n' +
        'Apunte DATABASE_URL a una base efímera cuyo nombre termine en _test o _e2e, o declare ' +
        'la excepción con E2E_PERMITIR_BASE_NO_EFIMERA=1 si sabe lo que está haciendo.\n\n' +
        `DATABASE_URL actual: ${url.replace(/:[^:@]+@/, ':***@')}`,
    );
  }
}

/**
 * Crea la aplicación para pruebas.
 *
 * @param limitarFrecuencia Deja activo el `ThrottlerGuard`. Por defecto se
 * desactiva: una suite hace en segundos las peticiones que un usuario haría en
 * minutos, y el límite devuelve 429 a mitad de ejecución. Que funciona ya lo
 * comprueba `auth.e2e-spec.ts`, donde el arranque hace un solo inicio de sesión
 * por usuario; desactivarlo aquí no deja el control sin verificar.
 */
export async function crearAppE2E(limitarFrecuencia = false): Promise<INestApplication> {
  exigirBaseEfimera();

  const builder = Test.createTestingModule({ imports: [AppModule] });
  if (!limitarFrecuencia) {
    // Se anula por PROVEEDOR y no con `overrideGuard`: el limitador está
    // registrado como `APP_GUARD` en `AppModule`, y `overrideGuard` sólo
    // alcanza a los guards aplicados con `@UseGuards`.
    //
    // El tope efectivo lo fija `@Throttle({ limit: 5 })` sobre `POST /login`,
    // no el global de 100: cuatro usuarios que inician sesión dos veces cada
    // uno ya lo superan.
    builder.overrideProvider(APP_GUARD).useValue({ canActivate: () => true });
  }
  const moduleFixture = await builder.compile();

  const app = moduleFixture.createNestApplication();

  // Mismo orden y opciones que `main.ts`.
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  await app.init();
  return app;
}

/**
 * Credenciales sembradas por `database/seeders/personas.js`.
 *
 * La contraseña de cada usuario de prueba **es su propio DNI**: el seeder hace
 * `bcrypt.hashSync(dni, 4)`. Verificado comparando contra el hash almacenado.
 *
 * Es una razón más por la que ese seeder no debe ejecutarse jamás contra
 * producción: dejaría cada cuenta con una contraseña deducible de un dato
 * público.
 */
const credencial = (dni: string) => ({ dni, password: dni });

export const USUARIOS_SEMBRADOS = {
  superusuario: credencial('00000000'),
  directorUgel: credencial('40000001'),
  jefeGestion: credencial('40000002'),
  jefeArea: credencial('40000003'),
} as const;

/**
 * Contraseña definitiva que la suite fija para poder operar.
 *
 * Cumple las reglas de `ChangePasswordDto`: ocho caracteres, una mayúscula y un
 * número. Sin este paso, `AuthGuard` bloquea con 403 toda petición mientras
 * `firstLogin` siga en verdadero, de modo que ningún recorrido puede llegar al
 * guard de capacidades ni a los datos de negocio.
 */
export const PASSWORD_E2E = 'PruebaE2E2026';

export interface SesionE2E {
  cookies: string[];
  user: { dni: string; role: string; permissions: string[] };
}

/**
 * Cambia la contraseña temporal de un usuario recién sembrado.
 *
 * `change-password` está marcado con `@AllowFirstLogin`, de modo que es de lo
 * poco alcanzable mientras la cuenta siga con la contraseña provisional. Al
 * terminar, el backend limpia las cookies por seguridad: la sesión usada para
 * el cambio deja de servir y hay que iniciar otra.
 */
export async function cambiarPasswordTemporal(
  servidor: unknown,
  usuario: { dni: string; password: string },
): Promise<void> {
  const { default: request } = await import('supertest');
  const app = servidor as Parameters<typeof request>[0];

  const inicial = await request(app)
    .post('/api/auth/login')
    .send({ dni: usuario.dni, password: usuario.password });

  // Si la cuenta ya fue preparada por una ejecución anterior, no hay nada que
  // hacer: la contraseña temporal ya no está vigente.
  if (inicial.status !== 200) return;

  await request(app)
    .post('/api/auth/change-password')
    .set('Cookie', (inicial.headers['set-cookie'] as unknown as string[]) ?? [])
    .send({ newPassword: PASSWORD_E2E })
    .expect(200);
}

/** Inicia sesión con la contraseña definitiva y devuelve la sesión operativa. */
export async function sesionOperativa(
  servidor: unknown,
  usuario: { dni: string },
): Promise<SesionE2E> {
  const { default: request } = await import('supertest');
  const app = servidor as Parameters<typeof request>[0];

  const res = await request(app)
    .post('/api/auth/login')
    .send({ dni: usuario.dni, password: PASSWORD_E2E })
    .expect(200);

  return {
    cookies: (res.headers['set-cookie'] as unknown as string[]) ?? [],
    user: res.body.user as SesionE2E['user'],
  };
}
