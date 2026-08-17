import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { IFichaMonitoreo } from '@sistema-monitoreo/shared-contracts';
import type { FichaRepository } from '../repositories/ficha.repository.js';
import { ScopeFilter } from '../../../shared/auth/scope-filter.js';
import type { SessionUser } from '../../../shared/types/session-user.js';

export async function findByVisitaId(
  repository: FichaRepository,
  cronogramaId: string,
  _session: SessionUser,
): Promise<IFichaMonitoreo | null> {
  void _session;
  return repository.findByVisitaId(cronogramaId);
}

export async function findByVisitaYPlantilla(
  repository: FichaRepository,
  cronogramaId: string,
  plantillaId: string,
  _session: SessionUser,
): Promise<IFichaMonitoreo | null> {
  void _session;
  return repository.findByVisitaYPlantilla(cronogramaId, plantillaId);
}

export async function findAllByVisitaId(
  repository: FichaRepository,
  cronogramaId: string,
  _session: SessionUser,
): Promise<IFichaMonitoreo[]> {
  void _session;
  return repository.findAllByVisitaId(cronogramaId);
}

export async function findById(
  repository: FichaRepository,
  scopeFilter: ScopeFilter,
  id: string,
  session: SessionUser,
): Promise<IFichaMonitoreo> {
  const f = await repository.findById(id);
  if (!f) throw new NotFoundException(`Ficha ${id} no encontrada.`);

  const scope = scopeFilter.forFicha({
    userId: session.id,
    role: session.role,
    institucionId: session.institucionId ?? null,
    especialistaNivel: session.especialistaNivel ?? null,
  });
  const allowed = await repository.existsWithScope(f.id, scope);
  if (!allowed) throw new ForbiddenException('No tiene acceso a esta ficha.');

  return f;
}
