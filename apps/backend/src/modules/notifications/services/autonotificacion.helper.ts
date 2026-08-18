/**
 * Nadie recibe una alerta de atención sobre sí mismo.
 *
 * Cuando la UGEL señala a un docente, la alerta llega al Director de su I.E. para
 * que actúe. Pero un directivo también se monitorea, así que puede ser él mismo
 * el señalado: entonces el destinatario «Director de I.E.» resulta ser la misma
 * persona que el docente de la alerta. Notificarle sobre sí mismo, en tercera
 * persona y con un enlace a Focos de Atención que no le corresponde, no tiene
 * sentido: el director sólo gestiona a sus docentes, no su propio caso.
 *
 * De ahí que se separen los destinatarios que coinciden con el señalado. La
 * decisión es pura para poder probarla sin base de datos; el `docenteId` de cada
 * destinatario lo resuelve el servicio.
 */

/** Un destinatario resuelto, con el docente al que corresponde si lo tiene. */
export interface DestinatarioConDocente {
  docenteId?: string | null;
}

/**
 * Reparte los destinatarios entre los que se notifica y los que quedan fuera por
 * ser el propio señalado.
 *
 * Sin `docenteId` de la alerta no hay a quién comparar: se notifica a todos.
 */
export function separarAutonotificacion<T extends DestinatarioConDocente>(
  destinatarios: readonly T[],
  docenteSenaladoId: string | null | undefined,
): { notificables: T[]; omitidosPorSerElMismo: T[] } {
  if (!docenteSenaladoId) {
    return { notificables: [...destinatarios], omitidosPorSerElMismo: [] };
  }

  const notificables: T[] = [];
  const omitidosPorSerElMismo: T[] = [];

  for (const d of destinatarios) {
    if (d.docenteId && d.docenteId === docenteSenaladoId) {
      omitidosPorSerElMismo.push(d);
    } else {
      notificables.push(d);
    }
  }

  return { notificables, omitidosPorSerElMismo };
}
