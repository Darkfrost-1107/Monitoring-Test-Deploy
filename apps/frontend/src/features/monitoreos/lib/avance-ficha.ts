/**
 * Reglas de avance del llenado de la ficha.
 *
 * El evaluador recorre los criterios en orden y luego el cierre, sin saltear
 * ninguno: no se pasa al paso siguiente con el actual a medias. «Completo» es
 * lo mismo que exige `validarCierreDeFicha` al finalizar —nivel elegido,
 * pregunta Sí/No respondida si el criterio la tiene, y justificación escrita—, de modo que la ficha no llega al cierre con huecos
 * que recién se descubrirían al firmar.
 */

/** La pregunta extra Sí/No de un criterio: su texto, si la plantilla la define, y lo respondido. */
export interface PreguntaExtra {
  texto?: string;
  respuesta?: boolean;
}

/** ¿El criterio tiene una pregunta Sí/No que todavía no se respondió? «No» cuenta como respuesta. */
export const preguntaExtraPendiente = (pregunta?: PreguntaExtra): boolean =>
  !!pregunta?.texto && pregunta.respuesta === undefined;

/**
 * Un criterio está completo con su nivel elegido, una justificación no vacía y,
 * si lleva pregunta extra, su respuesta.
 */
export function criterioCompleto(
  nivel: string | undefined,
  observacion: string | undefined,
  pregunta?: PreguntaExtra,
): boolean {
  return !!nivel && !!observacion?.trim() && !preguntaExtraPendiente(pregunta);
}

/**
 * Índice del último paso al que se puede llegar: el primero incompleto.
 *
 * Los pasos posteriores quedan bloqueados aunque alguno esté completo, porque
 * se llega a ellos pasando por el incompleto. Con todos completos, es el último.
 */
export function indiceMaximoAccesible(
  claves: readonly string[],
  estaCompleto: (clave: string) => boolean,
): number {
  const primeroIncompleto = claves.findIndex((clave) => !estaCompleto(clave));
  return primeroIncompleto === -1 ? Math.max(0, claves.length - 1) : primeroIncompleto;
}

/**
 * La planificación y el diseño de la evaluación están completos cuando cada
 * ítem tiene su nivel y su observación: el backend exige el nivel de cada
 * respuesta guardada, y la observación es obligatoria para cerrar la ficha.
 */
export function planificacionCompleta(
  items: readonly { id: string }[],
  niveles: Readonly<Record<string, number>>,
  observaciones: Readonly<Record<string, string>>,
): boolean {
  return items.every((item) => !!niveles[item.id] && !!observaciones[item.id]?.trim());
}
