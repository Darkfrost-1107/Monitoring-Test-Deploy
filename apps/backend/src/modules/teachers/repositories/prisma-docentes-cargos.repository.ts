import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import {
  DocentesCargosRepository,
  DocenteCargoRow,
  DocentePersonaInfo,
  FinalizeCargoParams,
} from './docentes-cargos.repository.js';
import { CargoNombre } from '../../../shared/auth/capability-map.js';

@Injectable()
export class PrismaDocentesCargosRepository implements DocentesCargosRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findDocenteExistence(docenteId: string): Promise<boolean> {
    const docente = await this.prisma.docente.findUnique({
      where: { id: docenteId },
      select: { id: true },
    });
    return docente !== null;
  }

  async findCargoByNombre(nombre: string): Promise<{ id: string; nombre: string } | null> {
    return this.prisma.cargo.findFirst({
      where: { nombre },
      select: { id: true, nombre: true },
    });
  }

  async findDocenteCargoWithCargo(id: string): Promise<DocenteCargoRow | null> {
    const record = await this.prisma.docenteCargo.findUnique({
      where: { id },
      include: { cargo: true },
    });
    if (!record) return null;
    return record;
  }

  async findActiveDocenteCargosWithCargo(docenteId: string): Promise<DocenteCargoRow[]> {
    const records = await this.prisma.docenteCargo.findMany({
      where: { docenteId, fechaFin: null },
      include: { cargo: true },
    });
    return records;
  }

  async findActiveCargoNombresByDocenteId(docenteId: string): Promise<CargoNombre[]> {
    const records = await this.prisma.docenteCargo.findMany({
      where: { docenteId, fechaFin: null },
      include: { cargo: true },
    });
    return records.filter((dc) => dc.cargo?.nombre).map((dc) => dc.cargo.nombre as CargoNombre);
  }

  async findAllCargosByDocenteId(docenteId: string): Promise<DocenteCargoRow[]> {
    const records = await this.prisma.docenteCargo.findMany({
      where: { docenteId },
      include: { cargo: true },
      orderBy: [{ fechaFin: 'asc' }, { fechaInicio: 'desc' }],
    });
    return records;
  }

  async findDocentePersonaInfo(docenteId: string): Promise<DocentePersonaInfo | null> {
    const docente = await this.prisma.docente.findUnique({
      where: { id: docenteId },
      select: {
        personaId: true,
        persona: {
          select: {
            usuario: { select: { id: true } },
            especialista: { select: { id: true } },
          },
        },
      },
    });
    if (!docente) return null;
    return {
      personaId: docente.personaId,
      usuarioId: docente.persona?.usuario?.id ?? null,
      especialistaId: docente.persona?.especialista?.id ?? null,
    };
  }

  async findUserIdByDocenteId(docenteId: string): Promise<string | null> {
    const docente = await this.prisma.docente.findUnique({
      where: { id: docenteId },
      select: { persona: { select: { usuario: { select: { id: true } } } } },
    });
    return docente?.persona?.usuario?.id ?? null;
  }

  async addCargo(
    docenteId: string,
    cargoId: string,
    fechaInicio: Date,
    esPrincipal: boolean,
  ): Promise<DocenteCargoRow> {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.docenteCargo.create({
        data: {
          id: randomUUID(),
          docenteId,
          cargoId,
          fechaInicio,
          fechaFin: null,
          esPrincipal,
        },
        include: { cargo: true },
      });

      if (esPrincipal) {
        await tx.docenteCargo.updateMany({
          where: {
            docenteId,
            fechaFin: null,
            NOT: { id: created.id },
          },
          data: { esPrincipal: false },
        });
      }

      return created;
    });
  }

  async finalizeCargo(params: FinalizeCargoParams): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.docenteCargo.update({
        where: { id: params.cargoId },
        data: { fechaFin: params.fechaFin },
      });

      if (params.principalPromotionTargetId) {
        await tx.docenteCargo.update({
          where: { id: params.principalPromotionTargetId },
          data: { esPrincipal: true },
        });
      }

      if (params.roleUpdate) {
        const role = await tx.role.findFirst({
          where: { codigo: params.roleUpdate.roleCodigo },
        });
        if (role) {
          await tx.usuario.update({
            where: { id: params.roleUpdate.usuarioId },
            data: { rolId: role.id },
          });
        }
      }

      if (params.docenteUpdate) {
        await tx.docente.update({
          where: { id: params.docenteId },
          data: {
            estado: params.docenteUpdate.estado,
            institucionId: params.docenteUpdate.institucionId,
          },
        });
      }

      if (params.especialistaUpdate) {
        await tx.especialista.update({
          where: { id: params.especialistaUpdate.especialistaId },
          data: {
            cargo: params.especialistaUpdate.cargo,
            estado: params.especialistaUpdate.estado,
          },
        });
      }

      if (params.monitorEspecialistaId) {
        const pendingVisits = await tx.cronograma.findMany({
          where: {
            monitorId: params.monitorEspecialistaId,
            estado: { in: ['PROGRAMADO', 'EN_PROCESO', 'REPROGRAMADO'] },
          },
        });

        for (const visit of pendingVisits) {
          const currentDetails = visit.detalles ? `${visit.detalles}\n` : '';
          await tx.cronograma.update({
            where: { id: visit.id },
            data: {
              estado: 'CANCELADO',
              detalles: `${currentDetails}Visita cancelada automáticamente por finalización del cargo de monitor.`,
            },
          });
        }
      }
    });
  }
}
