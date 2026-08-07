import { RoleCode } from '@sistema-monitoreo/shared-contracts';

/**
 * Quién puede levantar la ficha de una visita concreta.
 *
 * Fase 5 de PLAN_REMEDIACION.md. La regla vivía como un `useMemo` dentro de
 * `CalendarioSidebar`, entre la maquetación del panel de detalle. Al estar
 * enterrada en la presentación no tenía cobertura, y su lista de roles se
 * escribía con literales sueltos —que es justamente lo que la Fase 1 unificó en
 * `RoleCode`—.
 *
 * ── Qué NO decide esta función ──
 * No es el control de acceso de fondo: el backend exige `monitoreo:execute` en
 * los endpoints de ficha. Lo que se resuelve acá es la **asignación**: de todas
 * las personas habilitadas para evaluar, cuál es la que tiene asignada *esta*
 * visita. Por eso no alcanza con una capacidad y hace falta comparar identidad.
 *
 * ── Por qué sólo por identificador ──
 * Hubo un respaldo que comparaba nombres por inclusión de subcadenas cuando
 * faltaba alguno de los dos identificadores. Autorizaba de más: un nombre de
 * pila contenido en otro bastaba. `evaluadores-sin-especialista.sql` no
 * devolvió filas —los usuarios con rol evaluador tienen registro de
 * especialista— y `monitor_id` es una clave foránea no nula, así que el
 * respaldo no cubría ningún caso real y se retiró. Es el mismo criterio que ya
 * aplicaba `visibilidad-reportes.ts`.
 */

/**
 * Roles que pueden figurar como evaluador de una visita.
 *
 * Es un conjunto propio y no una composición de los existentes, tal como
 * anticipa el comentario de `MONITOR_CAMPO_ROLES`: además de los tres monitores
 * de campo incluye a jefe de gestión, jefe de área y director de institución,
 * que también firman fichas. Ni el ámbito ni una capacidad lo describen.
 */
export const ROLES_EVALUADORES: readonly RoleCode[] = [
  RoleCode.ESPECIALISTA,
  RoleCode.COORDINADOR_PEDAGOGICO,
  RoleCode.JEFE_TALLER,
  RoleCode.JEFE_GESTION,
  RoleCode.JEFE_AREA,
  RoleCode.DIRECTOR_INSTITUCION,
];

/** Datos del usuario que la asignación necesita. */
export interface UsuarioEvaluador {
  role: string;
  /** Identificador del especialista vinculado. Sin él no hay asignación. */
  especialistaId?: string;
}

/** Datos de la visita sobre la que se evalúa la asignación. */
export interface VisitaEvaluable {
  /** Identificador del especialista asignado, clave foránea a `especialistas`. */
  monitorId: string;
}

export function puedeEvaluarVisita(
  usuario: UsuarioEvaluador | null | undefined,
  visita: VisitaEvaluable | null | undefined,
): boolean {
  if (!usuario || !visita) return false;

  if (!(ROLES_EVALUADORES as readonly string[]).includes(usuario.role)) return false;

  // Sin alguno de los dos identificadores no hay asignación demostrable, y la
  // ausencia nunca autoriza.
  if (!usuario.especialistaId || !visita.monitorId) return false;

  return usuario.especialistaId === visita.monitorId;
}
