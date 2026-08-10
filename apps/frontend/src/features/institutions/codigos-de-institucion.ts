/**
 * Los códigos que identifican a una institución educativa.
 *
 * ── Por qué esto no vive suelto en el formulario ──
 * El largo del código de local estaba escrito cinco veces en el mismo
 * componente: la etiqueta, el recorte del campo, el regex, el mensaje de error
 * y el placeholder. Cuando se corrigió a seis dígitos sólo cambiaron dos, y el
 * campo quedó imposible de completar: recortaba a seis y exigía ocho, así que
 * ningún valor pasaba la validación.
 *
 * Acá el largo se declara una vez y todo lo demás se deriva de él. No hay un
 * segundo lugar que pueda quedar desactualizado.
 */

/** Código de local: identifica al predio donde funciona la institución. */
export const LARGO_CODIGO_LOCAL = 6;

/** Código modular: identifica a la institución en el padrón del Minedu. */
export const LARGO_CODIGO_MODULAR = 7;

/** Un código válido es exactamente esa cantidad de dígitos, sin separadores. */
export const esCodigoValido = (valor: string, largo: number): boolean =>
  new RegExp(`^\\d{${largo}}$`).test(valor);

/**
 * El error que corresponde a un código.
 *
 * Cadena vacía cuando está bien, que es lo que el formulario interpreta como
 * «sin error».
 */
export const errorDeCodigo = (valor: string, largo: number): string => {
  if (!valor) return 'Obligatorio';
  return esCodigoValido(valor, largo) ? '' : `Deben ser ${largo} dígitos`;
};

/** Deja sólo dígitos y no admite más de los que el código lleva. */
export const recortarCodigo = (valor: string, largo: number): string =>
  valor.replace(/\D/g, '').slice(0, largo);

/** Un ejemplo del largo correcto, para el placeholder del campo. */
export const ejemploDeCodigo = (largo: number): string =>
  `Ej. ${'1234567890'.slice(0, largo)}`;
