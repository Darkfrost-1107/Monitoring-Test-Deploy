import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { IPlantilla, RolAutorPlantilla } from '@sistema-monitoreo/shared-contracts';
import { nivelesRomanosDe } from '@sistema-monitoreo/shared-contracts';
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

/**
 * Cuántos niveles debe declarar la plantilla, según su instrumento.
 *
 * Antes eran cuatro para todos. La Ficha Docente EIB es una lista de cotejo de
 * tres valores —No, Parcialmente, Sí— y para pasar por acá se le agregaba un
 * cuarto nivel inventado. La cantidad la declara el contrato compartido, que es
 * lo que el frontend consulta también.
 */
export function validarReglas(dto: CreatePlantillaDto): void {
  validarAnioAcademico(dto.anioAcademico);

  const esperados = nivelesRomanosDe(dto.tipoMonitoreo);
  const rotulo = esperados.join(', ');

  const nivelesSet = new Set(dto.niveles.map((n) => n.nivelRomano));
  if (nivelesSet.size !== esperados.length) {
    throw new BadRequestException(
      `La plantilla debe tener exactamente ${esperados.length} niveles (${rotulo}).`,
    );
  }
  for (const d of dto.desempenos) {
    const rubricaSet = new Set(d.rubrica.map((r) => r.nivelRomano));
    if (rubricaSet.size !== esperados.length) {
      throw new BadRequestException(
        `El desempeno "${d.nombre}" debe tener rubrica para los ${esperados.length} niveles (${rotulo}).`,
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

/**
 * Autores que pertenecen a una institución educativa.
 *
 * Los tres tienen su propia plantilla. `'director_ie'` se usaba como sinónimo de
 * «de una I.E.», que dejaba afuera a los otros dos en cuanto pudieron tener la
 * suya: el Coordinador duplicaba la del Director y su copia desaparecía del
 * catálogo, filtrada por no ser del director.
 */
export const esAutorDeInstitucion = (autor: RolAutorPlantilla): boolean =>
  autor === 'director_ie' || autor === 'coordinador_pedagogico' || autor === 'jefe_taller';

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
  if (session.role === RoleCode.JEFE_AREA && esAutorDeInstitucion(plantilla.rolAutorAlCrear)) {
    throw new ForbiddenException('El Jefe de Area no tiene acceso a las plantillas de II.EE.');
  }
  if (
    session.role === RoleCode.JEFE_GESTION &&
    esAutorDeInstitucion(plantilla.rolAutorAlCrear) &&
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
  if (!isSchoolStaff(session) && esAutorDeInstitucion(plantilla.rolAutorAlCrear)) {
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
