import type { NivelLogro } from './ficha.contract.js';

/**
 * Baremo institucional de monitoreo (EDU-0009) — cálculo canónico.
 *
 * Fase 3 de PLAN_REMEDIACION.md, hallazgo H-28.
 *
 * Esta regla estaba implementada **dos veces y de forma distinta**: el backend
 * la calculaba sobre el PROMEDIO en `BaremoCalculatorService`, y la pantalla de
 * llenado la calculaba sobre el PUNTAJE TOTAL con una tabla propia. El valor
 * que veía el evaluador nunca llegaba al servidor —era sólo presentación— de
 * modo que ambas podían discrepar sin que nada fallara, y discrepaban.
 *
 * Las dos coincidían para plantillas de exactamente cinco desempeños, porque la
 * tabla de la pantalla era este mismo baremo precalculado para ese caso. Para
 * cualquier otro número la pantalla repartía por cuartiles del rango, que no es
 * la misma división que los umbrales de promedio.
 *
 * Aquí vive ahora la única definición. Ambas aplicaciones la consumen.
 */

/** Nivel mínimo que puede recibir un desempeño. */
export const NIVEL_DESEMPENO_MINIMO = 1;

/** Nivel máximo que puede recibir un desempeño. */
export const NIVEL_DESEMPENO_MAXIMO = 4;

/**
 * Umbrales del baremo, con límite superior inclusivo.
 *
 * Sin huecos entre tramos, para no dejar sin clasificar los promedios
 * frecuentes como 1,5 · 2,5 · 3,5.
 *
 *   Inicio           1,0 – 1,5
 *   En proceso      >1,5 – 2,5
 *   Logro esperado  >2,5 – 3,5
 *   Logro destacado >3,5 – 4,0
 */
const UMBRALES: readonly { hasta: number; nivel: NivelLogro }[] = [
  { hasta: 1.5, nivel: 'INICIO' },
  { hasta: 2.5, nivel: 'EN_PROCESO' },
  { hasta: 3.5, nivel: 'LOGRO_ESPERADO' },
];

/** Etiqueta legible por persona de cada nivel de logro. */
export const NIVEL_LOGRO_LABELS: Record<NivelLogro, string> = {
  INICIO: 'Inicio',
  EN_PROCESO: 'En proceso',
  LOGRO_ESPERADO: 'Logro esperado',
  LOGRO_DESTACADO: 'Logro destacado',
};

/** Promedio de una lista de niveles, redondeado a dos decimales. */
export function calcularPromedio(niveles: readonly number[]): number {
  if (niveles.length === 0) return 0;
  const suma = niveles.reduce((acc, n) => acc + n, 0);
  return Number((suma / niveles.length).toFixed(2));
}

/**
 * Nivel de logro correspondiente a un promedio.
 *
 * @throws si el promedio queda fuera del rango 1,0 – 4,0.
 */
export function calcularNivelLogro(promedio: number): NivelLogro {
  if (promedio < NIVEL_DESEMPENO_MINIMO || promedio > NIVEL_DESEMPENO_MAXIMO) {
    throw new Error(
      `Promedio fuera de rango: ${promedio}. Debe estar entre ${NIVEL_DESEMPENO_MINIMO}.0 y ${NIVEL_DESEMPENO_MAXIMO}.0.`,
    );
  }
  return UMBRALES.find((u) => promedio <= u.hasta)?.nivel ?? 'LOGRO_DESTACADO';
}

export interface ResultadoBaremo {
  puntajeTotal: number;
  /** Puntaje máximo alcanzable con la cantidad de desempeños evaluados. */
  puntajeMaximo: number;
  promedio: number;
  nivelLogro: NivelLogro;
  /** Porcentaje del puntaje máximo, redondeado, para mostrar en pantalla. */
  porcentaje: number;
}

/**
 * Resultado completo del baremo a partir de los niveles asignados.
 *
 * Una ficha sin desempeños devuelve el resultado neutro en lugar de fallar: la
 * pantalla la muestra en blanco mientras el evaluador la completa.
 */
export function calcularResultadoBaremo(niveles: readonly number[]): ResultadoBaremo {
  const puntajeMaximo = niveles.length * NIVEL_DESEMPENO_MAXIMO;

  if (niveles.length === 0) {
    return {
      puntajeTotal: 0,
      puntajeMaximo: 0,
      promedio: 1,
      nivelLogro: 'INICIO',
      porcentaje: 0,
    };
  }

  const puntajeTotal = niveles.reduce((acc, n) => acc + n, 0);
  const promedio = calcularPromedio(niveles);

  return {
    puntajeTotal,
    puntajeMaximo,
    promedio,
    nivelLogro: calcularNivelLogro(promedio),
    porcentaje: puntajeMaximo > 0 ? Math.round((puntajeTotal / puntajeMaximo) * 100) : 0,
  };
}

/** Convierte un nivel numérico (1-4) a su numeral romano. */
export function nivelARomano(nivel: number): 'I' | 'II' | 'III' | 'IV' {
  const romanos = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' } as const;
  const romano = romanos[nivel as 1 | 2 | 3 | 4];
  if (!romano) throw new Error(`Nivel invalido: ${nivel}. Debe estar entre 1 y 4.`);
  return romano;
}

/** Convierte un numeral romano a su nivel numérico. Devuelve 0 si no es válido. */
export function romanoANivel(romano: string): number {
  return { I: 1, II: 2, III: 3, IV: 4 }[romano] ?? 0;
}
