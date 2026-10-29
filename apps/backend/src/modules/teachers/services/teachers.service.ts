import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateDocenteDto } from '../dto/create-docente.dto.js';
import { UpdateDocenteDto } from '../dto/update-docente.dto.js';
import { RoleCode } from '../../../common/enums/role.enum.js';
import { EstadoRegistro } from '../../../common/enums/estado.enum.js';
import {
  TeachersRepository,
  DocenteFilter,
  DocenteEntity,
} from '../repositories/teachers.repository.js';
import { CatalogsRepository } from '../../catalogs/repositories/catalogs.repository.js';
import { JwtPayload } from '../../auth/services/auth-token.service.js';
import {
  requirePermission,
  requireAnyPermission,
  getDirectorInstitucionId,
  validateInstitucionOwnership,
  validateCargoExists,
  validateCargoRestrictivo,
  validateDirectorCannotAssignDirector,
  validateDirectorCannotBajaAltaDirector,
  validateJefeAreaCanAssign,
  validateJefeAreaCanManageDocente,
  findActiveCargo,
} from './docente-service.validator.js';
import { CargoNombre } from '../../../common/enums/cargo.enum.js';

export type CurrentUser = Pick<
  JwtPayload,
  'sub' | 'role' | 'permissions' | 'colegio_id' | 'institucion_id' | 'especialista_nivel'
>;

@Injectable()
export class TeachersService {
  constructor(
    private readonly teachersRepository: TeachersRepository,
    private readonly catalogsRepository: CatalogsRepository,
  ) {}

  async createDocente(dto: CreateDocenteDto, currentUser: CurrentUser): Promise<DocenteEntity> {
    requirePermission(currentUser, 'docentes:write');

    if (currentUser.role === RoleCode.DIRECTOR_INSTITUCION) {
      validateInstitucionOwnership(currentUser, dto.institucionId);
    }

    const institucion = await this.catalogsRepository.findInstitucionById(dto.institucionId);
    if (!institucion) {
      throw new NotFoundException('La institución educativa especificada no existe.');
    }

    const cargo = await validateCargoExists(this.catalogsRepository, dto.cargoId);
    validateCargoRestrictivo(
      cargo.nombre,
      dto.nivelEducativo,
      dto.cargaLaboral,
      dto.condicionLaboral,
    );
    validateDirectorCannotAssignDirector(currentUser, cargo.nombre);

    if (currentUser.role === RoleCode.JEFE_AREA) {
      validateJefeAreaCanAssign(cargo.nombre);
    }

    return this.teachersRepository.createDocenteWithTransaction(dto);
  }

  async getDocentes(currentUser: CurrentUser): Promise<DocenteEntity[]> {
    requirePermission(currentUser, 'docentes:read');

    const filter: DocenteFilter = {};
    if (currentUser.role === RoleCode.DIRECTOR_INSTITUCION) {
      filter.institucionId = getDirectorInstitucionId(currentUser);
    }
    if (currentUser.role === RoleCode.JEFE_AREA && currentUser.especialista_nivel) {
      filter.especialistaNivel = currentUser.especialista_nivel;
    }

    return this.teachersRepository.findDocentes(filter);
  }

  async findPersonaByDni(dni: string, currentUser: CurrentUser): Promise<any> {
    // Búsqueda transversal: la usan los gestores de docentes/directores y también
    // el superadmin (que solo tiene permisos de especialistas) al registrar cargos.
    requireAnyPermission(currentUser, ['docentes:read', 'especialistas:read']);
    return this.teachersRepository.findPersonaByDni(dni);
  }

  async getCargos(): Promise<any[]> {
    return this.catalogsRepository.findCargos();
  }

  async updateDocente(
    id: string,
    dto: UpdateDocenteDto,
    currentUser: CurrentUser,
  ): Promise<DocenteEntity> {
    requirePermission(currentUser, 'docentes:write');

    const docente = await this.teachersRepository.findDocenteById(id);
    if (!docente) {
      throw new NotFoundException('El docente especificado no existe.');
    }

    validateInstitucionOwnership(currentUser, docente.institucionId);

    const cargo = await validateCargoExists(this.catalogsRepository, dto.cargoId);
    validateCargoRestrictivo(
      cargo.nombre,
      dto.nivelEducativo,
      dto.cargaLaboral,
      dto.condicionLaboral,
    );
    validateDirectorCannotAssignDirector(currentUser, cargo.nombre);

    if (currentUser.role === RoleCode.JEFE_AREA) {
      validateJefeAreaCanAssign(cargo.nombre);
      await validateJefeAreaCanManageDocente(currentUser, docente, this.catalogsRepository);
    }

    if (dto.correo) {
      const emailInUse = await this.catalogsRepository.findPersonaByEmailNotId(
        dto.correo,
        docente.personaId,
      );
      if (emailInUse) {
        throw new ConflictException('El correo electrónico ya está registrado para otra persona.');
      }
    }

    const activeCargo = findActiveCargo(docente);
    return this.teachersRepository.updateDocenteWithTransaction(
      id,
      dto,
      activeCargo,
      docente.personaId,
    );
  }

  async bajaDocente(
    id: string,
    currentUser: CurrentUser,
  ): Promise<{
    success: boolean;
    message: string;
    docente: {
      id: string;
      estado: string;
      persona: { dni: string; nombres: string; apellidos: string };
    };
  }> {
    requirePermission(currentUser, 'docentes:write');

    const docente = await this.teachersRepository.findDocenteById(id);
    if (!docente) {
      throw new NotFoundException('El docente especificado no existe.');
    }

    validateInstitucionOwnership(currentUser, docente.institucionId);

    if (currentUser.role === RoleCode.DIRECTOR_INSTITUCION) {
      const activeCargoObj = findActiveCargo(docente);
      if (activeCargoObj) {
        const currentCargo = await this.catalogsRepository.findCargoById(activeCargoObj.cargoId);
        validateDirectorCannotBajaAltaDirector(currentUser, currentCargo?.nombre ?? '');
      }
    }

    if (currentUser.role === RoleCode.JEFE_AREA) {
      await validateJefeAreaCanManageDocente(currentUser, docente, this.catalogsRepository);
    }

    let updatedDocente;
    const activeCargo = findActiveCargo(docente);
    let isDirector = false;
    if (activeCargo) {
      const cargoCurrent = await this.catalogsRepository.findCargoById(activeCargo.cargoId);
      if (cargoCurrent?.nombre === CargoNombre.DIRECTOR) {
        isDirector = true;
      }
    }

    if (isDirector) {
      updatedDocente = await this.teachersRepository.bajaDirector(id);
    } else {
      updatedDocente = await this.teachersRepository.updateDocenteEstado(
        id,
        EstadoRegistro.INACTIVO,
      );
    }

    return {
      success: true,
      message: 'Docente dado de baja correctamente.',
      docente: {
        id: updatedDocente.id,
        estado: updatedDocente.estado,
        persona: {
          dni: updatedDocente.persona.dni,
          nombres: updatedDocente.persona.nombres,
          apellidos: updatedDocente.persona.apellidos,
        },
      },
    };
  }

  async transicionRolADocente(
    personaId: string,
    dto: CreateDocenteDto,
    currentUser: CurrentUser,
  ): Promise<DocenteEntity> {
    requirePermission(currentUser, 'docentes:write');

    if (currentUser.role === RoleCode.DIRECTOR_INSTITUCION) {
      validateInstitucionOwnership(currentUser, dto.institucionId);
    }

    const institucion = await this.catalogsRepository.findInstitucionById(dto.institucionId);
    if (!institucion) {
      throw new NotFoundException('La institución educativa especificada no existe.');
    }

    const cargo = await validateCargoExists(this.catalogsRepository, dto.cargoId);
    validateCargoRestrictivo(
      cargo.nombre,
      dto.nivelEducativo,
      dto.cargaLaboral,
      dto.condicionLaboral,
    );
    validateDirectorCannotAssignDirector(currentUser, cargo.nombre);

    if (currentUser.role === RoleCode.JEFE_AREA) {
      validateJefeAreaCanAssign(cargo.nombre);
    }

    const rolDocente = await this.catalogsRepository.findRoleByCode('docente');
    if (!rolDocente) {
      throw new Error('El rol de docente no está configurado en el sistema.');
    }

    return this.teachersRepository.transicionEspecialistaADocente(personaId, dto, rolDocente.id);
  }

  async altaDocente(
    id: string,
    currentUser: CurrentUser,
  ): Promise<{
    success: boolean;
    message: string;
    docente: {
      id: string;
      estado: string;
      persona: { dni: string; nombres: string; apellidos: string };
    };
  }> {
    requirePermission(currentUser, 'docentes:write');

    const docente = await this.teachersRepository.findDocenteById(id);
    if (!docente) {
      throw new NotFoundException('El docente especificado no existe.');
    }

    validateInstitucionOwnership(currentUser, docente.institucionId);

    if (currentUser.role === RoleCode.DIRECTOR_INSTITUCION) {
      const activeCargoObj = findActiveCargo(docente);
      if (activeCargoObj) {
        const currentCargo = await this.catalogsRepository.findCargoById(activeCargoObj.cargoId);
        validateDirectorCannotBajaAltaDirector(currentUser, currentCargo?.nombre ?? '');
      }
    }

    if (currentUser.role === RoleCode.JEFE_AREA) {
      await validateJefeAreaCanManageDocente(currentUser, docente, this.catalogsRepository);
    }

    const updatedDocente = await this.teachersRepository.updateDocenteEstado(
      id,
      EstadoRegistro.ACTIVO,
    );

    return {
      success: true,
      message: 'Docente reactivado correctamente.',
      docente: {
        id: updatedDocente.id,
        estado: updatedDocente.estado,
        persona: {
          dni: updatedDocente.persona.dni,
          nombres: updatedDocente.persona.nombres,
          apellidos: updatedDocente.persona.apellidos,
        },
      },
    };
  }

  async getAsignaciones(evaluadorId: string, currentUser: CurrentUser): Promise<any[]> {
    requirePermission(currentUser, 'docentes:read');

    const evaluador = await this.teachersRepository.findDocenteById(evaluadorId);
    if (!evaluador) {
      throw new NotFoundException('El evaluador especificado no existe.');
    }

    if (currentUser.role === RoleCode.DIRECTOR_INSTITUCION) {
      validateInstitucionOwnership(currentUser, evaluador.institucionId);
    }

    return this.teachersRepository.getAsignacionesActivas(evaluadorId);
  }

  async saveAsignaciones(
    evaluadorId: string,
    evaluadoIds: string[],
    currentUser: CurrentUser,
  ): Promise<{ success: boolean; message: string }> {
    requirePermission(currentUser, 'docentes:write');

    const evaluador = await this.teachersRepository.findDocenteById(evaluadorId);
    if (!evaluador) {
      throw new NotFoundException('El evaluador especificado no existe.');
    }

    if (currentUser.role === RoleCode.DIRECTOR_INSTITUCION) {
      validateInstitucionOwnership(currentUser, evaluador.institucionId);
    }

    // Validar que los evaluados pertenezcan a la misma institución
    for (const evaluadoId of evaluadoIds) {
      const evaluado = await this.teachersRepository.findDocenteById(evaluadoId);
      if (!evaluado) {
        throw new NotFoundException(`El docente evaluado con ID ${evaluadoId} no existe.`);
      }
      if (evaluado.institucionId !== evaluador.institucionId) {
        throw new ConflictException(
          `El docente ${evaluado.persona.nombres} no pertenece a la misma institución que el evaluador.`,
        );
      }
    }

    // Verificar conflictos: ¿Algún docente ya tiene otro evaluador activo?
    if (evaluadoIds.length > 0) {
      const conflictos = await this.teachersRepository.checkAsignacionesConflict(
        evaluadorId,
        evaluadoIds,
      );
      if (conflictos.length > 0) {
        const nombresConflicto = conflictos
          .map(
            (c) =>
              `${c.evaluado.persona.nombres} ${c.evaluado.persona.apellidos} (Asignado a: ${c.evaluador.persona.nombres} ${c.evaluador.persona.apellidos})`,
          )
          .join(', ');
        throw new ConflictException(
          `Los siguientes docentes ya están asignados a otro evaluador: ${nombresConflicto}`,
        );
      }
    }

    await this.teachersRepository.syncAsignaciones(evaluadorId, evaluadoIds);

    return {
      success: true,
      message: 'Asignaciones sincronizadas correctamente',
    };
  }
}
