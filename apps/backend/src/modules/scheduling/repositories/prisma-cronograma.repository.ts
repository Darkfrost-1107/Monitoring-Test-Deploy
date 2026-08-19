import type { Prisma } from '../../../generated/prisma/client.js';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { RoleCode } from '../../../common/enums/role.enum.js';
import type {
  IVisita,
  ISolicitudReprogramacion,
  TipoMonitoreo,
} from '@sistema-monitoreo/shared-contracts';
import {
  CronogramaRepository,
  CreateVisitaData,
  UpdateVisitaData,
  SolicitudReprogramacionRepository,
  CreateSolicitudData,
  ResolverSolicitudData,
  type QueryVisitasFilters,
  type QuerySolicitudesFilters,
} from './cronograma.repository.js';
import {
  fromPrismaVisita,
  fromPrismaSolicitud,
  type VisitaPayload,
  type SolicitudPayload,
} from './cronograma.mapper.js';

/**
 * Con qué plantilla monitorea cada rol.
 *
 * Quien no esté acá monitorea con la de la UGEL: es el caso del especialista y
 * del jefe de área, que trabajan sobre la plantilla del Jefe de Gestión.
 */
const AUTOR_DE_PLANTILLA_POR_ROL: Record<string, string> = {
  director_institucion: 'director_ie',
  coordinador_pedagogico: 'coordinador_pedagogico',
  jefe_taller: 'jefe_taller',
};

@Injectable()
export class PrismaCronogramaRepository implements CronogramaRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapVisita(v: VisitaPayload): IVisita {
    return fromPrismaVisita(v);
  }

  async findAll(filters?: QueryVisitasFilters): Promise<IVisita[]> {
    const where: Prisma.CronogramaWhereInput = {};
    if (filters?.estado) {
      where.estado = filters.estado;
    }
    if (filters) {
      if (filters.monitorId) where.monitorId = filters.monitorId;
      if (filters.institucionId) where.institucionId = filters.institucionId;
      if (filters.tipoMonitoreo) where.tipoMonitoreo = filters.tipoMonitoreo;
      if (filters.fechaDesde || filters.fechaHasta) {
        where.fechaProgramada = {};
        if (filters.fechaDesde) where.fechaProgramada.gte = new Date(filters.fechaDesde);
        if (filters.fechaHasta) where.fechaProgramada.lte = new Date(filters.fechaHasta);
      }
      if (filters.monitorEspecialidades && filters.monitorEspecialidades.length > 0) {
        where.monitor = {
          especialidades: {
            some: {
              especialidad: {
                nombre: { in: filters.monitorEspecialidades },
              },
            },
          },
        };
      }
    }
    const rows = await this.prisma.cronograma.findMany({
      where,
      orderBy: [{ fechaProgramada: 'asc' }, { horaInicio: 'asc' }],
    });
    return rows.map((r) => this.mapVisita(r));
  }

  async findById(id: string): Promise<IVisita | null> {
    const row = await this.prisma.cronograma.findUnique({ where: { id } });
    return row ? this.mapVisita(row) : null;
  }

  async findPlanVigentePara(institucionId: string, anio: number): Promise<string | null> {
    // 1. Plan UGEL del anio
    const planUgel = await this.prisma.planMonitoreo.findFirst({
      where: { anioAcademico: anio, tipoEntidad: 'UGEL', estado: 'Activo', deleted: false },
    });
    if (!planUgel) return null;

    // 2. Plan IE que cubra la institucion
    const planIe = await this.prisma.planMonitoreo.findFirst({
      where: {
        anioAcademico: anio,
        tipoEntidad: 'IE',
        estado: 'Activo',
        deleted: false,
        cobertura: { some: { institucionId } },
      },
    });
    return planIe?.id ?? planUgel.id;
  }

  async findPlantillaVigentePara(
    tipoMonitoreo: TipoMonitoreo,
    anio: number,
    monitorId: string,
  ): Promise<string | null> {
    // Cada actor monitorea con la suya: el especialista de la UGEL usa la del
    // Jefe de Gestión, y dentro de la I.E. el Director, el Coordinador y el
    // Jefe de Taller tienen cada uno la propia. Sin acotar por autor, con las
    // cuatro conviviendo se tomaba cualquiera.
    const monitor = await this.prisma.especialista.findUnique({
      where: { id: monitorId },
      select: {
        persona: { select: { usuario: { select: { rol: { select: { codigo: true } } } } } },
      },
    });

    const rol = monitor?.persona?.usuario?.rol?.codigo;
    const autor = AUTOR_DE_PLANTILLA_POR_ROL[rol ?? ''] ?? 'jefe_gestion';

    const plantilla = await this.prisma.plantillaMonitoreo.findFirst({
      where: {
        anioAcademico: anio,
        tipoMonitoreo,
        estado: 'Vigente',
        deleted: false,
        rolAutorAlCrear: autor,
      },
    });
    return plantilla?.id ?? null;
  }

  async validateEntidadesActivas(
    institucionId: string,
    monitorId: string,
    evaluadoId: string,
  ): Promise<{
    institucion: boolean;
    monitor: boolean;
    evaluado: boolean;
    monitorCargo?: string;
    monitorEsDirectorUgel: boolean;
    monitorEspecialidades: string[];
    evaluadoEsDirector: boolean;
    evaluadoEspecialidades: string[];
  }> {
    const [ie, monitor, evaluado] = await Promise.all([
      this.prisma.institucionEducativa.findUnique({ where: { id: institucionId } }),
      this.prisma.especialista.findUnique({
        where: { id: monitorId },
        // Se trae el rol del usuario del monitor: un Director de UGEL no realiza
        // visitas, y sin este dato no hay forma de distinguirlo de un especialista
        // (su cargo de especialista no lo revela). Y sus especialidades: en
        // Secundaria el monitoreo es por área.
        include: {
          persona: { select: { usuario: { select: { rol: { select: { codigo: true } } } } } },
          especialidades: { select: { especialidad: { select: { nombre: true } } } },
        },
      }),
      this.prisma.docente.findUnique({
        where: { id: evaluadoId },
        // La designación abierta es la que manda: quien fue director y cesó ya
        // no lo es, y se lo monitorea como al resto. Sus especialidades sirven
        // para comprobar que comparte área con el monitor en Secundaria.
        include: {
          docenteCargos: {
            where: { fechaFin: null, cargo: { nombre: 'Director' } },
            select: { id: true },
            take: 1,
          },
          docenteEspecialidades: { select: { especialidad: { select: { nombre: true } } } },
        },
      }),
    ]);

    return {
      institucion: ie?.estado === 'Activa',
      monitor: monitor?.estado === 'Activo',
      evaluado: evaluado?.estado === 'Activo',
      monitorCargo: monitor?.cargo,
      monitorEsDirectorUgel: monitor?.persona?.usuario?.rol?.codigo === RoleCode.DIRECTOR_UGEL,
      monitorEspecialidades: (monitor?.especialidades ?? []).map((e) => e.especialidad.nombre),
      evaluadoEsDirector: (evaluado?.docenteCargos?.length ?? 0) > 0,
      evaluadoEspecialidades: (evaluado?.docenteEspecialidades ?? []).map(
        (e) => e.especialidad.nombre,
      ),
    };
  }

  async countPendientesByMonitor(monitorId: string): Promise<number> {
    return this.prisma.cronograma.count({
      where: {
        monitorId,
        estado: { in: ['PROGRAMADO', 'EN_PROCESO', 'REPROGRAMADO'] },
      },
    });
  }

  async findVisitaExistente(
    evaluadoId: string,
    anio: number,
    numeroVisita: number,
  ): Promise<IVisita | null> {
    const inicioAnio = new Date(anio, 0, 1);
    const finAnio = new Date(anio, 11, 31, 23, 59, 59, 999);
    const row = await this.prisma.cronograma.findFirst({
      where: {
        evaluadoId,
        numeroVisita,
        fechaProgramada: {
          gte: inicioAnio,
          lte: finAnio,
        },
        estado: { not: 'ANULADO' },
      },
    });
    return row ? this.mapVisita(row) : null;
  }

  async findVisitasMonitorPorFecha(monitorId: string, fechaProgramada: Date): Promise<IVisita[]> {
    const inicioDia = new Date(fechaProgramada);
    inicioDia.setHours(0, 0, 0, 0);
    const finDia = new Date(fechaProgramada);
    finDia.setHours(23, 59, 59, 999);

    const rows = await this.prisma.cronograma.findMany({
      where: {
        monitorId,
        fechaProgramada: {
          gte: inicioDia,
          lte: finDia,
        },
        estado: { in: ['PROGRAMADO', 'EN_PROCESO', 'REPROGRAMADO'] },
      },
    });
    return rows.map((r) => this.mapVisita(r));
  }

  async create(data: CreateVisitaData): Promise<IVisita> {
    const row = await this.prisma.cronograma.create({
      data: {
        monitorId: data.monitorId,
        institucionId: data.institucionId,
        evaluadoId: data.evaluadoId,
        planId: null,
        tipoMonitoreo: data.tipoMonitoreo,
        numeroVisita: data.numeroVisita,
        fechaProgramada: new Date(data.fechaProgramada),
        horaInicio: data.horaInicio,
        detalles: data.detalles,
        estado: 'PROGRAMADO',
        modalidad: data.modalidad,
        nivelEducativo: data.nivelEducativo,
        creadoPorId: data.creadoPorId,
      },
    });
    return this.mapVisita(row);
  }

  async update(id: string, data: UpdateVisitaData): Promise<IVisita> {
    const updateData: Prisma.CronogramaUpdateInput = {};
    if (data.fechaProgramada) updateData.fechaProgramada = new Date(data.fechaProgramada);
    if (data.horaInicio) updateData.horaInicio = data.horaInicio;
    if (data.detalles !== undefined) updateData.detalles = data.detalles;
    if (data.estado) updateData.estado = data.estado;
    const row = await this.prisma.cronograma.update({ where: { id }, data: updateData });
    return this.mapVisita(row);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.cronograma.update({
      where: { id },
      data: { estado: 'ANULADO' },
    });
  }

  async findMonitorEspecialidades(
    monitorId: string,
  ): Promise<Array<{ especialidad: { nombre: string } }>> {
    return this.prisma.especialistaEspecialidad.findMany({
      where: { especialistaId: monitorId },
      include: { especialidad: { select: { nombre: true } } },
    });
  }

  async applyReprogramacion(
    cronogramaId: string,
    fechaProgramada: Date,
    horaInicio: string,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.$executeRawUnsafe(`SELECT set_config('app.reprogramacion_apply', 'true', true)`),
      this.prisma.cronograma.update({
        where: { id: cronogramaId },
        data: {
          fechaProgramada,
          horaInicio,
          estado: 'REPROGRAMADO',
        },
      }),
    ]);
  }
}

@Injectable()
export class PrismaSolicitudReprogramacionRepository implements SolicitudReprogramacionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapSolicitud(s: SolicitudPayload): ISolicitudReprogramacion {
    return fromPrismaSolicitud(s);
  }

  async findAll(filters?: QuerySolicitudesFilters): Promise<ISolicitudReprogramacion[]> {
    const where: Prisma.SolicitudReprogramacionWhereInput = {};
    if (filters) {
      if (filters.cronogramaId) where.cronogramaId = filters.cronogramaId;
      if (filters.solicitanteId) where.solicitanteId = filters.solicitanteId;
      if (filters.estado) where.estado = filters.estado;
    }
    const rows = await this.prisma.solicitudReprogramacion.findMany({
      where,
      include: {
        resueltoPor: {
          include: {
            persona: true,
            rol: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.mapSolicitud(r));
  }

  async findById(id: string): Promise<ISolicitudReprogramacion | null> {
    const row = await this.prisma.solicitudReprogramacion.findUnique({
      where: { id },
      include: {
        resueltoPor: {
          include: {
            persona: true,
            rol: true,
          },
        },
      },
    });
    return row ? this.mapSolicitud(row) : null;
  }

  async findPendienteByCronograma(cronogramaId: string): Promise<ISolicitudReprogramacion | null> {
    const row = await this.prisma.solicitudReprogramacion.findFirst({
      where: { cronogramaId, estado: 'PENDIENTE' },
      include: {
        resueltoPor: {
          include: {
            persona: true,
            rol: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return row ? this.mapSolicitud(row) : null;
  }

  async create(data: CreateSolicitudData): Promise<ISolicitudReprogramacion> {
    const row = await this.prisma.solicitudReprogramacion.create({
      data: {
        cronogramaId: data.cronogramaId,
        solicitanteId: data.solicitanteId,
        solicitanteRolAlCrear: data.solicitanteRolAlCrear,
        fechaOriginal: new Date(data.fechaOriginal),
        horaOriginal: data.horaOriginal,
        fechaPropuesta: new Date(data.fechaPropuesta),
        horaPropuesta: data.horaPropuesta,
        justificacion: data.justificacion,
        archivoSustentoUrl: data.archivoSustentoUrl,
        estado: 'PENDIENTE',
      },
    });
    return this.mapSolicitud(row);
  }

  async resolver(id: string, data: ResolverSolicitudData): Promise<ISolicitudReprogramacion> {
    const row = await this.prisma.solicitudReprogramacion.update({
      where: { id },
      data: {
        estado: data.estado,
        resueltoPorId: data.resueltoPorId,
        comentarioResolucion: data.comentarioResolucion,
        fechaResolucion: new Date(),
      },
      include: {
        resueltoPor: {
          include: {
            persona: true,
            rol: true,
          },
        },
      },
    });
    return this.mapSolicitud(row);
  }
}
