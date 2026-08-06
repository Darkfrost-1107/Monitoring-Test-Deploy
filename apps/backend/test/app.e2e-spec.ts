import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { crearAppE2E } from './bootstrap-e2e.js';

/**
 * Comprobación de que la aplicación arranca y responde.
 *
 * Esta prueba fallaba: pedía `/api/health` mientras la aplicación bajo prueba
 * servía `/health`, porque el prefijo global se aplica en `main.ts` y el montaje
 * de la prueba no lo replicaba. Se corrige usando `crearAppE2E`, que reproduce
 * la configuración de arranque.
 *
 * El montaje pasa además de `beforeEach` a `beforeAll`: levantar la aplicación
 * entera por cada caso multiplicaba el tiempo sin aportar aislamiento, porque
 * estas pruebas no mutan estado.
 */
describe('Arranque de la aplicación (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await crearAppE2E();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde el chequeo de salud bajo el prefijo /api', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(200);
  });

  it('devuelve 404 en una ruta inexistente, no un error del servidor', async () => {
    await request(app.getHttpServer()).get('/api/ruta-que-no-existe').expect(404);
  });
});
