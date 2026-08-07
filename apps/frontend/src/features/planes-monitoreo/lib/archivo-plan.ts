/**
 * Validación del PDF del plan de monitoreo.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Estaba dentro del manejador `onChange` del
 * campo de archivo de `PlanMonitoreoAnualPage`, mezclada con las llamadas que
 * fijan el estado.
 */

/** Tamaño máximo aceptado, en bytes. */
export const TAMANO_MAXIMO = 10 * 1024 * 1024;

const TIPO_PDF = 'application/pdf';

export interface ArchivoValidable {
  type: string;
  size: number;
}

/**
 * El motivo por el que el archivo no sirve, o `null` si sirve.
 *
 * Devuelve el mensaje en lugar de un booleano porque la razón es lo que se le
 * muestra al usuario: saber que el archivo no vale no le dice si el problema es
 * el formato o el peso.
 */
export function motivoDeRechazo(archivo: ArchivoValidable): string | null {
  if (archivo.type !== TIPO_PDF) return 'El archivo debe ser en formato PDF.';
  if (archivo.size > TAMANO_MAXIMO) return 'El archivo no debe exceder los 10MB.';

  return null;
}

/** Peso del archivo en megabytes, con dos decimales. */
export const pesoEnMegas = (bytes: number): string => (bytes / (1024 * 1024)).toFixed(2);
