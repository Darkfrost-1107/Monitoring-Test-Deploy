export interface ISignFichaRequest {
  /**
   * Rol que está firmando la ficha en este momento.
   * Debe coincidir con el rol del usuario autenticado respecto al cronograma.
   */
  rolFirmante: 'EVALUADOR' | 'EVALUADO';

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
