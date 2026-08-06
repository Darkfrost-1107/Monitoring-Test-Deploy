import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter?: nodemailer.Transporter;
  private readonly emailFrom: string;

  constructor(private readonly configService: ConfigService) {
    this.emailFrom = this.configService.get<string>('EMAIL_FROM') ?? 'no-reply@ugel-lampa.gob.pe';
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT') ?? 1025;
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host) {
      this.logger.log(`Inicializando transportador SMTP: ${host}:${port}`);

      const auth = user && pass ? { user, pass } : undefined;

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // True for 465, false for others
        auth,
        tls: {
          rejectUnauthorized: false, // Permite certificados autofirmados en local
        },
      });
    } else {
      this.logger.warn(
        'SMTP_HOST no configurado. Los correos se imprimirán únicamente en la consola de desarrollo.',
      );
    }
  }

  async sendMail(
    to: string,
    subject: string,
    text: string,
    html: string,
    attachments?: nodemailer.SendMailOptions['attachments'],
  ): Promise<void> {
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.emailFrom,
          to,
          subject,
          text,
          html,
          attachments,
        });
        this.logger.log(`Correo enviado exitosamente a: ${to}`);
      } catch (error) {
        this.logger.error(`Fallo al enviar correo a ${to}:`, error);
        throw error;
      }
    } else {
      this.logger.log(`
┌────────────────────────────────────────────────────────┐
│ [DEV ONLY MAIL OUTPUT]
├────────────────────────────────────────────────────────┤
│ De: ${this.emailFrom}
│ Para: ${to}
│ Asunto: ${subject}
├────────────────────────────────────────────────────────┤
│ Contenido de Texto:
│ ${text}
└────────────────────────────────────────────────────────┘
      `);
    }
  }

  async sendPasswordResetEmail(to: string, dni: string, token: string): Promise<void> {
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
    const resetUrl = `${frontendUrl}/restablecer-password?token=${token}`;

    const subject = 'Recuperación de Contraseña - UGEL Lampa';
    const text =
      `Hola, se ha solicitado un restablecimiento de contraseña para el DNI ${dni}.\n\n` +
      `Para restablecerla, ingrese al siguiente enlace en su navegador:\n${resetUrl}\n\n` +
      `Este enlace expira en 1 hora. Si no solicitó este cambio, ignore este correo.`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #1e3a8f; margin: 0;">UGEL Lampa</h2>
          <p style="color: #64748b; font-size: 14px; margin: 5px 0 0 0;">Sistema de Monitoreo</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">Hola,</p>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">Se ha solicitado una recuperación de contraseña para la cuenta vinculada al DNI <strong>${dni}</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; font-size: 15px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">
            Restablecer Contraseña
          </a>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
          También puede copiar y pegar el siguiente enlace en su navegador: <br />
          <a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a>
        </p>
        <p style="color: #ef4444; font-size: 13px; font-weight: 500; margin-top: 20px;">
          * Este enlace es de un solo uso y expirará en exactamente 1 hora.
        </p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
          Este correo fue generado de forma automática. Por favor no responder a este remitente.
        </p>
      </div>
    `;

    await this.sendMail(to, subject, text, html);
  }

  async sendCronogramaVencidoEmail(
    to: string,
    fecha: string,
    institucion: string,
    docente: string,
  ): Promise<void> {
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
    const loginUrl = `${frontendUrl}/login`;

    const subject = 'Recordatorio de Visita Pendiente - UGEL Lampa';
    const text =
      `Hola, le recordamos que la visita programada para el ${fecha} en la I.E. ${institucion} (Docente: ${docente}) se encuentra pendiente de ejecución.\n\n` +
      `Por favor, ingrese al sistema para registrar la ficha o reprogramar la visita:\n${loginUrl}\n`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #1e3a8f; margin: 0;">UGEL Lampa</h2>
          <p style="color: #64748b; font-size: 14px; margin: 5px 0 0 0;">Sistema de Monitoreo - Alerta Automática</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">Estimado Monitor,</p>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">Le recordamos que tiene una visita pendiente (vencida) que no ha sido completada ni reprogramada:</p>
        <ul style="color: #334155; font-size: 14px;">
          <li><strong>Fecha Programada:</strong> ${fecha}</li>
          <li><strong>Institución Educativa:</strong> ${institucion}</li>
          <li><strong>Docente Evaluado:</strong> ${docente}</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; font-size: 15px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">
            Ir al Sistema
          </a>
        </div>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
          Este es un aviso automático generado por el Sistema de Monitoreo.
        </p>
      </div>
    `;

    await this.sendMail(to, subject, text, html);
  }

  async sendResumenFichaEmail(
    to: string,
    docenteNombre: string,
    pdfBuffer: Buffer,
    pdfFileName: string,
  ): Promise<void> {
    const subject = 'Resultado de Ficha de Monitoreo - UGEL Lampa';
    const text =
      `Estimado(a) ${docenteNombre},\n\n` +
      `Adjunto encontrará el informe en PDF con los resultados de su Ficha de Monitoreo.\n\n` +
      `Atentamente,\nUGEL Lampa`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #1e3a8f; margin: 0;">UGEL Lampa</h2>
          <p style="color: #64748b; font-size: 14px; margin: 5px 0 0 0;">Sistema de Monitoreo</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">Estimado(a) <strong>${docenteNombre}</strong>,</p>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">Su visita de monitoreo pedagógico ha concluido exitosamente y los resultados han sido registrados en el sistema.</p>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">Adjunto a este correo encontrará un documento <strong>PDF oficial</strong> con el detalle de los niveles de logro alcanzados, sugerencias y compromisos de mejora establecidos.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
          Este es un aviso automático generado por el Sistema de Monitoreo. Por favor no responder a este remitente.
        </p>
      </div>
    `;

    const attachments = [
      {
        filename: pdfFileName,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ];

    await this.sendMail(to, subject, text, html, attachments);
  }
}
