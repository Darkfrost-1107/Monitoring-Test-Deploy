import { ForbiddenException } from '@nestjs/common';
import type { SessionUser } from '../../../shared/types/session-user.js';

/**
 * Sólo el especialista ASIGNADO como monitor de la visita puede registrar o
 * modificar su ficha.
 *
 * El guard de capacidades (`monitoreo:execute`) sólo dice que el rol PUEDE
 * monitorear en general; no que esta visita sea suya. Un jefe de gestión —o el
 * director de UGEL, que arrastra la capacidad por un cargo viejo— la tiene y, sin
 * esta comprobación, podría llenar o finalizar por API la ficha de otro. Es el
 * espejo backend de `puedeEvaluarVisita` del front: compara identidad, no permiso.
 *
 * La ausencia nunca autoriza: sin `especialistaId` en la sesión no hay asignación
 * demostrable.
 */
export function assertEsMonitorAsignado(session: SessionUser, monitorId: string): void {
  if (!session.especialistaId || session.especialistaId !== monitorId) {
    throw new ForbiddenException(
      'Sólo el monitor asignado a esta visita puede registrar o modificar su ficha.',
    );
  }
}
