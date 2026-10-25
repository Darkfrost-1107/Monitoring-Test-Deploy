import { Body, Controller, Post } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configurarLimiteDeCuerpo } from './limite-cuerpo.js';

/**
 * Las fotos de evidencia viajan como texto base64 dentro del JSON de «finalizar».
 * Con el límite por defecto de Express (100 KB) una sola foto ya rozaba el tope y
 * tres lo superaban: el monitor no podía cerrar la ficha con sus evidencias.
 */

@Controller('eco')
class EcoController {
  @Post()
  recibir(@Body() cuerpo: { datos: string }) {
    return { bytes: cuerpo.datos.length };
  }
}

describe('configurarLimiteDeCuerpo', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ controllers: [EcoController] }).compile();
    app = modulo.createNestApplication<NestExpressApplication>();
    configurarLimiteDeCuerpo(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const enviar = (bytes: number) =>
    request(app.getHttpServer())
      .post('/eco')
      .send({ datos: 'a'.repeat(bytes) });

  it('acepta el cuerpo de tres fotos comprimidas, que superaba los 100 KB', async () => {
    const respuesta = await enviar(288_000);

    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toEqual({ bytes: 288_000 });
  });

  it('sigue rechazando un cuerpo desmesurado', async () => {
    const respuesta = await enviar(3 * 1024 * 1024);

    expect(respuesta.status).toBe(413);
  });
});
