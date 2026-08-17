import type { Prisma } from '../../../generated/prisma/client.js';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { ScopeFilter, ScopeContext } from '../../../shared/auth/scope-filter.js';
import type {
  IReporteFicha,
  IReporteResumenIE,
  IAnalisisDesempenoCriterio,
} from '@sistema-monitoreo/shared-contracts';
import {
  PaginatedFichas,
  QueryFichasCompletadas,
  ReporteRepository,
  SessionScope,
} from './reporte.repository.js';
import { fromPrismaFichaReporte } from './reporte.mapper.js';

@Injectable()
export class PrismaReporteRepository implements ReporteRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeFilter: ScopeFilter,
  ) {}

  private toScopeContext(session: SessionScope): ScopeContext {
    return {
      userId: session.id,
      role: session.role,
      institucionId: session.institucionId,
      especialistaNivel: session.especialistaNivel,
    };
  }

  async findFichasCompletadas(
    filters: QueryFichasCompletadas,
    session: SessionScope,
  ): Promise<PaginatedFichas> {
    const page = Number(filters.page ?? 1);
    const limit = Number(filters.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: Prisma.FichaMonitoreoWhereInput = {
      estado: 'FINALIZADO',
      ...this.scopeFilter.forFicha(this.toScopeContext(session)),
    };
    if (filters.anioAcademico !== undefined) where.anioAcademico = filters.anioAcademico;

    // Ambos filtros apuntan a Cronograma, no a FichaMonitoreo. `institucionId`
    // se escribía en la raíz del `where`, campo que FichaMonitoreo no tiene: con
    // el objeto declarado como `any` nadie lo advertía. Ver H-29 del plan.
    const porCronograma: Prisma.CronogramaWhereInput = {};
    if (filters.institucionId) porCronograma.institucionId = filters.institucionId;
    if (Object.keys(porCronograma).length > 0) where.cronograma = porCronograma;
    if (filters.tipoMonitoreo) where.plantilla = { tipoMonitoreo: filters.tipoMonitoreo };
    if (filters.nivelLogro) where.nivelLogro = filters.nivelLogro;
    if (filters.fechaDesde || filters.fechaHasta) {
      where.createdAt = {};
      if (filters.fechaDesde) where.createdAt.gte = new Date(filters.fechaDesde);
      if (filters.fechaHasta) where.createdAt.lte = new Date(filters.fechaHasta);
    }

    const [rows, total] = await Promise.all([
      this.prisma.fichaMonitoreo.findMany({
        where,
        include: {
          plantilla: {
            select: { id: true, tipoMonitoreo: true, descripcion: true },
          },
          respuestasDesempeno: {
            include: {
              desempeno: {
                select: { id: true, nombre: true, orden: true, descripcionCorta: true },
              },
            },
            orderBy: { desempeno: { orden: 'asc' } },
          },
          respuestasEjeItem: {
            include: {
              ejeItem: { select: { id: true, descripcion: true, orden: true } },
            },
            orderBy: { ejeItem: { orden: 'asc' } },
          },
          cronograma: {
            include: {
              institucion: { select: { id: true, nombre: true, codigoModular: true } },
              evaluado: {
                include: {
                  persona: {
                    select: { nombres: true, apellidos: true, dni: true, telefono: true },
                  },
                },
              },
              monitor: {
                include: {
                  persona: {
                    select: { nombres: true, apellidos: true, dni: true, telefono: true },
                  },
                },
              },
            },
          },
          firmas: {
            include: {
              firmante: {
                include: { persona: { select: { nombres: true, apellidos: true } } },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.fichaMonitoreo.count({ where }),
    ]);

    const data = rows.map(fromPrismaFichaReporte);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findResumenPorIE(
    anioAcademico: number,
    session: SessionScope,
  ): Promise<IReporteResumenIE[]> {
    const whereBase: Prisma.FichaMonitoreoWhereInput = {
      estado: 'FINALIZADO',
      ...this.scopeFilter.forFicha(this.toScopeContext(session)),
    };
    if (anioAcademico) whereBase.anioAcademico = anioAcademico;

    const fichas = await this.prisma.fichaMonitoreo.findMany({
      where: whereBase,
      select: {
        nivelLogro: true,
        promedio: true,
        cronograma: {
          select: {
            tipoMonitoreo: true,
            institucion: {
              select: { id: true, codigoModular: true, nombre: true },
            },
          },
        },
      },
    });

    type InstitucionDeFicha = (typeof fichas)[number]['cronograma']['institucion'];
    const porIe = new Map<string, { institucion: InstitucionDeFicha; fichas: typeof fichas }>();
    for (const f of fichas) {
      const key = f.cronograma.institucion.id;
      if (!porIe.has(key)) {
        porIe.set(key, { institucion: f.cronograma.institucion, fichas: [] });
      }
      porIe.get(key)!.fichas.push(f);
    }

    const resumen: IReporteResumenIE[] = [];
    for (const { institucion, fichas: grupo } of porIe.values()) {
      const dist: Record<string, number> = {
        INICIO: 0,
        EN_PROCESO: 0,
        LOGRO_ESPERADO: 0,
        LOGRO_DESTACADO: 0,
      };
      let sumaPromedios = 0;
      let docentesCount = 0;
      let directivosCount = 0;
      for (const f of grupo) {
        dist[f.nivelLogro] = (dist[f.nivelLogro] ?? 0) + 1;
        sumaPromedios += Number(f.promedio);
        if (
          f.cronograma?.tipoMonitoreo === 'DOCENTE' ||
          f.cronograma?.tipoMonitoreo === 'DOCENTE_EIB'
        )
          docentesCount++;
        else if (f.cronograma?.tipoMonitoreo === 'DIRECTIVO') directivosCount++;
      }
      const totalFichas = grupo.length;
      const promedioInstitucional =
        totalFichas > 0 ? Number((sumaPromedios / totalFichas).toFixed(2)) : 0;
      const totalNivelesAltos = dist.LOGRO_ESPERADO + dist.LOGRO_DESTACADO;
      const porcentajeSatisfaccion =
        totalFichas > 0 ? Math.round((totalNivelesAltos / totalFichas) * 100) : 0;

      resumen.push({
        institucionId: institucion.id,
        institucionNombre: institucion.nombre,
        institucionCodigoModular: institucion.codigoModular,
        totalFichas,
        totalDocentes: docentesCount,
        totalDirectivos: directivosCount,
        promedioInstitucional,
        distribucionNivelLogro: dist,
        porcentajeSatisfaccion,
      });
    }

    return resumen.sort((a, b) => b.totalFichas - a.totalFichas);
  }

  async findFichaByIdParaExport(id: string, session: SessionScope): Promise<IReporteFicha | null> {
    const f = await this.prisma.fichaMonitoreo.findUnique({
      where: { id },
      include: {
        plantilla: {
          select: { id: true, tipoMonitoreo: true, descripcion: true },
        },
        respuestasDesempeno: {
          include: {
            desempeno: { select: { id: true, nombre: true, orden: true, descripcionCorta: true } },
          },
          orderBy: { desempeno: { orden: 'asc' } },
        },
        respuestasEjeItem: {
          include: {
            ejeItem: { select: { id: true, descripcion: true, orden: true } },
          },
          orderBy: { ejeItem: { orden: 'asc' } },
        },
        cronograma: {
          include: {
            institucion: { select: { id: true, nombre: true, codigoModular: true } },
            evaluado: {
              include: {
                persona: { select: { nombres: true, apellidos: true, dni: true, telefono: true } },
              },
            },
            monitor: {
              include: {
                persona: { select: { nombres: true, apellidos: true, dni: true, telefono: true } },
              },
            },
          },
        },
        firmas: {
          include: {
            firmante: {
              include: { persona: { select: { nombres: true, apellidos: true } } },
            },
          },
        },
      },
    });
    if (!f) return null;

    // Validar scope: si la ficha no matchea el filtro del usuario, no tiene acceso.
    const scope = this.scopeFilter.forFicha(this.toScopeContext(session));
    const allowed = await this.prisma.fichaMonitoreo.findFirst({
      where: { id: f.id, ...scope },
      select: { id: true },
    });
    if (!allowed) return null;

    return fromPrismaFichaReporte(f);
  }

  async findAnalisisDesempenos(
    filters: QueryFichasCompletadas,
    session: SessionScope,
  ): Promise<IAnalisisDesempenoCriterio[]> {
    const whereFicha: Prisma.FichaMonitoreoWhereInput = {
      estado: 'FINALIZADO',
      ...this.scopeFilter.forFicha(this.toScopeContext(session)),
    };
    if (filters.anioAcademico !== undefined) whereFicha.anioAcademico = filters.anioAcademico;

    const porCronograma: Prisma.CronogramaWhereInput = {};
    if (filters.institucionId) {
      porCronograma.institucionId = filters.institucionId;
    }
    if (Object.keys(porCronograma).length > 0) {
      whereFicha.cronograma = porCronograma;
    }
    if (filters.tipoMonitoreo) {
      whereFicha.plantilla = { tipoMonitoreo: filters.tipoMonitoreo };
    }

    if (filters.fechaDesde || filters.fechaHasta) {
      whereFicha.createdAt = {};
      if (filters.fechaDesde) whereFicha.createdAt.gte = new Date(filters.fechaDesde);
      if (filters.fechaHasta) whereFicha.createdAt.lte = new Date(filters.fechaHasta);
    }

    const respuestas = await this.prisma.fichaRespuestaDesempeno.findMany({
      where: { ficha: whereFicha },
      include: {
        desempeno: {
          select: {
            id: true,
            nombre: true,
            orden: true,
            descripcionCorta: true,
          },
        },
      },
      orderBy: {
        desempeno: {
          orden: 'asc',
        },
      },
    });

    const mapa = new Map<
      string,
      {
        desempenoId: string;
        nombre: string;
        orden: number;
        descripcionCorta: string | null;
        total: number;
        nivelI: number;
        nivelII: number;
        nivelIII: number;
        nivelIV: number;
        sumaNiveles: number;
      }
    >();

    for (const r of respuestas) {
      if (!r.desempeno) continue;
      const dId = r.desempeno.id;
      if (!mapa.has(dId)) {
        mapa.set(dId, {
          desempenoId: dId,
          nombre: r.desempeno.nombre,
          orden: r.desempeno.orden,
          descripcionCorta: r.desempeno.descripcionCorta,
          total: 0,
          nivelI: 0,
          nivelII: 0,
          nivelIII: 0,
          nivelIV: 0,
          sumaNiveles: 0,
        });
      }
      const item = mapa.get(dId)!;
      item.total += 1;
      item.sumaNiveles += r.nivel;
      if (r.nivel === 1) item.nivelI += 1;
      else if (r.nivel === 2) item.nivelII += 1;
      else if (r.nivel === 3) item.nivelIII += 1;
      else if (r.nivel === 4) item.nivelIV += 1;
    }

    return Array.from(mapa.values())
      .sort((a, b) => a.orden - b.orden)
      .map((item) => {
        const porcentajeI = item.total > 0 ? Math.round((item.nivelI / item.total) * 100) : 0;
        const porcentajeII = item.total > 0 ? Math.round((item.nivelII / item.total) * 100) : 0;
        const porcentajeIII = item.total > 0 ? Math.round((item.nivelIII / item.total) * 100) : 0;
        const porcentajeIV = item.total > 0 ? Math.round((item.nivelIV / item.total) * 100) : 0;
        const promedio = item.total > 0 ? Number((item.sumaNiveles / item.total).toFixed(2)) : 0;

        return {
          desempenoId: item.desempenoId,
          nombre: item.nombre,
          orden: item.orden,
          descripcionCorta: item.descripcionCorta,
          totalEvaluados: item.total,
          conteoNivelI: item.nivelI,
          conteoNivelII: item.nivelII,
          conteoNivelIII: item.nivelIII,
          conteoNivelIV: item.nivelIV,
          porcentajeNivelI: porcentajeI,
          porcentajeNivelII: porcentajeII,
          porcentajeNivelIII: porcentajeIII,
          porcentajeNivelIV: porcentajeIV,
          promedio,
          tasaLogro: porcentajeIII + porcentajeIV,
          tasaRefuerzo: porcentajeI + porcentajeII,
        };
      });
  }
}
