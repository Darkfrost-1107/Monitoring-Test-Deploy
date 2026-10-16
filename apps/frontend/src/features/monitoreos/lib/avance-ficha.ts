/**
 * Reglas de avance del llenado de la ficha.
 *
 * El evaluador recorre los criterios en orden y luego el cierre, sin saltear
 * ninguno: no se pasa al paso siguiente con el actual a medias. «Completo» es
 * lo mismo que exige `validarCierreDeFicha` al finalizar —nivel elegido y
 * justificación escrita—, de modo que la ficha no llega al cierre con huecos
 * que recién se descubrirían al firmar.
 */

/** Un criterio está completo con su nivel elegido y una justificación no vacía. */
export function criterioCompleto(
  nivel: string | undefined,
  observacion: string | undefined,
): boolean {
  return !!nivel && !!observacion?.trim();
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
