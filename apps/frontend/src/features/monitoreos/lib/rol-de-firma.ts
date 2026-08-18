import { RoleCode } from '@sistema-monitoreo/shared-contracts';

/**
 * Con qué rol firma la persona que está mirando la ficha.
 *
 * ── Para qué sirve acá ──
 * Quién firma lo decide el servidor, comparando la persona autenticada contra
 * las partes de la visita: el cliente no puede elegirlo, y el campo que envía se
 * ignora. Esto es presentación —mostrar el botón y saber si ya firmó— y por eso
 * repite la misma precedencia: si divergiera, la pantalla ofrecería firmar algo
 * que el servidor después rechaza.
 */

export type RolDeFirma = 'EVALUADO' | 'EVALUADOR' | 'DIRECTOR';

/**
 * Si esta persona es el director de la I.E. donde ocurre la visita.
 *
 * El director no es parte del cronograma: se lo reconoce por su rol y porque la
 * visita ocurre en su institución. Sin ese segundo control, un director firmaría
 * fichas de cualquier otra I.E.
 */
export function esDirectorDeLaVisita(
  usuario: { role?: string; institucion?: string } | null | undefined,
  visita: { institucionId?: string } | null | undefined,
): boolean {
  if (usuario?.role !== RoleCode.DIRECTOR_INSTITUCION) return false;
  if (!usuario.institucion || !visita?.institucionId) return false;

  return usuario.institucion === visita.institucionId;
}

/**
 * El rol con el que corresponde firmar, o nulo si esta persona no firma.
 *
 * El orden es el mismo que aplica el servidor: ser parte de la visita gana sobre
 * el visto bueno. Un director puede monitorear a los docentes de su propia
 * institución, y en esa ficha firma como evaluador, no dos veces.
 */
export function rolDeFirma(quien: {
  esEvaluado: boolean;
  esEvaluador: boolean;
  esDirectorDeLaIE: boolean;
}): RolDeFirma | null {
  if (quien.esEvaluado) return 'EVALUADO';
  if (quien.esEvaluador) return 'EVALUADOR';
  if (quien.esDirectorDeLaIE) return 'DIRECTOR';

  return null;
}
