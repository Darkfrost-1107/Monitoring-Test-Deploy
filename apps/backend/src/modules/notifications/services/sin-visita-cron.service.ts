import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { NotificationsService } from './notifications.service.js';
import { CargoNombre } from '../../../common/enums/cargo.enum.js';
import { RoleCode } from '../../../common/enums/role.enum.js';

const DIA_MS = 24 * 60 * 60 * 1000;
const DIAS_DEFAULT = 90;

@Injectable()
export class SinVisitaCronService {
  private readonly logger = new Logger(SinVisitaCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleSinVisita(): Promise<void> {
    const n = await this.ejecutarBarrido();
    this.logger.log(`Barrido "sin visita": ${n} IE(s) alertadas.`);
  }

  /** Recorre las IE activas y alerta las que llevan más de N días sin monitoreo. */
  async ejecutarBarrido(): Promise<number> {
    const dias = Number(this.config.get('ALERTA_DIAS_SIN_VISITA')) || DIAS_DEFAULT;
    const hoy = new Date();
    const umbral = new Date(hoy.getTime() - dias * DIA_MS);

    const instituciones = await this.prisma.institucionEducativa.findMany({
      where: { estado: 'Activa' },
      select: { id: true, nombre: true, distrito: true, alertaSinVisitaAt: true },
    });

    // Destinatarios de supervisión (comunes a todas): jefe_gestion + director_ugel.
    const supervisores = [
      ...(await this.usuariosDeRol(RoleCode.JEFE_GESTION)),
      ...(await this.usuariosDeRol(RoleCode.DIRECTOR_UGEL)),
    ];

    let alertadas = 0;
    for (const ie of instituciones) {
      const ultima = await this.prisma.cronograma.findFirst({
        where: { institucionId: ie.id, estado: 'COMPLETADO' },
        orderBy: { fechaProgramada: 'desc' },
        select: { fechaProgramada: true },
      });
      const ultimaVisita = ultima?.fechaProgramada ?? null;
      const vencida = !ultimaVisita || ultimaVisita < umbral;
      if (!vencida) continue;

      // Dedup: no re-alertar si ya se alertó dentro de la ventana de N días.
      if (ie.alertaSinVisitaAt && ie.alertaSinVisitaAt >= umbral) continue;

      const diasSin = ultimaVisita
        ? Math.floor((hoy.getTime() - ultimaVisita.getTime()) / DIA_MS)
        : null;
      const mensaje = diasSin
        ? `La IE ${ie.nombre} (${ie.distrito}) lleva ${diasSin} días sin monitoreo. Requiere programar una visita.`
        : `La IE ${ie.nombre} (${ie.distrito}) no registra monitoreos. Requiere programar una visita.`;

      const directorIe = await this.directorDeIe(ie.id);
      const destinatarios = [...supervisores, ...(directorIe ? [directorIe] : [])];

      await this.notifications.crearNotificaciones(destinatarios, {
        tipo: 'IE_SIN_VISITA',
        titulo: `IE sin visita: ${ie.nombre}`,
        mensaje,
        institucionId: ie.id,
      });
      await this.prisma.institucionEducativa.update({
        where: { id: ie.id },
        data: { alertaSinVisitaAt: hoy },
      });
      alertadas += 1;
    }
    return alertadas;
  }

  private async usuariosDeRol(
    codigo: string,
  ): Promise<{ usuarioId: string; correo: string | null }[]> {
    const usuarios = await this.prisma.usuario.findMany({
      where: { rol: { codigo }, isActive: true },
      select: { id: true, persona: { select: { correo: true } } },
    });
    return usuarios.map((u) => ({ usuarioId: u.id, correo: u.persona.correo }));
  }

  private async directorDeIe(
    institucionId: string,
  ): Promise<{ usuarioId: string; correo: string | null } | null> {
    const docente = await this.prisma.docente.findFirst({
      where: {
        institucionId,
        docenteCargos: { some: { cargo: { nombre: CargoNombre.DIRECTOR }, fechaFin: null } },
      },
      select: {
        persona: { select: { correo: true, usuario: { select: { id: true } } } },
      },
    });
    if (!docente?.persona.usuario) return null;
    return { usuarioId: docente.persona.usuario.id, correo: docente.persona.correo };
  }
}
