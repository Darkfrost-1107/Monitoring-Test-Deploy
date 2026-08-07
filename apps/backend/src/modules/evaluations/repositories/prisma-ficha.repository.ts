import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type {
  IFichaMonitoreo,
  IFichaRespuestaDesempeno,
  IFichaRespuestaAspecto,
  IFichaRespuestaEjeItem,
  NivelLogro,
  IHistorialPedagogicoResponse,
} from '@sistema-monitoreo/shared-contracts';
import {
  FichaRepository,
  CreateFichaData,
  SaveRespuestaData,
  SaveRespuestaAspectoData,
  SaveRespuestaEjeItemData,
  CronogramaBasic,
  PlantillaBasic,
} from './ficha.repository.js';
import { fromPrismaFicha } from './ficha.mapper.js';
import { aFechaDeCalendario } from '../../../common/utils/fecha-calendario.js';

@Injectable()
export class PrismaFichaRepository implements FichaRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async buildFicha(fichaId: string): Promise<IFichaMonitoreo> {
    const ficha = await this.prisma.fichaMonitoreo.findUnique({
      where: { id: fichaId },
      include: {
        fichaContexto: true,
        respuestasDesempeno: true,
        respuestasAspecto: true,
        respuestasEjeItem: true,
        plantilla: { select: { id: true, version: true, estado: true } },
      },
    });
    if (!ficha) throw new NotFoundException(`Ficha ${fichaId} no encontrada.`);
    return fromPrismaFicha(ficha);
  }

  async findByVisitaId(cronogramaId: string): Promise<IFichaMonitoreo | null> {
    const ficha = await this.prisma.fichaMonitoreo.findUnique({
      where: { cronogramaId },
    });
    if (!ficha) return null;
    return this.buildFicha(ficha.id);
  }

  async findById(id: string): Promise<IFichaMonitoreo | null> {
    const ficha = await this.prisma.fichaMonitoreo.findUnique({ where: { id } });
    if (!ficha) return null;
    return this.buildFicha(id);
  }

  async create(data: CreateFichaData): Promise<IFichaMonitoreo> {
    const id = randomUUID();
    const contextoId = randomUUID();
    await this.prisma.fichaContexto.create({
      data: {
        id: contextoId,
        areaCurricular: data.contexto.areaCurricular,
        grado: data.contexto.grado,
        seccion: data.contexto.seccion,
        cantidadEstudiantes: data.contexto.cantidadEstudiantes,
        cantidadEstudiantesNee: data.contexto.cantidadEstudiantesNee,
        cursoId: data.contexto.cursoId,
      },
    });
    await this.prisma.fichaMonitoreo.create({
      data: {
        id,
        cronogramaId: data.cronogramaId,
        plantillaId: data.plantillaId,
        fichaContextoId: contextoId,
        anioAcademico: data.anioAcademico,
        puntajeTotal: 0,
        promedio: 1,
        nivelLogro: 'INICIO',
        estado: 'BORRADOR',
        creadoPorId: data.creadoPorId,
      },
    });
    return this.buildFicha(id);
  }

  async saveRespuestaDesempeno(data: SaveRespuestaData): Promise<IFichaRespuestaDesempeno> {
    const existing = await this.prisma.fichaRespuestaDesempeno.findFirst({
      where: { fichaId: data.fichaId, desempenoId: data.desempenoId },
    });
    if (existing) {
      const updated = await this.prisma.fichaRespuestaDesempeno.update({
        where: { id: existing.id },
        data: {
          nivel: data.nivel,
          observaciones: data.observaciones !== undefined ? data.observaciones : undefined,
          preguntaExtraRespuesta:
            data.preguntaExtraRespuesta !== undefined ? data.preguntaExtraRespuesta : undefined,
        },
      });
      return {
        id: updated.id,
        fichaId: updated.fichaId,
        desempenoId: updated.desempenoId,
        nivel: updated.nivel,
        observaciones: updated.observaciones,
        preguntaExtraRespuesta: updated.preguntaExtraRespuesta,
      };
    }
    const created = await this.prisma.fichaRespuestaDesempeno.create({
      data: {
        id: randomUUID(),
        fichaId: data.fichaId,
        desempenoId: data.desempenoId,
        nivel: data.nivel,
        observaciones: data.observaciones ?? null,
        preguntaExtraRespuesta: data.preguntaExtraRespuesta ?? null,
      },
    });
    return {
      id: created.id,
      fichaId: created.fichaId,
      desempenoId: created.desempenoId,
      nivel: created.nivel,
      observaciones: created.observaciones,
      preguntaExtraRespuesta: created.preguntaExtraRespuesta,
    };
  }

  async saveRespuestaAspecto(data: SaveRespuestaAspectoData): Promise<IFichaRespuestaAspecto> {
    const existing = await this.prisma.fichaRespuestaAspecto.findFirst({
      where: { fichaId: data.fichaId, aspectoId: data.aspectoId },
    });
    if (existing) {
      const updated = await this.prisma.fichaRespuestaAspecto.update({
        where: { id: existing.id },
        data: { marcado: data.marcado },
      });
      return {
        id: updated.id,
        fichaId: updated.fichaId,
        aspectoId: updated.aspectoId,
        marcado: updated.marcado,
      };
    }
    const created = await this.prisma.fichaRespuestaAspecto.create({
      data: {
        id: randomUUID(),
        fichaId: data.fichaId,
        aspectoId: data.aspectoId,
        marcado: data.marcado,
      },
    });
    return {
      id: created.id,
      fichaId: created.fichaId,
      aspectoId: created.aspectoId,
      marcado: created.marcado,
    };
  }

  async saveRespuestaEjeItem(data: SaveRespuestaEjeItemData): Promise<IFichaRespuestaEjeItem> {
    const existing = await this.prisma.fichaRespuestaEjeItem.findFirst({
      where: { fichaId: data.fichaId, ejeItemId: data.ejeItemId },
    });
    if (existing) {
      const updated = await this.prisma.fichaRespuestaEjeItem.update({
        where: { id: existing.id },
        data: {
          nivel: data.nivel,
          evidenciaUrl: data.evidenciaUrl !== undefined ? data.evidenciaUrl : undefined,
          observacion: data.observacion !== undefined ? data.observacion : undefined,
        },
      });
      return {
        id: updated.id,
        fichaId: updated.fichaId,
        ejeItemId: updated.ejeItemId,
        nivel: updated.nivel,
        evidenciaUrl: updated.evidenciaUrl,
        observacion: updated.observacion,
      };
    }
    const created = await this.prisma.fichaRespuestaEjeItem.create({
      data: {
        id: randomUUID(),
        fichaId: data.fichaId,
        ejeItemId: data.ejeItemId,
        nivel: data.nivel,
        evidenciaUrl: data.evidenciaUrl ?? null,
        observacion: data.observacion ?? null,
      },
    });
    return {
      id: created.id,
      fichaId: created.fichaId,
      ejeItemId: created.ejeItemId,
      nivel: created.nivel,
      evidenciaUrl: created.evidenciaUrl,
      observacion: created.observacion,
    };
  }

  async finalizar(
    fichaId: string,
    puntajeTotal: number,
    promedio: number,
    nivelLogro: NivelLogro,
    finalizadaPorId: string,
    observaciones?: string,
    sugerencias?: string,
    compromisos?: string,
    evidenciaGeneral?: string,
  ): Promise<IFichaMonitoreo> {
    await this.prisma.fichaMonitoreo.update({
      where: { id: fichaId },
      data: {
        puntajeTotal,
        promedio,
        nivelLogro,
        estado: 'FINALIZADO',
        finalizadaPorId,
        finalizadaAt: new Date(),
        observaciones,
        sugerencias,
        compromisos,
        evidenciaGeneral,
      },
    });
    return this.buildFicha(fichaId);
  }

  async plantillaEstaHistorica(plantillaId: string): Promise<boolean> {
    const p = await this.prisma.plantillaMonitoreo.findUnique({
      where: { id: plantillaId },
      select: { estado: true },
    });
    return p?.estado === 'Historico';
  }

  async findPlantillaVigente(tipo: string, anio: number): Promise<PlantillaBasic | null> {
    const p = await this.prisma.plantillaMonitoreo.findFirst({
      where: { tipoMonitoreo: tipo, anioAcademico: anio, estado: 'Vigente', deleted: false },
      select: {
        id: true,
        estado: true,
        tipoMonitoreo: true,
        anioAcademico: true,
        descripcion: true,
      },
    });
    return p;
  }

  async findCronogramaBasicById(id: string): Promise<CronogramaBasic | null> {
    const c = await this.prisma.cronograma.findUnique({
      where: { id },
      select: {
        id: true,
        estado: true,
        tipoMonitoreo: true,
        fechaProgramada: true,
        evaluadoId: true,
      },
    });
    return c;
  }

  async findCursoBasicById(id: string): Promise<{ id: string } | null> {
    return this.prisma.curso.findUnique({
      where: { id },
      select: { id: true },
    });
  }

  async findDocenteCursoByDocenteId(docenteId: string): Promise<{ cursoId: string } | null> {
    return this.prisma.docenteCurso.findFirst({
      where: { docenteId },
      select: { cursoId: true },
    });
  }

  async findFirstCursoBasic(): Promise<{ id: string } | null> {
    return this.prisma.curso.findFirst({
      select: { id: true },
    });
  }

  async findPlantillaBasicById(id: string): Promise<PlantillaBasic | null> {
    const p = await this.prisma.plantillaMonitoreo.findUnique({
      where: { id },
      select: {
        id: true,
        estado: true,
        tipoMonitoreo: true,
        anioAcademico: true,
        descripcion: true,
      },
    });
    return p;
  }

  async updateCronogramaEstado(id: string, estado: string): Promise<void> {
    await this.prisma.cronograma.update({
      where: { id },
      data: { estado },
    });
  }

  async findRespuestaEjeItemByFichaAndEje(
    fichaId: string,
    ejeItemId: string,
  ): Promise<{ nivel: number } | null> {
    return this.prisma.fichaRespuestaEjeItem.findFirst({
      where: { fichaId, ejeItemId },
      select: { nivel: true },
    });
  }

  async migrarPlantilla(
    fichaId: string,
    nuevaPlantillaId: string,
    oldDesempenos: Array<{ id: string; nivel: number }>,
    oldAspectos: Array<{ id: string; marcado: boolean }>,
  ): Promise<IFichaMonitoreo> {
    const desempenosV2 = await this.prisma.desempenoPlantilla.findMany({
      where: { plantillaId: nuevaPlantillaId },
      include: { aspectos: true },
    });
    const desempenoPorNombre = new Map<string, (typeof desempenosV2)[number]>();
    for (const d of desempenosV2) {
      desempenoPorNombre.set(d.nombre, d);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.fichaRespuestaDesempeno.deleteMany({ where: { fichaId } });
      await tx.fichaRespuestaAspecto.deleteMany({ where: { fichaId } });

      for (const r of oldDesempenos) {
        const desempenoV1 = await tx.desempenoPlantilla.findUnique({
          where: { id: r.id },
        });
        const desempenoV2 = desempenoV1 ? desempenoPorNombre.get(desempenoV1.nombre) : null;
        if (desempenoV2) {
          await tx.fichaRespuestaDesempeno.create({
            data: { fichaId, desempenoId: desempenoV2.id, nivel: r.nivel },
          });
        }
      }

      for (const r of oldAspectos) {
        const aspectoV1 = await tx.aspectoEvaluado.findUnique({
          where: { id: r.id },
          include: { desempeno: true },
        });
        if (!aspectoV1) continue;
        const desempenoV2 = desempenoPorNombre.get(aspectoV1.desempeno.nombre);
        const aspectoV2 = desempenoV2?.aspectos.find(
          (a) => a.descripcion === aspectoV1.descripcion,
        );
        if (aspectoV2) {
          await tx.fichaRespuestaAspecto.create({
            data: { fichaId, aspectoId: aspectoV2.id, marcado: r.marcado },
          });
        }
      }

      await tx.fichaMonitoreo.update({
        where: { id: fichaId },
        data: { plantillaId: nuevaPlantillaId },
      });
    });

    return this.buildFicha(fichaId);
  }

  async existsWithScope(id: string, scopeWhere: Record<string, unknown>): Promise<boolean> {
    const result = await this.prisma.fichaMonitoreo.findFirst({
      where: { id, ...scopeWhere },
      select: { id: true },
    });
    return result !== null;
  }

  async getHistorial(evaluadoId: string): Promise<IHistorialPedagogicoResponse> {
    const fichas = await this.prisma.fichaMonitoreo.findMany({
      where: {
        cronograma: { evaluadoId },
        estado: 'FINALIZADO',
      },
      select: {
        id: true,
        promedio: true,
        nivelLogro: true,
        observaciones: true,
        cronograma: {
          select: { fechaProgramada: true },
        },
      },
      orderBy: {
        cronograma: { fechaProgramada: 'asc' },
      },
    });

    return fichas.map((f) => ({
      id: f.id,
      promedio: Number(f.promedio),
      nivelLogro: f.nivelLogro,
      observaciones: f.observaciones,
      // Columna @db.Date: viaja como fecha de calendario, sin hora ni zona.
      fecha: aFechaDeCalendario(f.cronograma.fechaProgramada),
    }));
  }
}
