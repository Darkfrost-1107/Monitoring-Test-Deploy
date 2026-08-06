import {
  RoleCode,
  NivelEducativoEBR,
  MONITOR_CAMPO_ROLES,
} from '@sistema-monitoreo/shared-contracts';

/**
 * Quién puede decidir sobre una solicitud de reprogramación.
 *
 * Fase 2 de PLAN_REMEDIACION.md, hallazgo H-27. Esta regla vivía duplicada
 * palabra por palabra en `CalendarioSidebar` y en `BandejaReprogramaciones`, sin
 * cobertura en ninguna de las dos: un ajuste en una y no en la otra dejaba dos
 * pantallas discrepando sobre quién puede aprobar.
 *
 * ── Qué NO decide esta función ──
 * El permiso de fondo lo aplica el backend: los endpoints de aprobar y rechazar
 * exigen `monitoreo:execute`. Lo que se resuelve aquí es el **enrutamiento de
 * negocio**: qué solicitudes le corresponden a cada posición organizativa. Por
 * eso distingue por rol y no por capacidad — jefe de gestión y jefe de área
 * comparten ámbito y capacidad, pero resuelven ámbitos de decisión distintos.
 *
 * ── La regla ──
 * - Quien levanta la ficha en el aula no decide sobre su propia solicitud.
 * - Jefe de gestión resuelve lo nacido en la UGEL.
 * - Jefe de área, lo mismo, restringido a su nivel educativo.
 * - Director de institución resuelve lo nacido en su colegio, sólo en
 *   Secundaria, que es donde existen los cargos que pueden solicitarlo.
 * - Cualquier otro rol no decide.
 */

/** Datos del usuario que la decisión necesita. */
export interface UsuarioDecisor {
  role: string;
  /** Nivel educativo asignado al especialista, si lo tiene. */
  especialistaNivel?: string;
  /** Identificador de la institución a la que pertenece, si aplica. */
  institucion?: string;
  /** Nombre de la institución, usado como respaldo cuando no hay identificador. */
  institucionNombre?: string;
}

/** Datos de la visita sobre la que se decide. */
export interface VisitaDecidible {
  nivel: string;
  institucionId: string;
  institucion: string;
}

/**
 * ¿La solicitud nació dentro de la institución educativa?
 *
 * Sólo el coordinador pedagógico y el jefe de taller solicitan desde la I.E.;
 * el resto de las solicitudes proviene de la UGEL. La distinción determina quién
 * resuelve.
 */
export const esSolicitudDeInstitucion = (solicitanteRolAlCrear?: string): boolean =>
  solicitanteRolAlCrear === RoleCode.COORDINADOR_PEDAGOGICO ||
  solicitanteRolAlCrear === RoleCode.JEFE_TALLER;

/** ¿El usuario y la visita corresponden a la misma institución educativa? */
const esMismaInstitucion = (usuario: UsuarioDecisor, visita: VisitaDecidible): boolean =>
  !!(
    (usuario.institucion && visita.institucionId === usuario.institucion) ||
    (usuario.institucionNombre &&
      visita.institucion.toLowerCase() === usuario.institucionNombre.toLowerCase())
  );

export function puedeDecidirReprogramacion(
  usuario: UsuarioDecisor | null | undefined,
  visita: VisitaDecidible | null | undefined,
  solicitanteRolAlCrear?: string,
): boolean {
  if (!usuario || !visita) return false;

  // Quien levanta la ficha solicita la reprogramación; no la resuelve.
  if ((MONITOR_CAMPO_ROLES as readonly string[]).includes(usuario.role)) return false;

  const esDeInstitucion = esSolicitudDeInstitucion(solicitanteRolAlCrear);

  if (usuario.role === RoleCode.JEFE_GESTION) {
    return !esDeInstitucion;
  }

  if (usuario.role === RoleCode.JEFE_AREA) {
    if (esDeInstitucion) return false;
    // Sin nivel asignado, el jefe de área no queda restringido.
    if (usuario.especialistaNivel && visita.nivel !== usuario.especialistaNivel) return false;
    return true;
  }

  if (usuario.role === RoleCode.DIRECTOR_INSTITUCION) {
    if (visita.nivel !== NivelEducativoEBR.SECUNDARIA) return false;
    return esMismaInstitucion(usuario, visita) && esDeInstitucion;
  }

  return false;
}
