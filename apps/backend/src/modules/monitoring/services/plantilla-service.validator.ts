import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { IPlantilla, RolAutorPlantilla } from '@sistema-monitoreo/shared-contracts';
import type { CreatePlantillaDto } from '../dto/create-plantilla.dto.js';
import { RoleCode } from '../../../common/enums/role.enum.js';
import type { SessionUser } from '../../../shared/types/session-user.js';

export function validarAnioAcademico(anioAcademico: number): void {
  const currentYear = new Date().getFullYear();
  if (anioAcademico !== currentYear) {
    throw new BadRequestException(
      `Solo se permiten plantillas (creación/duplicación) para el año actual (${currentYear}).`,
    );
  }
}

export function validarReglas(dto: CreatePlantillaDto): void {
  validarAnioAcademico(dto.anioAcademico);
  const nivelesSet = new Set(dto.niveles.map((n) => n.nivelRomano));
  if (nivelesSet.size !== 4) {
    throw new BadRequestException(
      'La plantilla debe tener exactamente 4 niveles (I, II, III, IV).',
    );
  }
  for (const d of dto.desempenos) {
    const rubricaSet = new Set(d.rubrica.map((r) => r.nivelRomano));
    if (rubricaSet.size !== 4) {
      throw new BadRequestException(
        `El desempeno "${d.nombre}" debe tener rubrica para los 4 niveles (I, II, III, IV).`,
      );
    }
  }
}

function isSchoolStaff(session: SessionUser): boolean {
  return (
    session.role === RoleCode.DIRECTOR_INSTITUCION ||
    session.role === RoleCode.COORDINADOR_PEDAGOGICO ||
    session.role === RoleCode.JEFE_TALLER
  );
}

/** El autor que corresponde a cada rol del personal de institución. */
const AUTOR_POR_ROL: Record<string, RolAutorPlantilla> = {
  [RoleCode.DIRECTOR_INSTITUCION]: 'director_ie',
  [RoleCode.COORDINADOR_PEDAGOGICO]: 'coordinador_pedagogico',
  [RoleCode.JEFE_TALLER]: 'jefe_taller',
};

/**
 * Quién queda como dueño de la plantilla que se está creando o clonando.
 *
 * Devolvía `director_ie` para todo el personal de institución, de modo que la
 * plantilla del Coordinador y la del Jefe de Taller quedaban atribuidas al
 * Director. La regla de una sola vigente por autor las tomaba por la misma y
 * sólo el primero podía activar la suya.
 */
export function resolveAutor(session: SessionUser): {
  rolAutorAlCrear: RolAutorPlantilla;
  institucionId: string | null;
} {
  if (isSchoolStaff(session)) {
    return {
      rolAutorAlCrear: AUTOR_POR_ROL[session.role] ?? 'director_ie',
      institucionId: session.institucionId ?? null,
    };
  }
  return { rolAutorAlCrear: 'jefe_gestion', institucionId: null };
}

export function guardVisibilidad(plantilla: IPlantilla, session?: SessionUser): void {
  if (!session) return;

  // Coordinador y Jefe de Taller no ven plantillas de la UGEL
  if (
    (session.role === RoleCode.COORDINADOR_PEDAGOGICO || session.role === RoleCode.JEFE_TALLER) &&
    plantilla.rolAutorAlCrear === 'jefe_gestion'
  ) {
    throw new ForbiddenException('No tiene permisos para ver esta plantilla.');
  }

  if (isSchoolStaff(session) && plantilla.rolAutorAlCrear === 'jefe_gestion') {
    // Directores ven plantillas UGEL
    return;
  }
  if (isSchoolStaff(session) && plantilla.institucionId !== session.institucionId) {
    throw new ForbiddenException('No tiene permisos para ver esta plantilla.');
  }
  if (session.role === RoleCode.JEFE_AREA && plantilla.rolAutorAlCrear === 'director_ie') {
    throw new ForbiddenException('El Jefe de Area no tiene acceso a las plantillas de II.EE.');
  }
  if (
    session.role === RoleCode.JEFE_GESTION &&
    plantilla.rolAutorAlCrear === 'director_ie' &&
    plantilla.estado === 'Borrador'
  ) {
    throw new ForbiddenException(
      'El Jefe de Gestion no tiene acceso a plantillas Borrador de las II.EE.',
    );
  }
}

export function guardModificacion(plantilla: IPlantilla, session: SessionUser): void {
  if (isSchoolStaff(session) && plantilla.rolAutorAlCrear === 'jefe_gestion') {
    throw new ForbiddenException(
      'Los Directores e integrantes de la IE no pueden modificar plantillas UGEL.',
    );
  }
  if (!isSchoolStaff(session) && plantilla.rolAutorAlCrear === 'director_ie') {
    throw new ForbiddenException(
      'Los usuarios de UGEL no pueden modificar plantillas de las II.EE.',
    );
  }

  // Coordinador y Jefe de Taller solo pueden modificar las plantillas creadas por ellos mismos
  if (
    (session.role === RoleCode.COORDINADOR_PEDAGOGICO || session.role === RoleCode.JEFE_TALLER) &&
    plantilla.autorId !== session.id
  ) {
    throw new ForbiddenException('No tiene permisos para modificar esta plantilla.');
  }
}
