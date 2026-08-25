import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  IMonitoringPlanResponse,
  IPlanInstitucionCubierta,
} from '@sistema-monitoreo/shared-contracts';
import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { CreatePlanData, MonitoringPlanRepository } from './monitoring-plan.repository.js';
import type { QueryPlanDto } from '../dto/query-plan.dto.js';
import { fromPrismaPlan, type PlanMonitoreoPayload } from './monitoring-plan.mapper.js';

@Injectable()
export class PrismaMonitoringPlanRepository implements MonitoringPlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async buildResponse(plan: PlanMonitoreoPayload): Promise<IMonitoringPlanResponse> {
    return fromPrismaPlan(this.prisma, plan);
  }

  async findAll(filters?: QueryPlanDto): Promise<IMonitoringPlanResponse[]> {
    const where: Prisma.PlanMonitoreoWhereInput = { deleted: false };
    if (filters) {
      if (filters.search) {
        where.titulo = { contains: filters.search, mode: 'insensitive' };
      }
      if (filters.anioAcademico !== undefined) {
        where.anioAcademico = filters.anioAcademico;
      }
      if (filters.tipoEntidad !== undefined) {
        where.tipoEntidad = filters.tipoEntidad;
      }
      if (filters.estado !== undefined) {
        where.estado = filters.estado;
      }
      if (filters.institucionId !== undefined) {
        where.OR = [{ institucionId: filters.institucionId }, { tipoEntidad: 'UGEL' }];
      }
    }

    const plans = await this.prisma.planMonitoreo.findMany({
      where,
      include: {
        institucion: {
          select: { nombre: true, codigoModular: true },
        },
        autor: {
          select: { persona: { select: { nombres: true, apellidos: true } } },
        },
      },
      orderBy: [{ anioAcademico: 'desc' }, { createdAt: 'desc' }],
    });
    return Promise.all(plans.map((p) => this.buildResponse(p)));
  }

  async findById(id: string): Promise<IMonitoringPlanResponse | null> {
    const plan = await this.prisma.planMonitoreo.findFirst({
      where: { id, deleted: false },
      include: {
        institucion: {
          select: { nombre: true, codigoModular: true },
        },
        autor: {
          select: { persona: { select: { nombres: true, apellidos: true } } },
        },
      },
    });
    if (!plan) return null;
    return this.buildResponse(plan);
  }

  async create(data: CreatePlanData): Promise<IMonitoringPlanResponse> {
    const plan = await this.prisma.planMonitoreo.create({
      data: {
        titulo: data.titulo,
        anioAcademico: data.anioAcademico,
        tipoEntidad: data.tipoEntidad,
        archivoUrl: data.archivoUrl,
        estado: data.estado,
        autorId: data.autorId,
        rolAutorAlCrear: data.rolAutorAlCrear,
        institucionId: data.institucionId,
      },
      // Se incluye el autor igual que en findAll/findById: sin él, la respuesta
      // del POST llega sin `autorNombre` y la tarjeta recién creada muestra sólo
      // el cargo («Coordinador Pedagógico») en vez de «Cargo — Nombre».
      include: {
        institucion: { select: { nombre: true, codigoModular: true } },
        autor: { select: { persona: { select: { nombres: true, apellidos: true } } } },
      },
    });

    if (data.institucionId) {
      await this.prisma.planCoberturaIe.create({
        data: { planId: plan.id, institucionId: data.institucionId },
      });
    }

    return this.buildResponse(plan);
  }

  async softDelete(id: string): Promise<IMonitoringPlanResponse> {
    const existing = await this.prisma.planMonitoreo.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Plan de monitoreo con ID ${id} no encontrado.`);
    }
    const newEstado = existing.estado === 'Activo' ? 'Inactivo' : 'Activo';
    const plan = await this.prisma.planMonitoreo.update({
      where: { id },
      data: { estado: newEstado },
    });
    return this.buildResponse(plan);
  }

  async contarDependencias(
    planId: string,
    institucionId: string | null | undefined,
    anioAcademico: number,
  ): Promise<{ plantillasVigentes: number; cronogramas: number }> {
    const [plantillasVigentes, cronogramas] = await Promise.all([
      // Las plantillas no referencian al plan: cuelgan de la institución y el año.
      institucionId
        ? this.prisma.plantillaMonitoreo.count({
            where: { institucionId, anioAcademico, estado: 'Vigente', deleted: false },
          })
        : Promise.resolve(0),
      // Los cronogramas sí apuntan al plan. No cuentan los que ya no están en
      // juego: un cronograma anulado o cancelado no lo sostiene.
      this.prisma.cronograma.count({
        where: { planId, estado: { notIn: ['ANULADO', 'CANCELADO'] } },
      }),
    ]);
    return { plantillasVigentes, cronogramas };
  }

  async hardDelete(id: string): Promise<boolean> {
    const existing = await this.prisma.planMonitoreo.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Plan de monitoreo con ID ${id} no encontrado.`);
    }
    await this.prisma.$transaction(async (tx) => {
      // First delete dependent coverage
      await tx.planCoberturaIe.deleteMany({ where: { planId: id } });
      // Then delete the plan
      await tx.planMonitoreo.delete({ where: { id } });
    });
    return true;
  }

  async restore(id: string): Promise<IMonitoringPlanResponse> {
    const existing = await this.prisma.planMonitoreo.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Plan de monitoreo con ID ${id} no encontrado.`);
    }
    const plan = await this.prisma.planMonitoreo.update({
      where: { id },
      data: { estado: 'Activo' },
    });
    return this.buildResponse(plan);
  }

  async findCobertura(planId: string): Promise<IPlanInstitucionCubierta[]> {
    const cobertura = await this.prisma.planCoberturaIe.findMany({
      where: { planId },
      include: {
        institucion: {
          select: { id: true, nombre: true, codigoModular: true },
        },
      },
    });
    return cobertura.map((c) => ({
      institucionId: c.institucion.id,
      institucionNombre: c.institucion.nombre,
      institucionCodigoModular: c.institucion.codigoModular,
    }));
  }

  async addCobertura(planId: string, institucionId: string): Promise<void> {
    const existing = await this.prisma.planCoberturaIe.findFirst({
      where: { planId, institucionId },
    });
    if (!existing) {
      await this.prisma.planCoberturaIe.create({
        data: { planId, institucionId },
      });
    }
  }

  async removeCobertura(planId: string, institucionId: string): Promise<void> {
    await this.prisma.planCoberturaIe.deleteMany({
      where: { planId, institucionId },
    });
  }
}
