/**
 * Numeración de las visitas de un evaluado.
 *
 * Fase 5 de PLAN_REMEDIACION.md. Vivía como un `useMemo` de cuarenta líneas
 * dentro de `CronogramaPage`, recorriendo la misma lista cuatro veces para
 * armar dos conjuntos y un máximo.
 *
 * La regla: los números se asignan en orden y no se saltean. La única excepción
 * es el hueco de una visita anulada, que puede reutilizarse —es la única forma
 * de volver a emitir un número ya usado, y por eso se distingue en pantalla.
 */

/** Números que se ofrecen siempre, aunque el evaluado tenga menos visitas. */
export const MINIMO_DE_VISITAS = 5;

/** Estado de una visita dada de baja lógica. */
const ANULADO = 'ANULADO';

export interface VisitaNumerada {
  nroVisita: string;
  estado: string;
}

export interface NumeroDeVisita {
  /** Valor con dos dígitos, tal como se guarda. */
  value: string;
  num: number;
  /** Ya hay una visita vigente con ese número. */
  isOcupado: boolean;
  /** Hubo una visita con ese número y fue anulada: el hueco es reutilizable. */
  isAnulado: boolean;
  /** Saltearía la numeración: hay que usar antes el primero libre. */
  isFuture: boolean;
}

/**
 * Números disponibles para la visita que se está programando.
 *
 * Recibe únicamente las visitas del mismo evaluado y del mismo tipo: la
 * numeración es independiente entre docentes y entre monitoreo docente y
 * directivo.
 */
export function numerosDeVisitaDisponibles(
  visitasDelEvaluado: readonly VisitaNumerada[],
): NumeroDeVisita[] {
  const vigentes = new Set<number>();
  const anuladas = new Set<number>();

  for (const visita of visitasDelEvaluado) {
    const numero = parseInt(visita.nroVisita, 10);
    if (Number.isNaN(numero)) continue;

    if (visita.estado === ANULADO) anuladas.add(numero);
    else vigentes.add(numero);
  }

  // Las anuladas no empujan el tope: su número volvió a estar libre.
  const ultimaVigente = vigentes.size > 0 ? Math.max(...vigentes) : 0;
  const cuantos = Math.max(MINIMO_DE_VISITAS, ultimaVigente + 1);

  return Array.from({ length: cuantos }, (_, indice) => {
    const num = indice + 1;
    const ocupado = vigentes.has(num);
    const anulado = anuladas.has(num);

    return {
      value: String(num).padStart(2, '0'),
      num,
      isOcupado: ocupado,
      isAnulado: anulado,
      isFuture: !ocupado && !anulado && num > ultimaVigente + 1,
    };
  });
}
