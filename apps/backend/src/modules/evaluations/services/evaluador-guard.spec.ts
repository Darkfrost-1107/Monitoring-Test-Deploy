import { ForbiddenException } from '@nestjs/common';
import { assertEsMonitorAsignado } from './evaluador-guard.js';
import type { SessionUser } from '../../../shared/types/session-user.js';

const sesion = (especialistaId?: string | null): SessionUser => ({
  id: 'u-1',
  role: 'especialista',
  especialistaId,
});

describe('assertEsMonitorAsignado', () => {
  it('permite al especialista asignado como monitor de la visita', () => {
    expect(() => assertEsMonitorAsignado(sesion('esp-1'), 'esp-1')).not.toThrow();
  });

  it('rechaza a quien no es el monitor asignado', () => {
    expect(() => assertEsMonitorAsignado(sesion('esp-2'), 'esp-1')).toThrow(ForbiddenException);
  });

  it('rechaza si la sesión no tiene especialista (la ausencia no autoriza)', () => {
    expect(() => assertEsMonitorAsignado(sesion(null), 'esp-1')).toThrow(ForbiddenException);
    expect(() => assertEsMonitorAsignado(sesion(undefined), 'esp-1')).toThrow(ForbiddenException);
  });
});
