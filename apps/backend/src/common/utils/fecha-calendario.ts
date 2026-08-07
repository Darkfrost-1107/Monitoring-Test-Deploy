/**
 * Serialización de fechas de calendario.
 *
 * Fase 6 de PLAN_REMEDIACION.md. Las columnas `@db.Date` del esquema
 * —`fechaProgramada`, `fechaOriginal`, `fechaPropuesta`— guardan una fecha sin
 * hora: el día en que ocurre algo, no un instante.
 *
 * Prisma las entrega como `Date` a medianoche UTC. Serializarlas con
 * `toISOString()` produce `2026-03-09T00:00:00.000Z`, que el cliente interpreta
 * como un instante y, estando en Perú (UTC-5), muestra como **8 de marzo**.
 *
 * La regla: una fecha de calendario viaja como `YYYY-MM-DD`. Sin hora y sin
 * zona, porque no las tiene. Añadirlas obliga a cada consumidor a adivinar si
 * el instante importa —y a equivocarse.
 */

/** Longitud de `YYYY-MM-DD`. */
const LARGO_FECHA_ISO = 10;

/**
 * Convierte una columna `@db.Date` **no nula** a `YYYY-MM-DD`.
 *
 * Lanza ante una fecha inválida en lugar de emitir una cadena sin sentido. La
 * columna está declarada `NOT NULL`: un valor ilegible ahí es corrupción de
 * datos, y el servidor —que tiene registros— debe decirlo, no propagar una
 * fecha equivocada al cliente.
 */
export function aFechaDeCalendario(valor: Date | string): string {
  if (valor instanceof Date) {
    if (isNaN(valor.getTime())) {
      throw new Error('Fecha de calendario inválida al serializar una columna no nula.');
    }
    return valor.toISOString().slice(0, LARGO_FECHA_ISO);
  }

  return String(valor).slice(0, LARGO_FECHA_ISO);
}

/** Igual, para columnas que sí admiten ausencia. */
export function aFechaDeCalendarioOpcional(valor: Date | string | null | undefined): string | null {
  if (!valor) return null;
  if (valor instanceof Date && isNaN(valor.getTime())) return null;
  return aFechaDeCalendario(valor);
}
