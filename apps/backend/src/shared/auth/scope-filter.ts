import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { RoleCode } from '../../common/enums/role.enum.js';

/**
 * Contexto de scope que recibe ScopeFilter. Construido a partir del
 * `req.user` (JwtPayload) en el service que llama.
 */
export interface ScopeContext {
  userId: string;
  role: RoleCode;
  /**
   * id de la institucion a la que el usuario esta vinculado (para
   * director_institucion / coordinador_pedagogico / jefe_taller / docente).
   * Null para usuarios UGEL (jefe_gestion, jefe_area, especialista, director_ugel, invitado).
   */
  institucionId?: string | null;
  /**
   * nivelEducativo del Especialista (jefe_area). Necesario para filtrar
   * instituciones por nivel en `forInstitucion`.
   */
  especialistaNivel?: string | null;
  especialistaEspecialidades?: string[] | null;
}

/**
 * ScopeFilter — helper centralizado que traduce el `ScopeContext` del
 * usuario en `Prisma.<Model>WhereInput` para los queries.
 *
 * Patrones soportados:
 *  - ALL      : jefe_gestion, director_ugel, invitado. Ven todo.
 *  - INSTITUCION: director_institucion, coord_pedagogico, jefe_taller.
 *               Ven solo lo de su institucionId.
 *  - MONITOR  : especialista. Ve solo donde es el monitor (cronograma/ficha).
 *  - SCOPE_JEFE_AREA: jefe_area. Filtra por nivel educativo (reglas
 *                    distintas segun Inicial / Primaria / Secundaria).
 *  - OWN      : docente. Ve solo lo propio.
 *
 * Si el `institucionId` es null pero el rol lo necesita para filtrar,
 * el filtro retorna `{ id: { in: [] } }` (un sentinel que no matchea
 * ninguna fila) para que la query devuelva vacio. Esto evita leaks
 * por falta de datos de scope.
 */
@Injectable()
export class ScopeFilter {
  // ── Predicados de scope ─────────────────────────────────────────────

  isAllScope(role: RoleCode): boolean {
    return (
      role === RoleCode.JEFE_GESTION ||
      role === RoleCode.DIRECTOR_UGEL ||
      role === RoleCode.INVITADO
    );
  }

  isInstitucionScope(role: RoleCode): boolean {
    return (
      role === RoleCode.DIRECTOR_INSTITUCION ||
      role === RoleCode.COORDINADOR_PEDAGOGICO ||
      role === RoleCode.JEFE_TALLER
    );
  }

  /**
   * Roles que, en el análisis de desempeño, sólo ven lo que ellos mismos monitorearon.
   *
   * El coordinador pedagógico y el jefe de taller pertenecen a una institución, y
   * su alcance general es la institución entera. Pero el análisis de rúbricas mide
   * el trabajo de quien monitorea, así que cada uno ve únicamente sus evaluaciones,
   * no las de otros monitores de su colegio. La lista de fichas ya se acotaba así
   * en el frontend; esto lo hace valer también en el backend, donde se consolida.
   */
  limitaAlAnalisisPropio(role: RoleCode): boolean {
    return role === RoleCode.COORDINADOR_PEDAGOGICO || role === RoleCode.JEFE_TALLER;
  }

  isMonitorScope(role: RoleCode): boolean {
    return role === RoleCode.ESPECIALISTA;
  }

  isJefeAreaScope(role: RoleCode): boolean {
    return role === RoleCode.JEFE_AREA;
  }

  isOwnScope(role: RoleCode): boolean {
    return role === RoleCode.DOCENTE;
  }

  // ── Filtros por entidad ─────────────────────────────────────────────

  /**
   * Filtro para Cronograma.
   *  - ALL: empty
   *  - INSTITUCION: institucionId == ctx.institucionId
   *  - MONITOR: monitorId == ctx.userId
   *  - JEFE_AREA: institucionId in (IEs de su nivel)
   *  - DOCENTE: empty (los docentes no consultan cronogramas, pero por
   *              seguridad devolvemos algo consistente con su rol)
   */
  forCronograma(ctx: ScopeContext): Prisma.CronogramaWhereInput {
    if (this.isAllScope(ctx.role)) return {};
    if (this.isInstitucionScope(ctx.role)) {
      return ctx.institucionId ? { institucionId: ctx.institucionId } : { id: { in: [] } };
    }
    if (this.isMonitorScope(ctx.role)) {
      return { monitorId: ctx.userId };
    }
    if (this.isJefeAreaScope(ctx.role)) {
      return { institucion: this.forInstitucion(ctx) };
    }
    if (this.isOwnScope(ctx.role)) {
      return {
        evaluado: {
          persona: {
            usuario: {
              id: ctx.userId,
            },
          },
        },
      };
    }
    // invitado, etc.
    return { id: { in: [] } };
  }

  /**
   * Filtro para FichaMonitoreo. Misma logica que cronograma pero el
   * Especialista mira `creadoPorId` en vez de `monitorId`. La IE no es
   * campo directo de FichaMonitoreo — va via `cronograma`.
   */
  /**
   * Fichas cuyo monitor es el propio usuario.
   *
   * Se identifica por la persona del monitor (`cronograma.monitor`), la misma
   * identidad que usa el frontend para decidir qué le pertenece, y no por
   * `creadoPorId`: quien levantó la ficha y quien figura como monitor de la visita
   * no tienen por qué coincidir.
   */
  forFichasQueMonitoreo(ctx: ScopeContext): Prisma.FichaMonitoreoWhereInput {
    return { cronograma: { monitor: { persona: { usuario: { id: ctx.userId } } } } };
  }

  forFicha(ctx: ScopeContext): Prisma.FichaMonitoreoWhereInput {
    if (this.isAllScope(ctx.role)) return {};
    if (this.isInstitucionScope(ctx.role)) {
      return ctx.institucionId
        ? { cronograma: { institucionId: ctx.institucionId } }
        : { id: { in: [] } };
    }
    if (this.isMonitorScope(ctx.role)) {
      return { creadoPorId: ctx.userId };
    }
    if (this.isJefeAreaScope(ctx.role)) {
      // Jefe de Área ve las fichas de SU nivel educativo (Inicial / Primaria /
      // Secundaria). El nivel es el del monitoreo (cronograma.nivelEducativo,
      // el que muestra la tarjeta), NO el del monitor: un especialista puede
      // monitorear otro nivel, y filtrar por el monitor filtraría lo incorrecto.
      return { cronograma: { nivelEducativo: ctx.especialistaNivel ?? '__none__' } };
    }
    if (this.isOwnScope(ctx.role)) {
      return {
        cronograma: {
          evaluado: {
            persona: {
              usuario: {
                id: ctx.userId,
              },
            },
          },
        },
      };
    }
    return { id: { in: [] } };
  }

  /**
   * Where de Institucion acotado a un nivel educativo, con las reglas de
   * modalidad del dominio (PROJECT_DOCUMENTATION §5.3):
   *  - Inicial: EBR Inicial o EBE (Especial)
   *  - Primaria: EBR Primaria
   *  - Secundaria: EBR Secundaria, EBA o CEPTRO
   * Sin nivel (o nivel desconocido) devuelve el sentinela vacio.
   */
  private nivelInstitucionWhere(nivel?: string | null): Prisma.InstitucionEducativaWhereInput {
    if (!nivel) return { id: { in: [] } };
    if (nivel === 'Inicial') {
      return {
        OR: [
          { modalidad: 'EBE' },
          { modalidad: 'EBR', nivelEducativo: { equals: 'Inicial', mode: 'insensitive' } },
        ],
      };
    }
    if (nivel === 'Primaria') {
      return { modalidad: 'EBR', nivelEducativo: { equals: 'Primaria', mode: 'insensitive' } };
    }
    if (nivel === 'Secundaria') {
      return {
        OR: [
          { modalidad: 'EBR', nivelEducativo: { equals: 'Secundaria', mode: 'insensitive' } },
          { modalidad: 'EBA' },
          { modalidad: 'CEPTRO' },
        ],
      };
    }
    return { id: { in: [] } };
  }

  /**
   * Filtro para Institucion.
   *  - ALL: empty
   *  - JEFE_AREA: acotado al nivel educativo del jefe (ver nivelInstitucionWhere).
   *              Supervisa el nivel completo, sin acotar por especialidad.
   *  - INSTITUCION: institucionId == ctx.institucionId
   *  - MONITOR (especialista): acotado a las IEs de SU nivel educativo y —si el
   *              especialista tiene especialidad(es)— además a las IEs que tengan
   *              al menos un docente ACTIVO con alguna de esas especialidades. Así
   *              un especialista de Primaria–Educación Física solo ve IEs de
   *              Primaria con docentes de Educación Física; uno sin especialidad
   *              ve todo su nivel.
   *  - OWN: institucionId == ctx.institucionId
   *  - DOCENTE: institucionId == ctx.institucionId
   */
  forInstitucion(ctx: ScopeContext): Prisma.InstitucionEducativaWhereInput {
    if (this.isAllScope(ctx.role)) return {};
    if (this.isJefeAreaScope(ctx.role)) {
      return this.nivelInstitucionWhere(ctx.especialistaNivel);
    }
    if (this.isMonitorScope(ctx.role)) {
      const porNivel = this.nivelInstitucionWhere(ctx.especialistaNivel);
      const especialidades = ctx.especialistaEspecialidades;
      if (!especialidades || especialidades.length === 0) return porNivel;
      return {
        AND: [
          porNivel,
          {
            docentes: {
              some: {
                estado: 'Activo',
                docenteEspecialidades: {
                  some: { especialidad: { nombre: { in: especialidades } } },
                },
              },
            },
          },
        ],
      };
    }
    if (this.isInstitucionScope(ctx.role) || this.isOwnScope(ctx.role)) {
      return ctx.institucionId ? { id: ctx.institucionId } : { id: { in: [] } };
    }
    return { id: { in: [] } };
  }

  /**
   * Filtro para Docente. Mismas reglas que Institucion (el director ve
   * los docentes de su IE, jefe_area los docentes de las IEs de su nivel,
   * jefe_gestion todo, etc.).
   */
  forDocente(ctx: ScopeContext): Prisma.DocenteWhereInput {
    if (this.isAllScope(ctx.role)) return {};
    if (this.isInstitucionScope(ctx.role) || this.isOwnScope(ctx.role)) {
      return ctx.institucionId ? { institucionId: ctx.institucionId } : { id: { in: [] } };
    }
    if (this.isJefeAreaScope(ctx.role)) {
      return { institucion: this.forInstitucion(ctx) };
    }
    return { id: { in: [] } };
  }

  /**
   * Filtro para Reporte (fichas_completadas, resumen_ie, etc.).
   * Misma logica que Ficha (porque los reportes derivan de fichas).
   */
  forReporte(ctx: ScopeContext): Prisma.FichaMonitoreoWhereInput {
    return this.forFicha(ctx);
  }
}
