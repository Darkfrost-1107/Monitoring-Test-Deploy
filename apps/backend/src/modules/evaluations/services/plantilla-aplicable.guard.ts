import { ForbiddenException } from '@nestjs/common';
import type { SessionUser } from '../../../shared/types/session-user.js';

/**
 * Quién puede levantar una ficha con una plantilla determinada.
 *
 * ── Las dos clases de instrumento ──
 * Las fichas de la UGEL son el catálogo obligatorio: las aplica cualquiera que
 * monitoree. Una plantilla de institución es otra cosa: nació de una solicitud
 * que la Jefatura aprobó para UNA persona concreta, con sus criterios y su área.
 *
 * ── Por qué por persona y no por cargo ──
 * El vale declara un cargo, pero una I.E. puede tener dos coordinadores
 * pedagógicos o dos jefes de taller, cada uno con su área y su criterio de
 * observación. Si la ficha se compartiera por cargo, el segundo evaluaría con el
 * instrumento que el primero diseñó para otra realidad, y nada en pantalla lo
 * diría: la ficha sale completa, firmada y con un puntaje que no significa lo
 * que parece.
 *
 * Que cada quien necesite su propio vale no multiplica plantillas sin control:
 * el director pide tantos cupos como personas, y la Jefatura aprueba o no. El
 * techo lo pone la aprobación, no el sistema.
 *
 * ── Qué NO cubre ──
 * Esto decide el INSTRUMENTO. Que la persona sea el monitor asignado a la visita
 * lo comprueba `assertEsMonitorAsignado`, y son preguntas distintas: una es «¿te
 * toca esta visita?» y la otra «¿es tuya esta ficha?».
 */

/** Los datos de la plantilla que la decisión necesita. */
export interface PlantillaDeLaFicha {
  /** Institución dueña. `null` en las del catálogo de la UGEL. */
  institucionId: string | null;
  /** Quien la creó. Sólo importa en las de institución. */
  autorId: string;
}

/** Si esta sesión puede levantar una ficha con esta plantilla. */
export function puedeAplicarPlantilla(
  plantilla: PlantillaDeLaFicha,
  session: SessionUser,
): boolean {
  // Sin institución dueña es del catálogo obligatorio: la aplica cualquiera.
  if (plantilla.institucionId === null) return true;

  return plantilla.autorId === session.id;
}

/** Lanza 403 si la plantilla elegida no es aplicable por esta sesión. */
export function assertPuedeAplicarPlantilla(
  plantilla: PlantillaDeLaFicha,
  session: SessionUser,
): void {
  if (puedeAplicarPlantilla(plantilla, session)) return;

  throw new ForbiddenException(
    'Esa ficha es de otra persona de su institución: se autorizó para quien la creó. ' +
      'Puede monitorear con las fichas oficiales de la UGEL, o pedir al director de la I.E. ' +
      'que solicite una propia a la Jefatura de Gestión Pedagógica.',
  );
}
