/**
 * Presentación del nivel de logro.
 *
 * Fase 7 de PLAN_REMEDIACION.md. La tabla de equivalencias estaba escrita dos
 * veces en `ReportesGrid` —una en la vista de cuadrícula y otra en la de
 * tabla—, en ambos casos con el mismo respaldo: `|| 'III'`. Un nivel
 * desconocido, o ausente, se mostraba como logro esperado.
 */

const ROMANO_POR_NIVEL: Record<string, string> = {
  INICIO: 'I',
  EN_PROCESO: 'II',
  LOGRO_ESPERADO: 'III',
  LOGRO_DESTACADO: 'IV',
};

/**
 * El numeral romano del nivel de logro, o `null` si no se lo puede determinar.
 *
 * Devuelve `null` en lugar de un nivel por omisión: una ficha sin calificar no
 * es una ficha con logro esperado.
 */
export const nivelLogroARomano = (nivel: string | null | undefined): string | null =>
  (nivel && ROMANO_POR_NIVEL[nivel]) || null;

const ROMANOS = ['I', 'II', 'III', 'IV'];

/**
 * Nivel numérico del backend (1 a 4) a su numeral romano.
 *
 * Fuera de ese rango devuelve `null`. Antes devolvía `'I'`, de modo que un
 * valor inesperado se mostraba como una calificación de inicio en lugar de
 * como lo que era: un dato que no se pudo leer.
 */
export const nivelNumericoARomano = (nivel: number | null | undefined): string | null =>
  nivel == null ? null : (ROMANOS[nivel - 1] ?? null);
