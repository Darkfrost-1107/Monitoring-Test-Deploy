import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { PrismaClientExceptionFilter } from './common/filters/prisma-client-exception.filter.js';

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
