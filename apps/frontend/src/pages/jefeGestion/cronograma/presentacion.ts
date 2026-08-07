import type { Cronograma } from '@entities/model-cronogramas';

/**
 * Presentación del listado de cronogramas.
 *
 * Fase 5 de PLAN_REMEDIACION.md. Estaban repartidos entre la cabecera del
 * archivo y el cuerpo del componente, mezclados con la lógica de la página.
 */

/**
 * Color del círculo de iniciales.
 *
 * La tabla asigna colores por iniciales conocidas, no por hash: es una lista
 * fija heredada. Cualquier inicial fuera de ella cae al gris neutro, de modo
 * que agregar personal no rompe nada pero tampoco le da color propio.
 */
const COLOR_POR_INICIALES: Record<string, string> = {
  JP: 'bg-pink-100 text-pink-700 dark:bg-pink-950/30 dark:text-pink-400',
  MG: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  CM: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
  AT: 'bg-teal-100 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400',
  PA: 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400',
  RQ: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  LM: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400',
  SR: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
};

const COLOR_NEUTRO = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

export const colorDeIniciales = (iniciales: string): string =>
  COLOR_POR_INICIALES[iniciales] ?? COLOR_NEUTRO;

const ESTILO_POR_TIPO: Record<Cronograma['tipo'], string> = {
  DOCENTE:
    'bg-rose-50 text-rose-600 border border-rose-200/50 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30',
  DIRECTIVO:
    'bg-blue-50 text-blue-600 border border-blue-200/50 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30',
};

export const estiloDeTipo = (tipo: Cronograma['tipo']): string => ESTILO_POR_TIPO[tipo];
import { formatearFecha, formatearHora } from '@shared/lib/fecha/fecha';

const ESTILO_POR_ESTADO: Record<Cronograma['estado'], string> = {
  PROGRAMADO:
    'bg-emerald-50 text-emerald-600 border border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30',
  EN_PROCESO:
    'bg-amber-50 text-amber-600 border border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
  COMPLETADO:
    'bg-purple-50 text-purple-600 border border-purple-200/50 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30',
  REPROGRAMADO:
    'bg-indigo-50 text-indigo-600 border border-indigo-200/50 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30',
  CANCELADO:
    'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/50',
  ANULADO:
    'bg-red-50 text-red-500 border border-red-200/50 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30',
};

export const estiloDeEstado = (estado: Cronograma['estado']): string =>
  ESTILO_POR_ESTADO[estado];

/** Fecha y hora de la visita, separadas para apilarlas en la celda. */
export function fechaYHoraDeTabla(iso: string): { datePart: string; timePart: string } {
  return {
    datePart: formatearFecha(iso, { day: '2-digit', month: 'short', year: 'numeric' }),
    timePart: formatearHora(iso, ''),
  };
}
