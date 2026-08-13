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
}

export interface ISignFichaResponse {
  success: boolean;
  message: string;
  firmaId: string;
}
