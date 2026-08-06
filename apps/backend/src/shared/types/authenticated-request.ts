import type { Request } from 'express';
import type { JwtPayload } from '../../modules/auth/services/auth-token.service.js';

/**
 * Petición con la sesión ya resuelta por `AuthGuard`.
 *
 * Fase 4 de PLAN_REMEDIACION.md. Los controladores declaraban `@Req() req: any`
 * —39 veces en cinco archivos— y silenciaban las reglas de tipado a nivel de
 * archivo para que no protestara. Con `any`, leer `req.user.sub` o
 * `req.user.institucion_id` no se verifica: un campo mal escrito compila y llega
 * como `undefined` al servicio.
 *
 * Otros cuatro controladores ya declaraban esta misma interfaz, cada uno la
 * suya. Aquí vive la única.
 *
 * `user` es opcional porque el tipo describe la petición de Express, donde el
 * campo lo agrega el guard: en un handler sin `AuthGuard` no está.
 */
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}
