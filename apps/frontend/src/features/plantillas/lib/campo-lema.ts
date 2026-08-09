import { LEMA_ANUAL_MAX_LENGTH } from '@sistema-monitoreo/shared-contracts';

/**
 * El campo de lema oficial dentro del formulario de plantilla.
 *
 * El lema es propiedad del **año**, no de la plantilla: lo fija un decreto
 * supremo y es el mismo para todo el país. Por eso la primera plantilla de un
 * año lo carga y las siguientes lo encuentran cargado.
 *
 * ── Por qué solo lectura por defecto ──
 * Si el campo fuera editable siempre, registrar la segunda plantilla de 2026
 * con el texto viejo en pantalla pisaría el lema del año entero, y con él el
 * encabezado de todas las fichas. Corregirlo se pide a propósito.
 */

interface EntradaDelCampo {
  /** Lema que el año ya tiene, o nulo si no se cargó. */
  lemaGuardado: string | null;
  /** La consulta del año sigue en curso. */
  cargando: boolean;
  /** El usuario pidió corregir un lema ya cargado. */
  corrigiendo: boolean;
}

export type EstadoDelCampoLema =
  | { modo: 'cargando' }
  | { modo: 'alta'; lemaGuardado: null }
  | { modo: 'lectura'; lemaGuardado: string }
  | { modo: 'correccion'; lemaGuardado: string };

export function estadoDelCampoLema({
  lemaGuardado,
  cargando,
  corrigiendo,
}: EntradaDelCampo): EstadoDelCampoLema {
  if (cargando) return { modo: 'cargando' };

  if (!lemaGuardado) return { modo: 'alta', lemaGuardado: null };

  return corrigiendo
    ? { modo: 'correccion', lemaGuardado }
    : { modo: 'lectura', lemaGuardado };
}

/** Devuelve el mensaje de la falta, o `null` si el lema se puede guardar. */
export function validarLema(lema: string): string | null {
  const limpio = lema.trim();

  if (!limpio) return 'El lema oficial del año es obligatorio.';

  if (limpio.length > LEMA_ANUAL_MAX_LENGTH) {
    return `El lema oficial no puede superar los ${LEMA_ANUAL_MAX_LENGTH} caracteres.`;
  }

  return null;
}
