import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { CreateDocenteDto } from '../dto/create-docente.dto.js';
import { UpdateDocenteDto } from '../dto/update-docente.dto.js';
import { DocenteCargo } from '../../../generated/prisma/client.js';
import {
  AsignacionConflicto,
  DocenteEntity,
  DocenteFilter,
  RestablecerContrasenaData,
  TeachersRepository,
  UsuarioDePersona,
} from './teachers.repository.js';
import { findUsuarioPorPersonaId, restablecerContrasena } from './docente-contrasena.helper.js';
import { findDocenteById, findDocentes, findPersonaByDni } from './docente-read.helper.js';
import { updateDocenteEstado, bajaDirector } from './docente-update-estado.helper.js';
import { createDocenteWithTransaction } from './docente-create.helper.js';
import { updateDocenteWithTransaction } from './docente-update.helper.js';
import { transicionEspecialistaADocente } from './transicion-rol.helper.js';

@Injectable()
export class PrismaTeachersRepository implements TeachersRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  async findDocenteById(id: string): Promise<DocenteEntity | null> {
    return findDocenteById(this.prisma, id);
  }

  async findPersonaByDni(dni: string): Promise<any> {
    return findPersonaByDni(this.prisma, dni);
  }

  async findDocentes(filter?: DocenteFilter): Promise<DocenteEntity[]> {
    return findDocentes(this.prisma, filter);
  }

  async updateDocenteEstado(id: string, estado: string): Promise<DocenteEntity> {
    return updateDocenteEstado(this.prisma, id, estado);
  }

  async bajaDirector(id: string): Promise<DocenteEntity> {
    return bajaDirector(this.prisma, id);
  }

  async createDocenteWithTransaction(dto: CreateDocenteDto): Promise<DocenteEntity> {
    return createDocenteWithTransaction(this.prisma, this.configService, dto);
  }

  async updateDocenteWithTransaction(
    id: string,
    dto: UpdateDocenteDto,
    activeCargo: DocenteCargo | null,
    personaId: string,
  ): Promise<DocenteEntity> {
    return updateDocenteWithTransaction(this.prisma, id, dto, activeCargo, personaId);
  }

  async transicionEspecialistaADocente(
    personaId: string,
    dto: CreateDocenteDto,
    rolDocenteId: string,
  ): Promise<DocenteEntity> {
    return transicionEspecialistaADocente(this.prisma, personaId, dto, rolDocenteId);
  }

  async getAsignacionesActivas(evaluadorId: string): Promise<any[]> {
    return this.prisma.asignacionEvaluador.findMany({
      where: {
        evaluadorId,
        isActive: true,
      },
      include: {
        evaluado: {
          include: {
            persona: true,
          },
        },
      },
    });
  }

  async syncAsignaciones(evaluadorId: string, evaluadoIds: string[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 1. Obtener asignaciones activas actuales
      const activas = await tx.asignacionEvaluador.findMany({
        where: {
          evaluadorId,
          isActive: true,
        },
      });

      const activasIds = activas.map((a) => a.evaluadoId);

      // 2. Determinar cuáles desactivar (están en activas pero no en evaluadoIds)
      const aDesactivar = activas.filter((a) => !evaluadoIds.includes(a.evaluadoId));
      if (aDesactivar.length > 0) {
        await tx.asignacionEvaluador.updateMany({
          where: {
            id: { in: aDesactivar.map((a) => a.id) },
          },
          data: {
            isActive: false,
            fechaFin: new Date(),
          },
        });
      }

      // 3. Determinar cuáles crear (están en evaluadoIds pero no en activas)
      const aCrearIds = evaluadoIds.filter((id) => !activasIds.includes(id));
      if (aCrearIds.length > 0) {
        await tx.asignacionEvaluador.createMany({
          data: aCrearIds.map((evaluadoId) => ({
            evaluadorId,
            evaluadoId,
            isActive: true,
            fechaInicio: new Date(),
          })),
        });
      }
    });
  }

  async checkAsignacionesConflict(
    evaluadorId: string,
    evaluadoIds: string[],
  ): Promise<AsignacionConflicto[]> {
    return this.prisma.asignacionEvaluador.findMany({
      where: {
        evaluadoId: { in: evaluadoIds },
        evaluadorId: { not: evaluadorId },
        isActive: true,
      },
      include: {
        evaluador: {
          include: {
            persona: true,
          },
        },
        evaluado: {
          include: {
            persona: true,
          },
        },
      },
    });
  }

  async findUsuarioPorPersonaId(personaId: string): Promise<UsuarioDePersona | null> {
    return findUsuarioPorPersonaId(this.prisma, personaId);
  }

  async restablecerContrasena(data: RestablecerContrasenaData): Promise<void> {
    return restablecerContrasena(this.prisma, data);
  }
}
