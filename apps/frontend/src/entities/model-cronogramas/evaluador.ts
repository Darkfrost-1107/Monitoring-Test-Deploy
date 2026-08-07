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
  nombres: string;
  apellidos: string;
  /** Identificador del especialista vinculado, si lo tiene. */
  especialistaId?: string;
}

/** Datos de la visita sobre la que se evalúa la asignación. */
export interface VisitaEvaluable {
  /** Identificador del especialista asignado. Vacío en registros migrados. */
  monitorId: string;
  /** Nombre del especialista asignado, tal como se muestra. */
  especialista: string;
}

/**
 * Respaldo histórico: comparación de nombres por inclusión de subcadenas.
 *
 * Se aplica sólo cuando falta el vínculo por identificador, que es el estado de
 * los registros migrados. Es deliberadamente laxo y por eso admite falsos
 * positivos —un nombre de pila corto contenido en otro nombre basta—; el caso
 * está fijado en `evaluador.test.ts` y su corrección es un cambio de
 * comportamiento pendiente de decidir, no parte de este refactor.
 */
const coincidePorNombre = (usuario: UsuarioEvaluador, visita: VisitaEvaluable): boolean => {
  const nombreCompleto = `${usuario.nombres} ${usuario.apellidos}`.toLowerCase();
  const asignado = visita.especialista.toLowerCase();

  return (
    nombreCompleto.includes(asignado) ||
    asignado.includes(nombreCompleto) ||
    asignado.includes(usuario.nombres.toLowerCase())
  );
};

export function puedeEvaluarVisita(
  usuario: UsuarioEvaluador | null | undefined,
  visita: VisitaEvaluable | null | undefined,
): boolean {
  if (!usuario || !visita) return false;

  if (!(ROLES_EVALUADORES as readonly string[]).includes(usuario.role)) return false;

  // Vía exacta: ambos extremos tienen identificador de especialista.
  if (usuario.especialistaId && visita.monitorId) {
    return usuario.especialistaId === visita.monitorId;
  }

  return coincidePorNombre(usuario, visita);
}
