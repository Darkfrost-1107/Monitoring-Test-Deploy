import { SetMetadata } from '@nestjs/common';
import type { Capability } from '@sistema-monitoreo/shared-contracts';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Declara las capacidades que un handler exige. `PermissionsGuard` las valida
 * de forma conjuntiva: se requieren todas.
 *
 * Fase 2 de PLAN_REMEDIACION.md: el parámetro era `...permissions: string[]`, de
 * modo que una capacidad mal escrita compilaba sin error y producía un endpoint
 * inalcanzable en silencio. Al tiparlo contra `Capability`, las 28 llamadas del
 * backend quedan verificadas por el compilador.
 */
export const RequirePermissions = (...permissions: Capability[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
