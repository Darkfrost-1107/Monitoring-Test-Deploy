import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Capability } from '@sistema-monitoreo/shared-contracts';
import {
  cambiarPasswordTemporal,
  crearAppE2E,
  sesionOperativa,
  USUARIOS_SEMBRADOS,
  type SesionE2E,
} from './bootstrap-e2e.js';

/**
 * Recorrido de extremo a extremo: el guard de capacidades sobre peticiones reales.
 *
 * Fase 3 de PLAN_REMEDIACION.md. Complementa a `auth.e2e-spec.ts`, que verifica
 * el inicio de sesión pero **no puede** llegar hasta aquí: mientras `firstLogin`
 * siga en verdadero, `AuthGuard` corta antes que `PermissionsGuard` y todo
 * rechazo es por contraseña temporal, no por capacidades.
 *
 * Esta suite completa el cambio de contraseña de cada usuario antes de empezar,
 * de modo que los 403 que comprueba son de verdad del guard de capacidades.
 * Sin ese paso, las pruebas pasarían por el motivo equivocado.
 *
 * ── Precondición incompatible con `auth.e2e-spec.ts` ──
 * Aquella suite necesita cuentas **recién sembradas**, con su contraseña
 * temporal intacta; ésta necesita cuentas **ya preparadas**. Al cambiar las
 * contraseñas deja la base en un estado en el que la otra no puede iniciar
 * sesión.
 *
 * No es un defecto de ninguna de las dos: son estados distintos del mismo
 * sistema y ambos merecen verificarse. Por eso el trabajo de CI ejecuta cada
 * suite contra una base recién creada, en lugar de encadenarlas sobre la misma.
 */
describe('Autorización por capacidades (e2e)', () => {
  let app: INestApplication;
  const sesiones = {} as Record<keyof typeof USUARIOS_SEMBRADOS, SesionE2E>;

  beforeAll(async () => {
    // El limitador permite cinco inicios de sesión por minuto y dejar operativos
    // a cuatro usuarios necesita ocho: uno con la contraseña temporal y otro con
    // la definitiva, porque `change-password` borra las cookies de la sesión en
    // curso. Su estado vive en memoria por instancia, de modo que el trabajo se
    // reparte en dos aplicaciones y ninguna supera el tope.
    //
    // Se prefiere respetar el límite antes que anularlo: es el mismo camino que
    // recorre una persona al entrar por primera vez.
    const preparacion = await crearAppE2E();
    for (const usuario of Object.values(USUARIOS_SEMBRADOS)) {
      await cambiarPasswordTemporal(preparacion.getHttpServer(), usuario);
    }
    await preparacion.close();

    app = await crearAppE2E();
    for (const [clave, usuario] of Object.entries(USUARIOS_SEMBRADOS)) {
      sesiones[clave as keyof typeof USUARIOS_SEMBRADOS] = await sesionOperativa(
        app.getHttpServer(),
        usuario,
      );
    }
  }, 120_000);

  afterAll(async () => {
    await app.close();
  });

  const como = (clave: keyof typeof USUARIOS_SEMBRADOS) =>
    request(app.getHttpServer()).get('/api/especialistas').set('Cookie', sesiones[clave].cookies);

  describe('el cambio de contraseña deja la cuenta operativa', () => {
    it('ya no bloquea por contraseña temporal', async () => {
      const res = await como('jefeGestion');

      expect(JSON.stringify(res.body)).not.toMatch(/contraseña temporal/i);
    });
  });

  describe('lectura de especialistas — exige especialistas:read', () => {
    it('el jefe de gestión, que la tiene, accede', async () => {
      expect(sesiones.jefeGestion.user.permissions).toContain(Capability.ESPECIALISTAS_READ);

      await como('jefeGestion').expect(200);
    });

    it('el director de UGEL, que no la tiene, recibe 403', async () => {
      // Ahora sí es el guard de capacidades quien rechaza, no el de contraseña
      // temporal. Es la diferencia entre esta suite y `auth.e2e-spec.ts`.
      expect(sesiones.directorUgel.user.permissions).not.toContain(Capability.ESPECIALISTAS_READ);

      const res = await como('directorUgel');

      expect(res.status).toBe(403);
      expect(JSON.stringify(res.body)).toMatch(/permisos requeridos/i);
    });

    it('el jefe de área también accede: su cargo se la concede', async () => {
      // Comprueba la composición de capacidades: el ROL jefe_area no incluye
      // especialistas:read por sí solo; llega por el cargo de especialista.
      expect(sesiones.jefeArea.user.permissions).toContain(Capability.ESPECIALISTAS_READ);

      await como('jefeArea').expect(200);
    });
  });

  describe('panel del superusuario — exige superadmin:access', () => {
    const candidatos = (clave: keyof typeof USUARIOS_SEMBRADOS) =>
      request(app.getHttpServer())
        .get('/api/superadmin/candidatos')
        .set('Cookie', sesiones[clave].cookies);

    it('el superusuario accede', async () => {
      await candidatos('superusuario').expect(200);
    });

    it.each(['directorUgel', 'jefeGestion', 'jefeArea'] as const)(
      '%s recibe 403',
      async (clave) => {
        expect(sesiones[clave].user.permissions).not.toContain(Capability.SUPERADMIN_ACCESS);

        await candidatos(clave).expect(403);
      },
    );
  });

  describe('coherencia entre lo que emite el token y lo que aplica el guard', () => {
    it('la capacidad declarada al iniciar sesión predice el resultado de la petición', async () => {
      // Es la propiedad de fondo de todo el modelo: si el frontend decide qué
      // mostrar con `user.permissions`, esa lista tiene que coincidir con lo
      // que el backend realmente permite. Si divergieran, el usuario vería
      // botones que devuelven 403.
      for (const clave of Object.keys(sesiones) as (keyof typeof USUARIOS_SEMBRADOS)[]) {
        const tieneCapacidad = sesiones[clave].user.permissions.includes(
          Capability.ESPECIALISTAS_READ,
        );
        const res = await como(clave);

        expect({ clave, permitido: res.status !== 403 }).toEqual({
          clave,
          permitido: tieneCapacidad,
        });
      }
    });
  });
});
