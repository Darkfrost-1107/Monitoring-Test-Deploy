export interface ISignFichaRequest {
  /**
   * ── Por qué acá no viaja el rol ──
   * Este cuerpo declaraba `rolFirmante`, el cliente lo enviaba y el servidor lo
   * IGNORABA: el rol sale de comparar la persona autenticada contra las partes
   * de la visita. Aceptarlo dejaría firmar como la contraparte, y anunciarlo en
   * el contrato hacía creer que el cliente lo decide.
   *
   * Al sumarse la firma del director de la I.E. el campo quedó además
   * incompleto —su enumeración no lo incluía—, de modo que se retira en vez de
   * ampliarlo.
   */

  /**
   * Checkbox de consentimiento legal o aceptación digital de la ficha.
   * Debe ser true para procesar la firma.
   */
  consentimiento: boolean;

  /**
   * Instrumento de la ficha que se firma.
   *
   * Hace falta cuando la ruta lleva el id del CRONOGRAMA y la visita tiene más
   * de una ficha: una visita docente puede llevar la ficha regular y la EIB, y
   * sin esto el servidor no puede saber cuál se está firmando. Opcional porque
   * quien pasa el id de la ficha ya es inequívoco.
   */
  plantillaId?: string;
}

export interface ISignFichaResponse {
  success: boolean;
  message: string;
  firmaId: string;
}
