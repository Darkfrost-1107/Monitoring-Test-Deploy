import { aFechaLocal, aFechaISOLocal, hoyISO } from '@shared/lib/fecha/fecha';

export type FiltroPeriodoTipo = 'TODOS' | 'HOY' | 'ESTA_SEMANA' | 'ESTE_MES';

export interface FiltroPeriodoOpcion {
  id: FiltroPeriodoTipo;
  label: string;
}

export const FILTROS_PERIODO: readonly FiltroPeriodoOpcion[] = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'HOY', label: 'Hoy' },
  { id: 'ESTA_SEMANA', label: 'Esta semana' },
  { id: 'ESTE_MES', label: 'Este mes' },
] as const;

/**
 * Determina si una fecha corresponde al día de hoy (en tiempo local).
 */
export function esFechaDeHoy(fechaStr: string | null | undefined, ahora: Date = new Date()): boolean {
  if (!fechaStr) return false;
  const isoFecha = aFechaISOLocal(fechaStr);
  const isoHoy = hoyISO(ahora);
  return isoFecha === isoHoy && isoFecha !== '';
}

/**
 * Determina si una fecha cae en la semana actual (Lunes a Domingo).
 */
export function esFechaDeEstaSemana(fechaStr: string | null | undefined, ahora: Date = new Date()): boolean {
  const d = aFechaLocal(fechaStr);
  if (!d) return false;

  const diaSemana = ahora.getDay();
  const diasDesdeLunes = (diaSemana + 6) % 7;

  const inicioSemana = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - diasDesdeLunes, 0, 0, 0, 0);
  const finSemana = new Date(inicioSemana.getFullYear(), inicioSemana.getMonth(), inicioSemana.getDate() + 6, 23, 59, 59, 999);

  return d >= inicioSemana && d <= finSemana;
}

/**
 * Determina si una fecha cae en el mes y año actual.
 */
export function esFechaDeEsteMes(fechaStr: string | null | undefined, ahora: Date = new Date()): boolean {
  const d = aFechaLocal(fechaStr);
  if (!d) return false;

  return d.getFullYear() === ahora.getFullYear() && d.getMonth() === ahora.getMonth();
}

/**
 * Evalúa si una visita cumple con el filtro de período seleccionado.
 */
export function coincideConPeriodo(
  fechaStr: string | null | undefined,
  filtro: FiltroPeriodoTipo,
  ahora: Date = new Date(),
): boolean {
  switch (filtro) {
    case 'HOY':
      return esFechaDeHoy(fechaStr, ahora);
    case 'ESTA_SEMANA':
      return esFechaDeEstaSemana(fechaStr, ahora);
    case 'ESTE_MES':
      return esFechaDeEsteMes(fechaStr, ahora);
    case 'TODOS':
    default:
      return true;
  }
}

/**
 * Rango de fechas [desde, hasta] que corresponde a un período, para filtrar en el
 * servidor. Usa los MISMOS límites locales que `coincideConPeriodo`/las píldoras,
 * así el conteo del análisis coincide con lo que muestran los badges. Se devuelve
 * como ISO (UTC) porque el backend compara contra un timestamp (`createdAt`).
 */
export function rangoDePeriodo(
  filtro: FiltroPeriodoTipo,
  ahora: Date = new Date(),
): { fechaDesde?: string; fechaHasta?: string } {
  if (filtro === 'TODOS') return {};

  let inicio: Date;
  let fin: Date;

  if (filtro === 'HOY') {
    inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0);
    fin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999);
  } else if (filtro === 'ESTA_SEMANA') {
    const diasDesdeLunes = (ahora.getDay() + 6) % 7;
    inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - diasDesdeLunes, 0, 0, 0, 0);
    fin = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 6, 23, 59, 59, 999);
  } else {
    // ESTE_MES: del día 1 al último día del mes (día 0 del mes siguiente).
    inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0, 0);
    fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  return { fechaDesde: inicio.toISOString(), fechaHasta: fin.toISOString() };
}

/**
 * Calcula los conteos de visitas por cada período para alimentar los badges de las píldoras.
 */
export function calcularConteosPorPeriodo(
  visitas: Array<{ fechaHora: string }>,
  ahora: Date = new Date(),
): Record<FiltroPeriodoTipo, number> {
  let hoy = 0;
  let estaSemana = 0;
  let esteMes = 0;

  for (const v of visitas) {
    if (esFechaDeHoy(v.fechaHora, ahora)) hoy++;
    if (esFechaDeEstaSemana(v.fechaHora, ahora)) estaSemana++;
    if (esFechaDeEsteMes(v.fechaHora, ahora)) esteMes++;
  }

  return {
    TODOS: visitas.length,
    HOY: hoy,
    ESTA_SEMANA: estaSemana,
    ESTE_MES: esteMes,
  };
}
