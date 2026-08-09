import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { NotificationsService } from './notifications.service.js';

/**
 * Aviso de las visitas programadas para hoy.
 *
 * El sistema notificaba reprogramaciones, solicitudes y alertas de desempeño,
 * pero no lo más cotidiano: que a alguien le toca salir a monitorear hoy. La
 * agenda había que ir a buscarla al calendario.
 *
 * Se emite a primera hora y sólo a quien tiene la visita asignada. Una
 * notificación por visita y no un resumen: cada una lleva su institución y su
 * hora, que es lo que la hace accionable.
 */

/** Formato local de la hora programada, sin arrastrar la zona del servidor. */
const horaDe = (fecha: Date): string =>
  `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;

@Injectable()
export class VisitaDeHoyCronService {
  private readonly logger = new Logger(VisitaDeHoyCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async handleVisitasDeHoy(): Promise<void> {
    const n = await this.avisarVisitasDeHoy();
    this.logger.log(`Aviso de agenda: ${n} visita(s) del día notificadas.`);
  }

  /**
   * Avisa a cada monitor las visitas que tiene programadas para hoy.
   *
   * Sólo las que siguen en pie: una visita completada o cancelada no necesita
   * recordatorio, y una reprogramada ya avisó por su propio camino.
   */
  async avisarVisitasDeHoy(): Promise<number> {
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);

    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 1);

    const visitas = await this.prisma.cronograma.findMany({
      where: {
        fechaProgramada: { gte: inicio, lt: fin },
        estado: { in: ['PROGRAMADO', 'REPROGRAMADO'] },
      },
      select: {
        fechaProgramada: true,
        institucion: { select: { nombre: true } },
        monitor: {
          select: {
            persona: {
              select: { correo: true, usuario: { select: { id: true } } },
            },
          },
        },
      },
    });

    let avisadas = 0;

    for (const visita of visitas) {
      const usuarioId = visita.monitor?.persona?.usuario?.id;
      // Sin usuario no hay a quién avisarle: la visita está asignada a un
      // especialista que todavía no tiene cuenta.
      if (!usuarioId) continue;

      const institucion = visita.institucion?.nombre ?? 'la institución asignada';
      const hora = horaDe(visita.fechaProgramada);

      await this.notifications.crearNotificaciones(
        [{ usuarioId, correo: visita.monitor?.persona?.correo }],
        {
          tipo: 'VISITA_DE_HOY',
          titulo: 'Monitoreo programado para hoy',
          mensaje: `Hoy le corresponde monitorear en ${institucion} a las ${hora}.`,
        },
      );

      avisadas += 1;
    }

    return avisadas;
  }
}
