import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../services/notifications.service.js';

/**
 * Avisos del trámite de plantillas propias.
 *
 * El pedido tenía las dos puntas mudas: el director presentaba su solicitud y
 * nadie en la Jefatura se enteraba hasta que alguien abría la bandeja por su
 * cuenta; y una vez resuelta, el director tampoco sabía si podía crear su ficha
 * o si le habían dicho que no. Un trámite que sólo avanza si alguien se acuerda
 * de mirar no es un trámite.
 *
 * Se procesa fuera de la respuesta HTTP (`{ async: true }`), igual que las
 * reprogramaciones: presentar una solicitud no debe esperar a que salgan los
 * correos.
 */
export interface SolicitudPlantillaCreadaEvent {
  solicitudId: string;
}

export interface SolicitudPlantillaResueltaEvent {
  solicitudId: string;
  resolutorId: string;
  estado: 'APROBADA' | 'RECHAZADA';
}

@Injectable()
export class SolicitudPlantillaEventsListener {
  constructor(private readonly notifications: NotificationsService) {}

  @OnEvent('solicitud-plantilla.creada', { async: true })
  async onCreada(event: SolicitudPlantillaCreadaEvent) {
    await this.notifications.notificarSolicitudPlantillaCreada(event.solicitudId);
  }

  @OnEvent('solicitud-plantilla.resuelta', { async: true })
  async onResuelta(event: SolicitudPlantillaResueltaEvent) {
    await this.notifications.notificarSolicitudPlantillaResuelta(
      event.solicitudId,
      event.resolutorId,
      event.estado,
    );
  }
}
