import { Injectable, Logger } from '@nestjs/common';
import { ReporteService } from '../services/reporte.service.js';
import { MailerService } from '../../../shared/mailer/mailer.service.js';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { SessionUser } from '../../../shared/types/session-user.js';

interface FichaFinalizadaEvent {
  fichaId: string;
  session: SessionUser;
}

@Injectable()
export class FichaFinalizadaListener {
  private readonly logger = new Logger(FichaFinalizadaListener.name);

  constructor(
    private readonly reporteService: ReporteService,
    private readonly mailerService: MailerService,
    private readonly prisma: PrismaService,
  ) {}

  // @OnEvent('ficha.finalizada', { async: true })
  async handleFichaFinalizada(event: FichaFinalizadaEvent) {
    this.logger.log(`Procesando evento ficha.finalizada para ficha ${event.fichaId}`);

    try {
      // 1. Obtener la data (a traves de Prisma directo para sacar el correo del evaluado)
      const ficha = await this.prisma.fichaMonitoreo.findUnique({
        where: { id: event.fichaId },
        include: {
          cronograma: {
            include: {
              evaluado: {
                include: {
                  persona: true,
                },
              },
            },
          },
        },
      });

      if (!ficha) {
        this.logger.error(`Ficha ${event.fichaId} no encontrada al procesar el evento.`);
        return;
      }

      const docente = ficha.cronograma.evaluado.persona;
      const email = docente.correo;
      const nombreCompleto = `${docente.nombres} ${docente.apellidos}`;
      const usuarioId = event.session.id;

      if (!email) {
        this.logger.warn(`El docente ${nombreCompleto} no tiene correo. Abortando envio.`);
        // Opcional: Registrar en LogAuditoria el error de correo faltante
        await this.logAuditoria(
          usuarioId,
          'EMAIL_ENVIADO',
          'FALLO: El docente no tiene correo asignado.',
        );
        return;
      }

      // 2. Generar el PDF usando el ReporteService
      const pdfBuffer = await this.reporteService.exportarFichaPDF(event.fichaId, event.session);
      const fileName = `Ficha_Monitoreo_${ficha.id.split('-')[0]}.pdf`;

      // 3. Enviar el correo
      await this.mailerService.sendResumenFichaEmail(email, nombreCompleto, pdfBuffer, fileName);
      this.logger.log(`Correo enviado exitosamente al docente ${nombreCompleto} (${email})`);

      // 4. Registrar en LogAuditoria
      await this.logAuditoria(
        usuarioId,
        'EMAIL_ENVIADO',
        `Correo con PDF enviado exitosamente a ${email} para la ficha ${ficha.id}.`,
      );
    } catch (error) {
      this.logger.error(
        `Error al procesar el envío de correo para la ficha ${event.fichaId}`,
        error,
      );
      try {
        await this.logAuditoria(
          event.session.id,
          'EMAIL_ENVIADO',
          `FALLO: Error al enviar correo - ${error instanceof Error ? error.message : String(error)}`,
        );
      } catch (logError) {
        this.logger.error('Error al intentar guardar el log de fallo', logError);
      }
    }
  }

  private async logAuditoria(usuarioId: string, eventType: string, eventDetail: string) {
    await this.prisma.logAuditoria.create({
      data: {
        usuarioId,
        eventType,
        eventDetail,
      },
    });
  }
}
