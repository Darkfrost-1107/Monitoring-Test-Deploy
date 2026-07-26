import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  IDirectorDashboardMonitoreoReciente,
  IDirectorDashboardResponse,
  IUgelDashboardCriticaIe,
  IUgelDashboardDistritoCritico,
  IUgelDashboardIeCriticaDistrito,
  IUgelDashboardDistrito,
  IUgelDashboardIeMapa,
  IUgelDashboardInstitucionDetalle,
  IUgelDashboardMonitoreoReciente,
  IUgelDashboardResponse,
  IUgelDashboardEvolucionMes,
  IUgelDashboardEspecialistaRanking,
  IUgelDashboardDistritoDeterioro,
  NivelLogro,
} from '@sistema-monitoreo/shared-contracts';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { ScopeFilter, ScopeContext } from '../../../shared/auth/scope-filter.js';
import { DashboardRepository, SessionScope } from './dashboard.repository.js';

/** Cuántos monitoreos recientes devuelve el dashboard. */
const RECIENTES_LIMIT = 5;

/** Cuántos especialistas devuelve el ranking del dashboard. */
const RANKING_ESPECIALISTAS_LIMIT = 8;

/**
 * Clasifica un promedio institucional (0.00–4.00) en una categoría de semáforo,
 * replicando las bandas del baremo (EDU-0009: INICIO ≤1.5, EN_PROCESO ≤2.5,
 * LOGRO_ESPERADO ≤3.5, LOGRO_DESTACADO ≤4.0) sin lanzar en los límites.
 */
function clasificarSemaforo(promedio: number): 'critico' | 'enProceso' | 'logroPrevisto' {
  if (promedio <= 1.5) return 'critico';
  if (promedio <= 2.5) return 'enProceso';
  return 'logroPrevisto';
}

@Injectable()
export class PrismaDashboardRepository implements DashboardRepository {
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
      especialistaEspecialidades: session.especialistaEspecialidades,
    };
  }

  async getDirectorDashboard(session: SessionScope): Promise<IDirectorDashboardResponse> {
    const ctx = this.toScopeContext(session);

    // 1. Institución del director (scope acotado a su IE).
    const institucion = await this.prisma.institucionEducativa.findFirst({
      where: this.scopeFilter.forInstitucion(ctx),
      select: {
        id: true,
        nombre: true,
        codigoModular: true,
        nivelEducativo: true,
        distrito: true,
      },
    });

    // 2. Docentes de la IE (para total y semáforo por docente).
    const docentes = await this.prisma.docente.findMany({
      where: { ...this.scopeFilter.forDocente(ctx), estado: 'Activo' },
      select: { id: true },
    });
    const totalDocentes = docentes.length;

    // 3. Fichas finalizadas de la IE, con datos para "recientes" y semáforo.
    const fichas = await this.prisma.fichaMonitoreo.findMany({
      where: { estado: 'FINALIZADO', ...this.scopeFilter.forFicha(ctx) },
      select: {
        id: true,
        nivelLogro: true,
        promedio: true,
        finalizadaAt: true,
        createdAt: true,
        cronograma: {
          select: {
            evaluadoId: true,
            nivelEducativo: true,
            evaluado: { select: { persona: { select: { nombres: true, apellidos: true } } } },
            monitor: { select: { persona: { select: { nombres: true, apellidos: true } } } },
          },
        },
      },
      orderBy: [{ finalizadaAt: 'desc' }, { createdAt: 'desc' }],
    });

    // Última ficha finalizada por docente (las fichas ya vienen ordenadas desc,
    // así que la primera que veamos por docente es la más reciente).
    const ultimaPorDocente = new Map<string, (typeof fichas)[number]>();
    for (const ficha of fichas) {
      const docenteId = ficha.cronograma.evaluadoId;
      if (!ultimaPorDocente.has(docenteId)) {
        ultimaPorDocente.set(docenteId, ficha);
      }
    }

    // 4. Semáforo — distribución de docentes por nivel de logro (última ficha).
    let critico = 0;
    let enProceso = 0;
    let logroPrevisto = 0;
    let sumaPromedios = 0;
    for (const ficha of ultimaPorDocente.values()) {
      const nivel = ficha.nivelLogro as NivelLogro;
      if (nivel === 'INICIO') critico += 1;
      else if (nivel === 'EN_PROCESO') enProceso += 1;
      else logroPrevisto += 1; // LOGRO_ESPERADO | LOGRO_DESTACADO
      sumaPromedios += Number(ficha.promedio);
    }
    const monitoreados = ultimaPorDocente.size;
    const pendientes = Math.max(totalDocentes - monitoreados, 0);
    const sinRegistro = pendientes;
    const nivelPromedio = monitoreados > 0 ? Number((sumaPromedios / monitoreados).toFixed(2)) : 0;
    const porcentajeCobertura =
      totalDocentes > 0 ? Math.round((monitoreados / totalDocentes) * 100) : 0;

    // 5. Monitoreos recientes (top N por fecha de finalización).
    const monitoreosRecientes: IDirectorDashboardMonitoreoReciente[] = fichas
      .slice(0, RECIENTES_LIMIT)
      .map((ficha) => {
        const evaluado = ficha.cronograma.evaluado.persona;
        const monitor = ficha.cronograma.monitor.persona;
        return {
          fichaId: ficha.id,
          docenteNombre: `${evaluado.nombres} ${evaluado.apellidos}`.trim(),
          especialistaNombre: `${monitor.nombres} ${monitor.apellidos}`.trim(),
          nivelEducativo: ficha.cronograma.nivelEducativo,
          fecha: (ficha.finalizadaAt ?? ficha.createdAt).toISOString(),
          nivelLogro: ficha.nivelLogro as NivelLogro,
          promedio: Number(ficha.promedio),
        };
      });

    return {
      institucion,
      kpis: {
        totalDocentes,
        monitoreados,
        pendientes,
        nivelPromedio,
        porcentajeCobertura,
      },
      semaforo: {
        critico,
        enProceso,
        logroPrevisto,
        sinRegistro,
      },
      monitoreosRecientes,
    };
  }

  async getUgelDashboard(session: SessionScope, anio: number): Promise<IUgelDashboardResponse> {
    const ctx = this.toScopeContext(session);
    // Límites de año en UTC: `fecha_programada` es @db.Date (medianoche UTC),
    // usar medianoche local desplazaría fechas de 1-ene / 31-dic al año vecino.
    const inicioAnio = new Date(Date.UTC(anio, 0, 1));
    const finAnio = new Date(Date.UTC(anio, 11, 31, 23, 59, 59));

    const institucionWhere = {
      estado: 'Activa',
      ...this.scopeFilter.forInstitucion(ctx),
    };

    // 1. KPIs institucionales: total y monitoreadas (con monitoreo COMPLETADO en el año).
    const [totalInstituciones, monitoreadas] = await Promise.all([
      this.prisma.institucionEducativa.count({ where: institucionWhere }),
      this.prisma.institucionEducativa.count({
        where: {
          ...institucionWhere,
          cronogramas: {
            some: {
              estado: 'COMPLETADO',
              fechaProgramada: { gte: inicioAnio, lte: finAnio },
            },
          },
        },
      }),
    ]);
    const pendientes = Math.max(totalInstituciones - monitoreadas, 0);
    const porcentajeCobertura =
      totalInstituciones > 0 ? Math.round((monitoreadas / totalInstituciones) * 100) : 0;

    // 2. Fichas finalizadas del año, con IE y especialista.
    const fichas = await this.prisma.fichaMonitoreo.findMany({
      where: { estado: 'FINALIZADO', anioAcademico: anio, ...this.scopeFilter.forFicha(ctx) },
      select: {
        id: true,
        nivelLogro: true,
        promedio: true,
        finalizadaAt: true,
        createdAt: true,
        cronograma: {
          select: {
            institucionId: true,
            nivelEducativo: true,
            tipoMonitoreo: true,
            evaluadoId: true,
            evaluado: {
              select: {
                persona: { select: { nombres: true, apellidos: true } },
                docenteEspecialidades: {
                  select: { especialidad: { select: { nombre: true } } },
                },
              },
            },
            institucion: {
              select: {
                nombre: true,
                codigoModular: true,
                distrito: true,
                nivelEducativo: true,
              },
            },
            monitor: {
              select: { id: true, persona: { select: { nombres: true, apellidos: true } } },
            },
          },
        },
      },
      orderBy: [{ finalizadaAt: 'desc' }, { createdAt: 'desc' }],
    });

    // 3. Nivel promedio provincial (media de las fichas finalizadas).
    const nivelPromedio =
      fichas.length > 0
        ? Number(
            (fichas.reduce((acc, f) => acc + Number(f.promedio), 0) / fichas.length).toFixed(2),
          )
        : 0;

    // 4. Semáforo + "requieren atención" — clasificación de cada IE por su
    //    promedio institucional.
    type IeAcc = {
      suma: number;
      n: number;
      nombre: string;
      distrito: string;
      nivelEducativo: string;
    };
    const promediosPorIe = new Map<string, IeAcc>();
    for (const ficha of fichas) {
      const ieId = ficha.cronograma.institucionId;
      const ie = ficha.cronograma.institucion;
      const acc =
        promediosPorIe.get(ieId) ??
        ({
          suma: 0,
          n: 0,
          nombre: ie.nombre,
          distrito: ie.distrito,
          nivelEducativo: ie.nivelEducativo,
        } satisfies IeAcc);
      acc.suma += Number(ficha.promedio);
      acc.n += 1;
      promediosPorIe.set(ieId, acc);
    }

    let critico = 0;
    let enProceso = 0;
    let logroPrevisto = 0;
    for (const acc of promediosPorIe.values()) {
      const categoria = clasificarSemaforo(acc.suma / acc.n);
      if (categoria === 'critico') critico += 1;
      else if (categoria === 'enProceso') enProceso += 1;
      else logroPrevisto += 1;
    }
    const sinRegistro = Math.max(totalInstituciones - promediosPorIe.size, 0);

    // "Requieren atención" a nivel docente (versión detallada por institución, para
    // el módulo Focos de Atención): docentes/directivos cuya ÚLTIMA ficha está en
    // INICIO, agrupados por su IE.
    const ultimaPorDocente = new Map<string, (typeof fichas)[number]>();
    const completadosPorDocente = new Map<string, number>();
    for (const ficha of fichas) {
      const docId = ficha.cronograma.evaluadoId;
      if (!ultimaPorDocente.has(docId)) ultimaPorDocente.set(docId, ficha); // ya vienen desc
      completadosPorDocente.set(docId, (completadosPorDocente.get(docId) ?? 0) + 1);
    }
    const iesAtencion = new Map<string, IUgelDashboardCriticaIe>();
    for (const ficha of ultimaPorDocente.values()) {
      if (ficha.nivelLogro !== 'INICIO') continue;
      const c = ficha.cronograma;
      let ie = iesAtencion.get(c.institucionId);
      if (!ie) {
        ie = {
          institucionId: c.institucionId,
          nombre: c.institucion.nombre,
          distrito: c.institucion.distrito,
          nivelEducativo: c.institucion.nivelEducativo,
          docentes: [],
        };
        iesAtencion.set(c.institucionId, ie);
      }
      const p = c.evaluado.persona;
      const especialidades = c.evaluado.docenteEspecialidades
        .map((de) => de.especialidad.nombre)
        .filter(Boolean);
      ie.docentes.push({
        docenteId: c.evaluadoId,
        nombre: `${p.nombres} ${p.apellidos}`.trim(),
        cargo: c.tipoMonitoreo === 'DIRECTIVO' ? 'Directivo' : 'Docente',
        especialidad: especialidades.length > 0 ? especialidades.join(', ') : null,
        promedio: Number(ficha.promedio),
        nivelLogro: 'INICIO',
        monitoreosCompletados: completadosPorDocente.get(c.evaluadoId) ?? 0,
      });
    }
    const requierenAtencion: IUgelDashboardCriticaIe[] = [...iesAtencion.values()];
    for (const ie of requierenAtencion) ie.docentes.sort((a, b) => a.promedio - b.promedio);
    requierenAtencion.sort((a, b) => b.docentes.length - a.docentes.length);

    // "Requieren atención" a nivel DISTRITO (Director UGEL): distritos cuyo promedio
    // institucional (media de los promedios de sus II.EE. monitoreadas) cae en INICIO
    // (crítico), con el desglose de las II.EE. críticas que lo componen.
    type DistritoAcc = {
      sumaProm: number;
      nIe: number;
      criticas: IUgelDashboardIeCriticaDistrito[];
    };
    const distritoAcc = new Map<string, DistritoAcc>();
    for (const [ieId, acc] of promediosPorIe.entries()) {
      const promedioIe = acc.suma / acc.n;
      const d = distritoAcc.get(acc.distrito) ?? { sumaProm: 0, nIe: 0, criticas: [] };
      d.sumaProm += promedioIe;
      d.nIe += 1;
      if (clasificarSemaforo(promedioIe) === 'critico') {
        d.criticas.push({
          institucionId: ieId,
          nombre: acc.nombre,
          nivelEducativo: acc.nivelEducativo,
          promedio: Number(promedioIe.toFixed(2)),
        });
      }
      distritoAcc.set(acc.distrito, d);
    }
    const distritosCriticos: IUgelDashboardDistritoCritico[] = [...distritoAcc.entries()]
      .map(([distrito, d]) => ({
        distrito,
        promedio: Number((d.sumaProm / d.nIe).toFixed(2)),
        totalInstituciones: d.nIe,
        institucionesCriticas: d.criticas.sort((a, b) => a.promedio - b.promedio),
      }))
      .filter((d) => clasificarSemaforo(d.promedio) === 'critico')
      .sort((a, b) => a.promedio - b.promedio);

    // 4a-bis. II.EE. geolocalizadas para el mapa, con su estado de semáforo.
    const iesConCoord = await this.prisma.institucionEducativa.findMany({
      where: { ...institucionWhere, latitud: { not: null }, longitud: { not: null } },
      select: {
        id: true,
        nombre: true,
        distrito: true,
        nivelEducativo: true,
        latitud: true,
        longitud: true,
      },
    });
    const institucionesMapa: IUgelDashboardIeMapa[] = iesConCoord.map((ie) => {
      const acc = promediosPorIe.get(ie.id);
      return {
        institucionId: ie.id,
        nombre: ie.nombre,
        distrito: ie.distrito,
        nivelEducativo: ie.nivelEducativo,
        latitud: Number(ie.latitud),
        longitud: Number(ie.longitud),
        estado: acc ? clasificarSemaforo(acc.suma / acc.n) : 'sinRegistro',
      };
    });

    // 4b. Cobertura por distrito (todas las IEs activas, cuántas monitoreadas).
    const [iesActivas, iesMonitoreadas] = await Promise.all([
      this.prisma.institucionEducativa.findMany({
        where: institucionWhere,
        select: { id: true, distrito: true },
      }),
      this.prisma.institucionEducativa.findMany({
        where: {
          ...institucionWhere,
          cronogramas: {
            some: { estado: 'COMPLETADO', fechaProgramada: { gte: inicioAnio, lte: finAnio } },
          },
        },
        select: { id: true },
      }),
    ]);
    const monitoreadaIds = new Set(iesMonitoreadas.map((ie) => ie.id));
    const distritoMap = new Map<string, { total: number; monitoreadas: number }>();
    for (const ie of iesActivas) {
      const acc = distritoMap.get(ie.distrito) ?? { total: 0, monitoreadas: 0 };
      acc.total += 1;
      if (monitoreadaIds.has(ie.id)) acc.monitoreadas += 1;
      distritoMap.set(ie.distrito, acc);
    }
    // Promedio (nivel de logro) por distrito, derivado de las IE monitoreadas.
    const promedioPorDistrito = new Map<string, number>();
    for (const [distrito, d] of distritoAcc.entries()) {
      promedioPorDistrito.set(distrito, d.nIe > 0 ? d.sumaProm / d.nIe : 0);
    }
    const coberturaPorDistrito: IUgelDashboardDistrito[] = [...distritoMap.entries()]
      .map(([distrito, { total, monitoreadas: m }]) => ({
        distrito,
        totalInstituciones: total,
        monitoreadas: m,
        porcentajeCobertura: total > 0 ? Math.round((m / total) * 100) : 0,
        nivelPromedio: Number((promedioPorDistrito.get(distrito) ?? 0).toFixed(2)),
      }))
      .sort((a, b) => a.porcentajeCobertura - b.porcentajeCobertura);

    // 4c. Cobertura del año anterior (para la tendencia del héroe).
    const monitoreadasAnioPrevio = await this.prisma.institucionEducativa.count({
      where: {
        ...institucionWhere,
        cronogramas: {
          some: {
            estado: 'COMPLETADO',
            fechaProgramada: {
              gte: new Date(Date.UTC(anio - 1, 0, 1)),
              lte: new Date(Date.UTC(anio - 1, 11, 31, 23, 59, 59)),
            },
          },
        },
      },
    });
    const coberturaAnioPrevio =
      totalInstituciones > 0 ? Math.round((monitoreadasAnioPrevio / totalInstituciones) * 100) : 0;

    // 5. Monitoreos recientes (top N por fecha de finalización).
    const monitoreosRecientes: IUgelDashboardMonitoreoReciente[] = fichas
      .slice(0, RECIENTES_LIMIT)
      .map((ficha) => {
        const ie = ficha.cronograma.institucion;
        const monitor = ficha.cronograma.monitor.persona;
        return {
          fichaId: ficha.id,
          institucionNombre: ie.nombre,
          institucionCodigoModular: ie.codigoModular,
          nivelEducativo: ficha.cronograma.nivelEducativo,
          distrito: ie.distrito,
          especialistaNombre: `${monitor.nombres} ${monitor.apellidos}`.trim(),
          fecha: (ficha.finalizadaAt ?? ficha.createdAt).toISOString(),
          nivelLogro: ficha.nivelLogro as NivelLogro,
          promedio: Number(ficha.promedio),
        };
      });

    // 6. Evolución mensual: fichas finalizadas por mes (12 meses del año).
    const evolucionMensual: IUgelDashboardEvolucionMes[] = Array.from({ length: 12 }, (_, i) => ({
      mes: i + 1,
      monitoreos: 0,
    }));
    for (const ficha of fichas) {
      const ref = ficha.finalizadaAt ?? ficha.createdAt;
      const mesIdx = ref.getUTCMonth(); // 0–11
      if (mesIdx >= 0 && mesIdx < 12) evolucionMensual[mesIdx].monitoreos += 1;
    }

    // 7. Ranking de especialistas por número de monitoreos (con su promedio).
    type EspAcc = { nombre: string; n: number; suma: number };
    const espAcc = new Map<string, EspAcc>();
    for (const ficha of fichas) {
      const m = ficha.cronograma.monitor;
      const acc = espAcc.get(m.id) ?? {
        nombre: `${m.persona.nombres} ${m.persona.apellidos}`.trim(),
        n: 0,
        suma: 0,
      };
      acc.n += 1;
      acc.suma += Number(ficha.promedio);
      espAcc.set(m.id, acc);
    }
    const rankingEspecialistas: IUgelDashboardEspecialistaRanking[] = [...espAcc.entries()]
      .map(([especialistaId, a]) => ({
        especialistaId,
        nombre: a.nombre,
        monitoreos: a.n,
        promedio: Number((a.suma / a.n).toFixed(2)),
      }))
      .sort((a, b) => b.monitoreos - a.monitoreos || b.promedio - a.promedio)
      .slice(0, RANKING_ESPECIALISTAS_LIMIT);

    // 8. Deterioro por distrito: promedio del año vs. el del año anterior.
    const fichasPrevias = await this.prisma.fichaMonitoreo.findMany({
      where: {
        estado: 'FINALIZADO',
        anioAcademico: anio - 1,
        ...this.scopeFilter.forFicha(ctx),
      },
      select: {
        promedio: true,
        cronograma: {
          select: { institucionId: true, institucion: { select: { distrito: true } } },
        },
      },
    });
    // Promedio previo por distrito (media de promedios institucionales del año anterior).
    const ieePrevia = new Map<string, { distrito: string; suma: number; n: number }>();
    for (const f of fichasPrevias) {
      const ieId = f.cronograma.institucionId;
      const acc = ieePrevia.get(ieId) ?? {
        distrito: f.cronograma.institucion.distrito,
        suma: 0,
        n: 0,
      };
      acc.suma += Number(f.promedio);
      acc.n += 1;
      ieePrevia.set(ieId, acc);
    }
    const distritoPrevio = new Map<string, { suma: number; n: number }>();
    for (const acc of ieePrevia.values()) {
      const d = distritoPrevio.get(acc.distrito) ?? { suma: 0, n: 0 };
      d.suma += acc.suma / acc.n;
      d.n += 1;
      distritoPrevio.set(acc.distrito, d);
    }
    const distritosDeterioro: IUgelDashboardDistritoDeterioro[] = [];
    for (const [distrito, prev] of distritoPrevio.entries()) {
      const actual = promedioPorDistrito.get(distrito);
      if (actual === undefined || actual === 0) continue; // sin dato actual comparable
      const promedioPrevio = Number((prev.suma / prev.n).toFixed(2));
      const promedioActual = Number(actual.toFixed(2));
      const delta = Number((promedioActual - promedioPrevio).toFixed(2));
      if (delta < 0) distritosDeterioro.push({ distrito, promedioActual, promedioPrevio, delta });
    }
    distritosDeterioro.sort((a, b) => a.delta - b.delta);

    // 9. Años con datos de monitoreo (para el selector de año).
    const aniosRows = await this.prisma.fichaMonitoreo.findMany({
      where: { estado: 'FINALIZADO', ...this.scopeFilter.forFicha(ctx) },
      distinct: ['anioAcademico'],
      select: { anioAcademico: true },
      orderBy: { anioAcademico: 'desc' },
    });
    const aniosSet = new Set<number>(aniosRows.map((r) => r.anioAcademico));
    aniosSet.add(anio); // el año consultado siempre debe estar disponible
    const aniosDisponibles = [...aniosSet].sort((a, b) => b - a);

    return {
      anio,
      kpis: {
        totalInstituciones,
        monitoreadas,
        pendientes,
        nivelPromedio,
        porcentajeCobertura,
      },
      semaforo: { critico, enProceso, logroPrevisto, sinRegistro },
      distritosCriticos,
      requierenAtencion,
      coberturaPorDistrito,
      institucionesMapa,
      coberturaAnioPrevio,
      monitoreosRecientes,
      evolucionMensual,
      rankingEspecialistas,
      distritosDeterioro,
      aniosDisponibles,
    };
  }

  async getInstitucionDetalle(
    session: SessionScope,
    institucionId: string,
    anio: number,
  ): Promise<IUgelDashboardInstitucionDetalle> {
    const ctx = this.toScopeContext(session);
    const inicioAnio = new Date(Date.UTC(anio, 0, 1));
    const finAnio = new Date(Date.UTC(anio, 11, 31, 23, 59, 59));

    const ie = await this.prisma.institucionEducativa.findUnique({
      where: { id: institucionId },
      select: {
        id: true,
        nombre: true,
        codigoModular: true,
        distrito: true,
        nivelEducativo: true,
      },
    });
    if (!ie) throw new NotFoundException('Institución no encontrada.');

    const anioRango = { fechaProgramada: { gte: inicioAnio, lte: finAnio } };
    const [director, totalDocentes, monitoreosProgramados, monitoreosRealizados, fichasIe] =
      await Promise.all([
        this.prisma.docente.findFirst({
          where: {
            institucionId,
            docenteCargos: { some: { cargo: { nombre: 'Director' }, fechaFin: null } },
          },
          select: { persona: { select: { nombres: true, apellidos: true } } },
        }),
        this.prisma.docente.count({ where: { institucionId, estado: 'Activo' } }),
        // Monitoreos escopados por rol (forCronograma): el especialista ve su
        // propia cobertura de esta IE, coherente con docentesMonitoreados. El
        // Jefe de Gestión (scope vacío) los ve todos. AND evita pisar `institucionId`.
        this.prisma.cronograma.count({
          where: { AND: [this.scopeFilter.forCronograma(ctx), { institucionId, ...anioRango }] },
        }),
        this.prisma.cronograma.count({
          where: {
            AND: [
              this.scopeFilter.forCronograma(ctx),
              { institucionId, estado: 'COMPLETADO', ...anioRango },
            ],
          },
        }),
        // Fichas finalizadas de esta IE, escopadas por el rol de quien consulta
        // (el especialista solo ve las que él monitoreó). Se combina el scope con
        // la IE vía AND para no pisar la clave `cronograma` de algunos scopes.
        this.prisma.fichaMonitoreo.findMany({
          where: {
            estado: 'FINALIZADO',
            anioAcademico: anio,
            AND: [this.scopeFilter.forFicha(ctx), { cronograma: { institucionId } }],
          },
          select: {
            promedio: true,
            nivelLogro: true,
            finalizadaAt: true,
            createdAt: true,
            cronograma: {
              select: {
                tipoMonitoreo: true,
                evaluadoId: true,
                evaluado: {
                  select: {
                    persona: { select: { nombres: true, apellidos: true } },
                    docenteEspecialidades: {
                      select: { especialidad: { select: { nombre: true } } },
                    },
                  },
                },
              },
            },
          },
          orderBy: [{ finalizadaAt: 'desc' }, { createdAt: 'desc' }],
        }),
      ]);

    // Última ficha por docente (las fichas ya vienen desc): la primera que
    // veamos por docente es la más reciente.
    const ultimaPorDocente = new Map<string, (typeof fichasIe)[number]>();
    for (const ficha of fichasIe) {
      const docId = ficha.cronograma.evaluadoId;
      if (!ultimaPorDocente.has(docId)) ultimaPorDocente.set(docId, ficha);
    }
    const docentesMonitoreados = [...ultimaPorDocente.values()].map((ficha) => {
      const c = ficha.cronograma;
      const p = c.evaluado.persona;
      const especialidades = c.evaluado.docenteEspecialidades
        .map((de) => de.especialidad.nombre)
        .filter(Boolean);
      return {
        docenteId: c.evaluadoId,
        nombre: `${p.nombres} ${p.apellidos}`.trim(),
        cargo: c.tipoMonitoreo === 'DIRECTIVO' ? 'Directivo' : 'Docente',
        especialidad: especialidades.length > 0 ? especialidades.join(', ') : null,
        nivelLogro: ficha.nivelLogro as NivelLogro,
        promedio: Number(ficha.promedio),
      };
    });
    docentesMonitoreados.sort((a, b) => a.promedio - b.promedio);

    const porcentajeCobertura =
      monitoreosProgramados > 0
        ? Math.round((monitoreosRealizados / monitoreosProgramados) * 100)
        : 0;

    return {
      institucionId: ie.id,
      nombre: ie.nombre,
      codigoModular: ie.codigoModular,
      distrito: ie.distrito,
      nivelEducativo: ie.nivelEducativo,
      director: director?.persona
        ? `${director.persona.nombres} ${director.persona.apellidos}`.trim()
        : null,
      totalDocentes,
      monitoreosRealizados,
      monitoreosProgramados,
      porcentajeCobertura,
      docentesMonitoreados,
    };
  }
}
