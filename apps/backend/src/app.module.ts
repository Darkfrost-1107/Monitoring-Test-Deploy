import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { validate } from './config/env.validation.js';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlePorUsuarioGuard } from './shared/guards/throttle-por-usuario.guard.js';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HealthModule } from './shared/health/health.module.js';
import { PrismaModule } from './shared/prisma/prisma.module.js';
import { StorageModule } from './shared/storage/storage.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { TeachersModule } from './modules/teachers/teachers.module.js';
import { InstitutionsModule } from './modules/institutions/institutions.module.js';
import { EspecialistasModule } from './modules/especialistas/especialistas.module.js';
import { CatalogsModule } from './modules/catalogs/catalogs.module.js';
import { MonitoringModule } from './modules/monitoring/monitoring.module.js';
import { SchedulingModule } from './modules/scheduling/scheduling.module.js';
import { EvaluationsModule } from './modules/evaluations/evaluations.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { SuperuserModule } from './modules/superuser/superuser.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { VisitRequestsModule } from './modules/visit-requests/visit-requests.module.js';
import { CarpetaPedagogicaModule } from './modules/carpeta-pedagogica/carpeta-pedagogica.module.js';
import { SolicitudesPlantillaModule } from './modules/solicitudes-plantilla/solicitudes-plantilla.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env', './apps/backend/.env'],
      validate,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true, colorize: true } }
            : undefined,
        autoLogging: false,
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    PrismaModule,
    StorageModule,
    HealthModule,
    AuthModule,
    TeachersModule,
    InstitutionsModule,
    EspecialistasModule,
    CatalogsModule,
    MonitoringModule,
    SchedulingModule,
    EvaluationsModule,
    ReportsModule,
    SuperuserModule,
    DashboardModule,
    NotificationsModule,
    VisitRequestsModule,
    CarpetaPedagogicaModule,
    SolicitudesPlantillaModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlePorUsuarioGuard,
    },
  ],
})
export class AppModule {}
