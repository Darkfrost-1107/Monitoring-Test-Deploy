import { ForbiddenException, ConflictException, NotFoundException } from '@nestjs/common';
import { RoleCode } from '../../../common/enums/role.enum.js';
import { CargoNombre } from '../../../common/enums/cargo.enum.js';
import {
  NivelEducativoEBR,
  DocenteCargosRestrictivos,
  CondicionLaboralCargosRestrictivos,
} from '@sistema-monitoreo/shared-contracts';
import type { CatalogsRepository } from '../../catalogs/repositories/catalogs.repository.js';
import type { CurrentUser } from './teachers.service.js';
import type { DocenteEntity } from '../repositories/teachers.repository.js';

export function requirePermission(currentUser: CurrentUser, permission: string): void {
  if (!currentUser.permissions?.includes(permission)) {
    throw new ForbiddenException('No tiene permisos para realizar esta acción.');
  }
}

// Para acciones transversales accesibles desde varios roles con permisos distintos
// (p. ej. la búsqueda de persona por DNI, usada tanto por gestores de docentes como
// por el superadmin al registrar especialistas). Basta con tener uno de los permisos.
export function requireAnyPermission(currentUser: CurrentUser, permissions: string[]): void {
  const tieneAlguno = permissions.some((p) => currentUser.permissions?.includes(p));
  if (!tieneAlguno) {
    throw new ForbiddenException('No tiene permisos para realizar esta acción.');
  }
}

export function getDirectorInstitucionId(currentUser: CurrentUser): string {
  const userInstitucionId = currentUser.colegio_id || currentUser.institucion_id;
  if (!userInstitucionId) {
    throw new ForbiddenException(
      'El director de IE no tiene una institución educativa asignada en su token.',
    );
  }
  return userInstitucionId;
}

export function validateInstitucionOwnership(
  currentUser: CurrentUser,
  docenteInstitucionId: string | null,
): void {
  if (currentUser.role === RoleCode.DIRECTOR_INSTITUCION) {
    const userInstitucionId = getDirectorInstitucionId(currentUser);
    if (docenteInstitucionId !== userInstitucionId) {
      throw new ForbiddenException(
        'No tiene permisos para realizar esta acción en otra institución educativa.',
      );
    }
  }
}

export async function validateCargoExists(catalogsRepository: CatalogsRepository, cargoId: string) {
  const cargo = await catalogsRepository.findCargoById(cargoId);
  if (!cargo) {
    throw new NotFoundException('El cargo especificado no existe.');
  }
  return cargo;
}

export function validateCargoRestrictivo(
  cargoNombre: string,
  nivelEducativo: string,
  cargaLaboral: number | undefined,
  condicionLaboral: string | undefined,
): void {
  const isRestrictivo =
    cargoNombre === DocenteCargosRestrictivos.COORDINADOR_PEDAGOGICO ||
    cargoNombre === DocenteCargosRestrictivos.JEFE_DE_TALLER;

  if (isRestrictivo) {
    if (nivelEducativo !== NivelEducativoEBR.SECUNDARIA) {
      throw new ConflictException(
        `El cargo '${cargoNombre}' solo puede asignarse a docentes del nivel Secundaria.`,
      );
    }
  }

  if (cargoNombre === DocenteCargosRestrictivos.COORDINADOR_PEDAGOGICO) {
    if (cargaLaboral !== 40) {
      throw new ConflictException(
        'Para ser Coordinador Pedagógico, la carga laboral debe ser estrictamente 40 horas.',
      );
    }
  }

  if (isRestrictivo) {
    if (
      !condicionLaboral ||
      !(CondicionLaboralCargosRestrictivos as unknown as string[]).includes(condicionLaboral)
    ) {
      throw new ConflictException(
        `Para el cargo '${cargoNombre}', la condición laboral debe ser Nombrado o Destacado.`,
      );
    }
  }
}

export function validateDirectorCannotAssignDirector(
  currentUser: CurrentUser,
  cargoNombre: string,
): void {
  if (
    currentUser.role === RoleCode.DIRECTOR_INSTITUCION &&
    (cargoNombre as CargoNombre) === CargoNombre.DIRECTOR
  ) {
    throw new ForbiddenException('El Director de I.E. no puede asignar el cargo de Director.');
  }
}

export function validateDirectorCannotBajaAltaDirector(
  currentUser: CurrentUser,
  cargoNombre: string,
): void {
  if (
    currentUser.role === RoleCode.DIRECTOR_INSTITUCION &&
    (cargoNombre as CargoNombre) === CargoNombre.DIRECTOR
  ) {
    throw new ForbiddenException('El Director de I.E. no puede dar de baja/alta a un Director.');
  }
}

export function validateJefeAreaCanAssign(cargoNombre: string): void {
  if (
    (cargoNombre as CargoNombre) !== CargoNombre.DIRECTOR &&
    (cargoNombre as CargoNombre) !== CargoNombre.COORDINADOR_PEDAGOGICO
  ) {
    throw new ForbiddenException(
      'El Responsable de Nivel solo puede registrar directores y coordinadores pedagógicos.',
    );
  }
}

export async function validateJefeAreaCanManageDocente(
  currentUser: CurrentUser,
  docente: DocenteEntity,
  catalogsRepository: CatalogsRepository,
): Promise<void> {
  if (currentUser.role === RoleCode.JEFE_AREA) {
    const activeCargoObj = findActiveCargo(docente);
    if (activeCargoObj) {
      const currentCargo = await catalogsRepository.findCargoById(activeCargoObj.cargoId);
      if (
        currentCargo &&
        (currentCargo.nombre as CargoNombre) !== CargoNombre.DIRECTOR &&
        (currentCargo.nombre as CargoNombre) !== CargoNombre.COORDINADOR_PEDAGOGICO
      ) {
        throw new ForbiddenException(
          'El Responsable de Nivel solo puede gestionar directores y coordinadores pedagógicos.',
        );
      }
    }
  }
}

export function findActiveCargo(docente: DocenteEntity): { cargoId: string } | null {
  return (
    docente.docenteCargos?.find((dc) => dc.fechaFin === null && dc.esPrincipal) ||
    docente.docenteCargos?.find((dc) => dc.fechaFin === null) ||
    null
  );
}
