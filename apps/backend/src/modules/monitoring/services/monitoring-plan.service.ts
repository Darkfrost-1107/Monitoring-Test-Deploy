import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  IMonitoringPlanResponse,
  IPlanInstitucionCubierta,
} from '@sistema-monitoreo/shared-contracts';
import { MonitoringPlanRepository } from '../repositories/monitoring-plan.repository.js';
import { CreatePlanDto } from '../dto/create-plan.dto.js';
import { Prisma } from '../../../generated/prisma/client.js';
import type { QueryPlanDto } from '../dto/query-plan.dto.js';
import { PrerrequisitosDirectorService } from './prerrequisitos-director.service.js';
import {
  motivoInactivacionBloqueada,
  tieneDependenciasActivas,
} from './inactivacion-plan.helper.js';
import { RoleCode } from '../../../common/enums/role.enum.js';
import type { SessionUser } from '../../../shared/types/session-user.js';

@Injectable()
export class MonitoringPlanService {
  constructor(
    private readonly repository: MonitoringPlanRepository,
    private readonly prerrequisitos: PrerrequisitosDirectorService,
  ) {}

  async findAll(filters?: QueryPlanDto, session?: SessionUser): Promise<IMonitoringPlanResponse[]> {
    const scopedFilters = { ...filters };
    if (session) {
      if (this.isSchoolStaff(session) && session.institucionId) {
        // Todo el personal de I.E. —Director, Coordinador Pedagógico y Jefe de
        // Taller— ve sólo los planes de SU institución (mas los de la UGEL, que
        // el repositorio agrega). Antes se acotaba únicamente al Director, y el
        // Coordinador y el Jefe de Taller veían los planes de cualquier I.E.
        scopedFilters.institucionId = session.institucionId;
      } else if (session.role === RoleCode.JEFE_AREA) {
        // Jefe de Area solo ve planes UGEL
        scopedFilters.tipoEntidad = 'UGEL';
      }
      // JEFE_GESTION no se le aplica filtro restrictivo, puede ver de UGEL y de IE
    }
    return this.repository.findAll(scopedFilters);
  }

  async findById(id: string, session?: SessionUser): Promise<IMonitoringPlanResponse> {
    const plan = await this.repository.findById(id);
    if (!plan) {
      throw new NotFoundException(`Plan de monitoreo con ID ${id} no encontrado.`);
    }
    if (session && !this.puedeVerPlan(session, plan)) {
      throw new ForbiddenException('No cuenta con permisos para ver este plan.');
    }
    return plan;
  }

  async create(dto: CreatePlanDto, session: SessionUser): Promise<IMonitoringPlanResponse> {
    // El coordinador y el jefe de taller no suben su plan anual hasta que el
    // director de la I.E. subió el suyo y definió su plantilla. `asegurar` no
    // hace nada para el director: es quien cumple la regla.
    await this.prerrequisitos.asegurar(session);
    const { tipoEntidad, institucionId } = this.resolvePlanScope(session, dto);
    const rolAutor = this.toRolAutor(session.role);

    const estado = dto.estado || 'Activo';

    if (estado === 'Activo') {
      // Unicidad: UGEL -> 1 plan activo por año (global). IE -> 1 plan activo por
      // año POR AUTOR: cada persona (Director, cada Coordinador, cada Jefe de
      // Taller) tiene el suyo; varios coordinadores de una misma IE conviven.
      const existing = await this.repository.findAll({
        anioAcademico: dto.anioAcademico,
        tipoEntidad,
        estado: 'Activo',
      });

      const isDuplicate = existing.some((plan) => {
        if (tipoEntidad === 'IE') {
          return plan.institucionId === institucionId && plan.autorId === session.id;
        }
        return true; // Para UGEL es global por año
      });

      if (isDuplicate) {
        throw new ConflictException(
          tipoEntidad === 'UGEL'
            ? 'Solo se puede subir 1 plan de monitoreo activo por año para la UGEL. Si desea subirlo como Inactivo, cambie el estado en el formulario.'
            : 'Ya tienes un plan de monitoreo activo para esta Institución Educativa este año. Desactiva el anterior o súbelo como Inactivo.',
        );
      }
    }

    return this.repository.create({
      titulo: dto.titulo,
      anioAcademico: dto.anioAcademico,
      archivoUrl: dto.archivoUrl!,
      tipoEntidad,
      estado,
      autorId: session.id,
      rolAutorAlCrear: rolAutor,
      institucionId,
    });
  }

  async toggleEstado(id: string, session?: SessionUser): Promise<IMonitoringPlanResponse> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Plan de monitoreo con ID ${id} no encontrado.`);
    }
    if (session && !this.puedeGestionarPlan(session, existing)) {
      throw new ForbiddenException('No cuenta con permisos para modificar este plan.');
    }
    if (existing.estado === 'Inactivo') {
      const existingActivos = await this.repository.findAll({
        anioAcademico: existing.anioAcademico,
        tipoEntidad: existing.tipoEntidad,
        estado: 'Activo',
      });
      const isDuplicate = existingActivos.some((p) => {
        if (existing.tipoEntidad === 'IE') {
          // Mismo autor dentro de la misma IE.
          return p.institucionId === existing.institucionId && p.autorId === existing.autorId;
        }
        return true;
      });
      if (isDuplicate) {
        throw new ConflictException(
          `Ya existe un plan de monitoreo activo tuyo para el año ${existing.anioAcademico}. Desactívalo primero antes de reactivar este.`,
        );
      }
    } else {
      // Activo → Inactivo: no se retira un plan que sostiene monitoreo en curso.
      const dependencias = await this.repository.contarDependencias(
        existing.id,
        existing.institucionId,
        existing.anioAcademico,
      );
      if (tieneDependenciasActivas(dependencias)) {
        throw new ConflictException(motivoInactivacionBloqueada(dependencias));
      }
    }

    return this.repository.softDelete(id);
  }

  async hardDelete(
    id: string,
    session?: SessionUser,
  ): Promise<{ success: boolean; message: string }> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Plan de monitoreo con ID ${id} no encontrado.`);
    }
    if (session && !this.puedeGestionarPlan(session, existing)) {
      throw new ForbiddenException('No cuenta con permisos para eliminar este plan.');
    }

    // Si tiene plantillas o cronogramas amarrados, prisma lanzará error de foreign key.
    // Lo cual está bien, no se puede eliminar un plan que ya está en uso, a menos que
    // lo hagamos en cascada o capturemos el error.
    try {
      await this.repository.hardDelete(id);
      return { success: true, message: 'Plan eliminado por completo.' };
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        // Foreign key constraint failed
        throw new ConflictException(
          'No se puede eliminar el plan porque ya tiene plantillas o visitas (cronogramas) asociados.',
        );
      }
      throw e;
    }
  }

  async findCobertura(id: string, session?: SessionUser): Promise<IPlanInstitucionCubierta[]> {
    const plan = await this.findById(id, session);
    return this.repository.findCobertura(plan.id);
  }

  async addCobertura(
    id: string,
    institucionId: string,
    session: SessionUser,
  ): Promise<IPlanInstitucionCubierta[]> {
    if (this.isDirector(session)) {
      throw new ForbiddenException(
        'Directores IE no pueden modificar la cobertura de planes UGEL.',
      );
    }
    const plan = await this.findById(id, session);
    await this.repository.addCobertura(plan.id, institucionId);
    return this.repository.findCobertura(plan.id);
  }

  async removeCobertura(
    id: string,
    institucionId: string,
    session: SessionUser,
  ): Promise<IPlanInstitucionCubierta[]> {
    if (this.isDirector(session)) {
      throw new ForbiddenException(
        'Directores IE no pueden modificar la cobertura de planes UGEL.',
      );
    }
    const plan = await this.findById(id, session);
    await this.repository.removeCobertura(plan.id, institucionId);
    return this.repository.findCobertura(plan.id);
  }

  private isDirector(session: SessionUser): boolean {
    return session.role === RoleCode.DIRECTOR_INSTITUCION;
  }

  /**
   * Si esta sesión puede abrir este plan concreto.
   *
   * Es la puerta que `findById` debe cerrar además del listado: el PDF se
   * descarga por id (`GET /planes/:id/archivo`), así que conocer el id de un
   * plan ajeno no debe alcanzar.
   *
   * - Personal de I.E.: los planes de la UGEL y los de SU propia institución.
   *   El del plan de otra I.E. queda fuera.
   * - Jefe de Área: sólo los de la UGEL.
   * - Jefe de Gestión y demás: sin restricción acá.
   */
  private puedeVerPlan(session: SessionUser, plan: IMonitoringPlanResponse): boolean {
    if (this.isSchoolStaff(session)) {
      if (plan.tipoEntidad === 'UGEL') return true;
      return plan.institucionId === session.institucionId;
    }
    if (session.role === RoleCode.JEFE_AREA) {
      return plan.tipoEntidad === 'UGEL';
    }
    return true;
  }

  /**
   * Si esta sesión puede MODIFICAR o eliminar este plan.
   *
   * Más estricto que ver: el personal de I.E. gestiona los planes de SU
   * institución y NO los de la UGEL. El listado y `findById` ya se controlaban
   * por tipo de entidad, pero no por institución: un Coordinador podía cambiar
   * el estado o borrar el plan de OTRA I.E. conociendo su id, porque caía en la
   * rama que no comprobaba nada.
   */
  private puedeGestionarPlan(session: SessionUser, plan: IMonitoringPlanResponse): boolean {
    if (this.isSchoolStaff(session)) {
      return plan.tipoEntidad === 'IE' && plan.institucionId === session.institucionId;
    }
    if (session.role === RoleCode.JEFE_GESTION) {
      return plan.tipoEntidad !== 'IE';
    }
    return true;
  }

  /** Personal de IE: Director, Coordinador Pedagógico y Jefe de Taller. */
  private isSchoolStaff(session: SessionUser): boolean {
    return (
      session.role === RoleCode.DIRECTOR_INSTITUCION ||
      session.role === RoleCode.COORDINADOR_PEDAGOGICO ||
      session.role === RoleCode.JEFE_TALLER
    );
  }

  /** Ámbito del plan según el rol del autor (sello histórico + unicidad por IE). */
  private toRolAutor(role: RoleCode): string {
    switch (role) {
      case RoleCode.DIRECTOR_INSTITUCION:
        return 'director_ie';
      case RoleCode.COORDINADOR_PEDAGOGICO:
        return 'coordinador_pedagogico';
      case RoleCode.JEFE_TALLER:
        return 'jefe_taller';
      default:
        return 'jefe_gestion';
    }
  }

  private resolvePlanScope(
    session: SessionUser,
    dto: CreatePlanDto,
  ): { tipoEntidad: string; institucionId: string | null } {
    if (this.isSchoolStaff(session)) {
      const institucionId = session.institucionId ?? dto.institucionId ?? null;
      if (!institucionId) {
        throw new ForbiddenException(
          'El personal de IE debe tener institucionId en sesion o body para crear un plan.',
        );
      }
      return { tipoEntidad: 'IE', institucionId };
    }
    return { tipoEntidad: 'UGEL', institucionId: null };
  }
}
