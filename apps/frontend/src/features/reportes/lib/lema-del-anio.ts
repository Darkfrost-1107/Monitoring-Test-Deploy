/**
 * El lema oficial que encabeza todo documento del Estado peruano.
 *
 * Estaba escrito a mano dentro de `FichaPrintable`, fijo en el de 2025. Lo fija
 * un decreto supremo cada enero, de modo que una constante literal queda
 * desactualizada en cuanto cambia el año y el documento pasa a encabezarse con
 * el lema del año anterior.
 *
 * ── Por qué se devuelve nulo en vez de un respaldo ──
 * Un encabezado oficial equivocado es peor que ninguno: afirma la vigencia de
 * un decreto que ya no rige. Mientras no se cargue el lema del año, la ficha
 * se imprime sin esa línea.
 *
 * ── Cómo se actualiza ──
 * Agregar la entrada del año nuevo acá, con el texto exacto del decreto
 * supremo publicado en El Peruano.
 */

export const LEMAS_OFICIALES: Record<number, string> = {
  2023: 'Año de la unidad, la paz y el desarrollo',
  2024: 'Año del Bicentenario, de la consolidación de nuestra Independencia, y de la conmemoración de las heroicas batallas de Junín y Ayacucho',
  2025: 'Año de la recuperación y consolidación de la economía peruana',
};

/** El lema del año, o nulo si no hay ninguno declarado para él. */
export function lemaDelAnio(anio: number | string | null | undefined): string | null {
  if (anio == null || anio === '') return null;

  const numero = Number(anio);
  if (!Number.isInteger(numero)) return null;

  return LEMAS_OFICIALES[numero] ?? null;
}
