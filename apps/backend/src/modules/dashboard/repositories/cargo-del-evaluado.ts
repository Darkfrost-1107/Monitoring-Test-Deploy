/**
 * Qué cargo ocupa hoy la persona evaluada.
 *
 * ── Por qué no se deduce del tipo de ficha ──
 * Los tableros derivaban el cargo de `tipoMonitoreo`: si la ficha era
 * DIRECTIVO, la persona era director. La premisa era que a un director siempre
 * se lo monitorea con la ficha directiva, y en los datos no se cumplía: había
 * directores en ejercicio con una ficha docente cargada, y «Requieren atención»
 * los mostraba como docentes.
 *
 * El instrumento dice con qué se evaluó a alguien. Sólo la designación dice
 * quién es. Son dos hechos distintos y no se sustituyen entre sí.
 */

/** Lo mínimo que hace falta saber del evaluado: si tiene designación abierta. */
export interface EvaluadoConDesignaciones {
  docenteCargos: { id: string }[];
}

/**
 * ¿Dirige hoy la institución?
 *
 * La consulta ya filtra por designación de Director sin `fechaFin`, así que
 * basta con que haya traído alguna: quien fue director y cesó no cuenta.
 */
export const esDirectorEnEjercicio = (evaluado: EvaluadoConDesignaciones): boolean =>
  evaluado.docenteCargos.length > 0;
