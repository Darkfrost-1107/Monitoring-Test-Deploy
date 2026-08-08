/**
 * Qué se le dice al usuario cuando una acción sobre el padrón no sale.
 *
 * Las cuatro tablas de padrón —docentes, directores, especialistas, jefes de
 * área— y la de instituciones mostraban estos errores con `alert()` del
 * navegador. Un `alert()` bloquea la pestaña entera y desaparece sin dejar
 * rastro al aceptarlo, que es justo lo contrario de lo que hace falta cuando
 * el mensaje explica por qué no se pudo dar de baja a alguien.
 */

/** Lo que devuelven las funciones de la capa de API. */
export interface ResultadoDeAccion {
  ok: boolean;
  error?: unknown;
}

/** Cuando ni siquiera se llegó al servidor. */
export const SIN_CONEXION =
  'No se pudo conectar con el servidor. Intente nuevamente en unos momentos.';

/**
 * El mensaje a mostrar, o nulo si la acción salió bien.
 *
 * Se prefiere el del servidor porque explica el motivo concreto —«tiene visitas
 * programadas»—; el respaldo sólo nombra la acción que falló, y se usa cuando
 * el servidor no dice nada útil.
 */
export function mensajeDeFallo(
  respuesta: ResultadoDeAccion,
  respaldo: string,
): string | null {
  if (respuesta.ok) return null;

  const delServidor = (respuesta.error as { message?: unknown } | null | undefined)?.message;

  return typeof delServidor === 'string' && delServidor.trim() ? delServidor : respaldo;
}
