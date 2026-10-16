/**
 * Fichas que se imprimen con el formulario oficial que genera el backend.
 *
 * Hoy sólo la docente. El directivo y la EIB tienen formularios propios que aún
 * no se incorporaron, y conservan la impresión anterior del navegador. Una sola
 * regla para todos los lugares desde donde se imprime, de modo que el mismo botón
 * no dé un documento distinto según dónde se pulse.
 */
export const tieneFormatoOficial = (instrumento: string | undefined): boolean =>
  instrumento === 'DOCENTE';
