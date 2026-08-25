import type { RoleCode } from '../../common/enums/role.enum.js';

/**
 * Información del usuario autenticado disponible en el contexto de la solicitud.
 * Se construye a partir del JWT payload y se pasa a los servicios para
 * autorización y filtrado por alcance (scope).
 */
export interface SessionUser {
  id: string;
  role: RoleCode;
  institucionId?: string | null;
  /** Id del especialista vinculado (si lo hay). Es contra quién se compara la
   * asignación de una visita: `monitorId` de un cronograma apunta a este id. */
  especialistaId?: string | null;
  especialistaNivel?: string | null;
  especialistaEspecialidades?: string[] | null;
}
