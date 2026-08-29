import { Module } from '@nestjs/common';
import { NotificationsController } from './controllers/notifications.controller.js';
import { NotificationsService } from './services/notifications.service.js';
import { SinVisitaCronService } from './services/sin-visita-cron.service.js';
import { VisitaDeHoyCronService } from './services/visita-de-hoy-cron.service.js';
import { ReprogramacionEventsListener } from './listeners/reprogramacion-events.listener.js';
import { SolicitudPlantillaEventsListener } from './listeners/solicitud-plantilla-events.listener.js';
import { PrismaModule } from '../../shared/prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { MailerModule } from '../../shared/mailer/mailer.module.js';

@Module({
  imports: [PrismaModule, AuthModule, MailerModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    SinVisitaCronService,
    VisitaDeHoyCronService,
    ReprogramacionEventsListener,
    SolicitudPlantillaEventsListener,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
