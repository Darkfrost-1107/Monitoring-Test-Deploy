import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { PrismaClientExceptionFilter } from './common/filters/prisma-client-exception.filter.js';
import { esDescargaPublica } from './shared/storage/descarga-publica.js';

import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import express from 'express';
import path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // `validate()` (config/env.validation.ts) garantiza que estas claves existen:
  // aplica los valores por defecto o aborta el arranque. Un `??` aquí sería un
  // segundo valor por defecto, capaz de divergir del declarado en la validación.
  const configService = app.get(ConfigService);
  const frontendUrl = configService.getOrThrow<string>('FRONTEND_URL');
  const port = configService.getOrThrow<number>('PORT');
  const host = configService.getOrThrow<string>('HOST');

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  app.useLogger(app.get(Logger));

  app.use(helmet());
  app.use(cookieParser());

  /**
   * Nada de `uploads/` se sirve sin sesión.
   *
   * `express.static` no pide sesión: todo lo que quedaba bajo ese directorio
   * era descargable por cualquiera que conociera la URL. Se cerró primero para
   * las firmas manuscritas y después para los justificantes de solicitud, cada
   * vez agregando una exclusión —y cada archivo nuevo nacía público hasta que
   * alguien se acordaba de sumarlo—.
   *
   * La regla está invertida: `esDescargaPublica` declara lo que SÍ se publica,
   * y hoy no publica nada. Los archivos se entregan por endpoints que validan
   * la sesión: las firmas por el suyo, los planes por el de plan de monitoreo,
   * y el resto por `GET /api/archivos/:cajon/:nombre`.
   *
   * El estático se conserva detrás de la comprobación en lugar de retirarse,
   * para que publicar algo en el futuro sea agregar un patrón y no volver a
   * montar el middleware.
   */
  app.use('/uploads', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (esDescargaPublica(req.path)) {
      next();
      return;
    }
    res.status(404).end();
  });
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new PrismaClientExceptionFilter(httpAdapter));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Sistema de Monitoreo API')
    .setDescription('API documentada para el Sistema de Monitoreo UGEL')
    .setVersion('1.0')
    .addCookieAuth('refreshToken')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port, host);
  const logger = app.get(Logger);
  logger.log(`Backend running on ${await app.getUrl()}/api`);
}

void bootstrap();
