/**
 * Fichas que se imprimen con el formulario oficial que genera el backend.
 *
 * La docente y la directiva. La EIB tiene un formulario propio que aún no se
 * incorporó, y conserva la impresión anterior del navegador. Una sola regla para todos
 * los lugares desde donde se imprime, de modo que el mismo botón no dé un documento
 * distinto según dónde se pulse.
 */
const CON_FORMATO_OFICIAL: readonly string[] = ['DOCENTE', 'DIRECTIVO'];

export const tieneFormatoOficial = (instrumento: string | undefined): boolean =>
  !!instrumento && CON_FORMATO_OFICIAL.includes(instrumento);
