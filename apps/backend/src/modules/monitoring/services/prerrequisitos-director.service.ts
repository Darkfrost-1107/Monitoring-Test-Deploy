import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { SessionUser } from '../../../shared/types/session-user.js';
import {
  motivoPrerrequisitosPendientes,
  prerrequisitosCumplidos,
  rolRequierePrerrequisitos,
  type EstadoPrerrequisitos,
} from './prerrequisitos-director.helper.js';

/**
 * Guarda que el director de la I.E. haya sentado las bases del monitoreo.
 *
 * El Coordinador Pedagógico y el Jefe de Taller no pueden subir su plan anual,
 * crear su plantilla ni programar cronograma hasta que el director de su I.E.
 * tenga un Plan de Monitoreo Anual activo del año en curso. La regla de quién
 * está sujeto y qué falta vive en el helper puro; acá se consulta el artefacto.
 *
 * El sello del autor es `'director_ie'` —lo pone `resolveAutor` al crear—, de
 * modo que el plan del propio Coordinador no destraba al Jefe de Taller ni al
 * revés: el que abre la puerta es el director.
 */
@Injectable()
export class PrerrequisitosDirectorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lanza 403 si esta sesión debe esperar al director y él aún no cumplió.
   *
   * No hace nada para el director, la UGEL ni una sesión sin institución: la
   * regla es sólo del Coordinador y el Jefe de Taller.
   */
  async asegurar(session: SessionUser): Promise<void> {
    if (!rolRequierePrerrequisitos(session.role) || !session.institucionId) return;

    const estado = await this.estadoDeLaInstitucion(session.institucionId);
    if (!prerrequisitosCumplidos(estado)) {
      throw new ForbiddenException(motivoPrerrequisitosPendientes(estado));
    }
  }

  private async estadoDeLaInstitucion(institucionId: string): Promise<EstadoPrerrequisitos> {
    const plan = await this.prisma.planMonitoreo.findFirst({
      where: {
        institucionId,
        anioAcademico: new Date().getFullYear(),
        rolAutorAlCrear: 'director_ie',
        estado: 'Activo',
        deleted: false,
      },
      select: { id: true },
    });

    return { tienePlan: plan !== null };
  }
}
