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

/**
 * Cómo se leen los cortes que declara la plantilla.
 *
 * Es el campo `baremo` que la pantalla de registro ya pregunta —«Vigente
 * (0-20)» o «Porcentual (%)»— y que hasta ahora se guardaba sin que ningún
 * cálculo lo consultara.
 *
 *   Vigente     Los cortes son puntajes absolutos. Rúbrica DOCENTE 2025:
 *               5·8·13·18 sobre un total de 5 a 20.
 *   Porcentual  Los cortes son porcentajes de avance. Rúbrica DIRECTIVA 2025:
 *               25·50·75·100.
 */
export type ModoDeBaremo = 'Vigente' | 'Porcentual';

/**
 * Un tramo de la escala que la plantilla declara.
 *
 * `rangoMin` es el límite **inferior inclusivo**, tal como lo rotula la columna
 * «Rango Mín.» de la pantalla de registro. Qué mide depende del modo: en
 * `Vigente` es puntaje, en `Porcentual` es porcentaje de avance.
 */
export interface TramoDeEscala {
  nivelRomano: 'I' | 'II' | 'III' | 'IV';
  rangoMin: number;
  denominacion: string;
}

/**
 * Nivel al que corresponde un puntaje total dentro de la escala de la plantilla.
 *
 * ── Por qué sobre el total y no sobre el promedio ──
 * Las dos rúbricas de la UGEL Lampa cortan sobre el total: la docente en
 * 5·8·13·18 sobre un máximo de 20, la directiva en 0·9·17·21 sobre 24. El
 * promedio del documento docente es esa misma división dividida entre cinco, de
 * modo que decidir sobre el total sirve a las dos y no ata el cálculo a una
 * cantidad fija de desempeños.
 *
 * Un total por debajo del tramo más bajo cae en ese tramo: no clasificar una
 * ficha ya evaluada sería peor que ubicarla en el nivel inicial.
 *
 * Devuelve nulo sólo si la plantilla no declaró escala.
 */
export function nivelPorEscala(
  total: number,
  escala: readonly TramoDeEscala[],
): TramoDeEscala | null {
  if (escala.length === 0) return null;

  // El orden de llegada no es de fiar: la escala viaja desde la base y desde el
  // formulario, y ninguno de los dos garantiza que venga ascendente.
  const ordenada = [...escala].sort((a, b) => a.rangoMin - b.rangoMin);

  const alcanzados = ordenada.filter((tramo) => total >= tramo.rangoMin);

  return alcanzados[alcanzados.length - 1] ?? ordenada[0];
}

/** Nivel de logro canónico de cada numeral romano de la escala. */
const NIVEL_LOGRO_POR_ROMANO: Record<'I' | 'II' | 'III' | 'IV', NivelLogro> = {
  I: 'INICIO',
  II: 'EN_PROCESO',
  III: 'LOGRO_ESPERADO',
  IV: 'LOGRO_DESTACADO',
};

/** Numeral romano de cada nivel de logro, para buscar su denominación en la escala. */
const ROMANO_POR_NIVEL_LOGRO: Record<NivelLogro, 'I' | 'II' | 'III' | 'IV'> = {
  INICIO: 'I',
  EN_PROCESO: 'II',
  LOGRO_ESPERADO: 'III',
  LOGRO_DESTACADO: 'IV',
};

export interface ResultadoBaremo {
  puntajeTotal: number;
  /** Puntaje máximo alcanzable con la cantidad de desempeños evaluados. */
  puntajeMaximo: number;
  promedio: number;
  nivelLogro: NivelLogro;
  /**
   * Nombre del nivel tal como lo escribió la plantilla.
   *
   * La rúbrica docente llama «Logro destacado» a su nivel IV y la directiva
   * «Satisfactorio» al suyo: el ordinal se guarda, el nombre se muestra.
   */
  denominacion: string;
  /** Porcentaje del puntaje máximo, redondeado, para mostrar en pantalla. */
  porcentaje: number;
}

/**
 * Resultado completo del baremo a partir de los niveles asignados.
 *
 * Una ficha sin desempeños devuelve el resultado neutro en lugar de fallar: la
 * pantalla la muestra en blanco mientras el evaluador la completa.
 */
export function calcularResultadoBaremo(
  niveles: readonly number[],
  escala: readonly TramoDeEscala[] = [],
  modo: ModoDeBaremo = 'Vigente',
): ResultadoBaremo {
  const puntajeMaximo = niveles.length * NIVEL_DESEMPENO_MAXIMO;

  if (niveles.length === 0) {
    return {
      puntajeTotal: 0,
      puntajeMaximo: 0,
      promedio: 1,
      nivelLogro: 'INICIO',
      denominacion: NIVEL_LOGRO_LABELS.INICIO,
      porcentaje: 0,
    };
  }

  const puntajeTotal = niveles.reduce((acc, n) => acc + n, 0);
  const promedio = calcularPromedio(niveles);
  const porcentaje = puntajeMaximo > 0 ? Math.round((puntajeTotal / puntajeMaximo) * 100) : 0;

  /**
   * El nivel de logro es INDEPENDIENTE de cuántos desempeños tenga la ficha.
   *
   * Se decide sobre el promedio (escala 1–4), que es el puntaje ya normalizado
   * por la cantidad de desempeños —equivale a clasificar por el porcentaje del
   * máximo, porque `promedio = puntajeTotal / puntajeMáximo × 4`—. Antes el modo
   * `Vigente` cortaba sobre el puntaje absoluto contra los rangos de la escala,
   * calibrados para un techo fijo (la rúbrica docente, 5·8·13·18 sobre 20); una
   * plantilla con menos desempeños nunca alcanzaba los tramos altos y una ficha
   * perfecta caía en «en proceso».
   *
   * El modo `Porcentual` (rúbrica directiva) conserva sus propios umbrales sobre
   * el porcentaje de avance —25·50·75·100—, que ya son independientes del conteo.
   *
   * En ambos casos la escala de la plantilla sólo aporta el NOMBRE del nivel; el
   * puntaje total (0–20 en docente) y el promedio no cambian.
   */
  let nivelLogro: NivelLogro;
  let denominacion: string;

  if (modo === 'Porcentual' && escala.length > 0) {
    const tramo = nivelPorEscala(porcentaje, escala);
    nivelLogro = tramo ? NIVEL_LOGRO_POR_ROMANO[tramo.nivelRomano] : calcularNivelLogro(promedio);
    denominacion = tramo?.denominacion ?? NIVEL_LOGRO_LABELS[nivelLogro];
  } else {
    nivelLogro = calcularNivelLogro(promedio);
    const tramo = escala.find((t) => t.nivelRomano === ROMANO_POR_NIVEL_LOGRO[nivelLogro]);
    denominacion = tramo?.denominacion ?? NIVEL_LOGRO_LABELS[nivelLogro];
  }

  return {
    puntajeTotal,
    puntajeMaximo,
    promedio,
    nivelLogro,
    denominacion,
    porcentaje,
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
