/**
 * El consolidado que se imprime al pie de la ficha oficial.
 *
 * Vivía dentro de `FichaPrintable`, en una función anónima invocada en el
 * sitio, entre la maquetación de las tablas.
 *
 * ── Qué cambió ──
 * Un desempeño sin calificar valía 0 y ese 0 se sumaba al total. La escala de
 * las rúbricas va de 1 a 4: el 0 no existe. Con cinco desempeños el mínimo es
 * 5, así que una ficha a medio llenar caía por debajo de toda franja y el
 * documento oficial salía con el nivel de logro en blanco, sin decir por qué.
 * Ahora una ficha incompleta se declara incompleta.
 */

/** Los cuatro niveles de las rúbricas, en orden de puntaje. */
export const ESCALA_DE_RUBRICAS = ['I', 'II', 'III', 'IV'] as const;

export interface DesempenoConsolidable {
  id: string;
}

/** El puntaje de un desempeño, o nulo si no está calificado. */
export function puntajeDeDesempeno(romano: string | null | undefined): number | null {
  if (!romano) return null;

  const indice = (ESCALA_DE_RUBRICAS as readonly string[]).indexOf(romano);
  return indice === -1 ? null : indice + 1;
}

/**
 * Franjas oficiales para las cinco rúbricas de observación de aula.
 *
 * Es la tabla del MINEDU y por eso se declara y no se calcula.
 */
const FRANJAS_DE_CINCO: { desde: number; nivel: string }[] = [
  { desde: 18, nivel: 'LOGRO DESTACADO' },
  { desde: 13, nivel: 'LOGRO ESPERADO' },
  { desde: 8, nivel: 'EN PROCESO' },
  { desde: 5, nivel: 'INICIO' },
];

const NIVELES_EN_ORDEN = ['INICIO', 'EN PROCESO', 'LOGRO ESPERADO', 'LOGRO DESTACADO'];

export interface Consolidado {
  /** Suma de lo calificado. No incluye ceros por lo que falta. */
  puntaje: number;
  /** Nulo mientras la ficha no esté completa: no se declara lo que no se midió. */
  nivel: string | null;
  completa: boolean;
  sinCalificar: number;
  puntajeMinimo: number;
  puntajeMaximo: number;
}

/**
 * Reparte la escala en cuartos cuando la plantilla no tiene cinco desempeños.
 *
 * Es un respaldo: la tabla oficial cubre sólo el caso de cinco.
 */
function nivelPorCuartos(puntaje: number, minimo: number, maximo: number): string {
  const recorrido = maximo - minimo;
  const cuarto = Math.max(1, Math.round(recorrido / 4));

  const franja = Math.min(3, Math.floor((puntaje - minimo) / cuarto));
  return NIVELES_EN_ORDEN[Math.max(0, franja)];
}

export function consolidarFicha(
  desempenos: readonly DesempenoConsolidable[],
  nivelesElegidos: Readonly<Record<string, string>>,
): Consolidado {
  const puntajes = desempenos.map((d) => puntajeDeDesempeno(nivelesElegidos[d.id]));
  const calificados = puntajes.filter((p): p is number => p !== null);

  const puntaje = calificados.reduce((total, p) => total + p, 0);
  const sinCalificar = desempenos.length - calificados.length;
  const completa = desempenos.length > 0 && sinCalificar === 0;

  const puntajeMinimo = desempenos.length * 1;
  const puntajeMaximo = desempenos.length * ESCALA_DE_RUBRICAS.length;

  if (!completa) {
    return { puntaje, nivel: null, completa, sinCalificar, puntajeMinimo, puntajeMaximo };
  }

  const nivel =
    desempenos.length === 5
      ? (FRANJAS_DE_CINCO.find((f) => puntaje >= f.desde)?.nivel ?? null)
      : nivelPorCuartos(puntaje, puntajeMinimo, puntajeMaximo);

  return { puntaje, nivel, completa, sinCalificar, puntajeMinimo, puntajeMaximo };
}
