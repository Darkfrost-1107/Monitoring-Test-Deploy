/**
 * El lema oficial que encabeza todo documento del Estado peruano.
 *
 * Lo fija un decreto supremo cada enero y es el mismo para todo el país, de modo
 * que es propiedad del **año**, no de la plantilla que se registre en él.
 *
 * ── Por qué una fila por año y no un único «lema vigente» ──
 * Una ficha de 2025 que se reimprima en 2027 debe salir con el lema de 2025:
 * es un documento histórico y lleva el decreto que regía cuando se levantó. Un
 * valor único y mutable falsificaría el archivo cada vez que cambia el año.
 *
 * Antes vivía como una tabla literal en el frontend
 * (`features/reportes/lib/lema-del-anio.ts`), lo que obligaba a editar código y
 * desplegar cada enero.
 */

export interface ILemaAnual {
  anio: number;
  lema: string;
  createdAt: string;
  updatedAt: string;
}

/** Alta o corrección del lema de un año. */
export interface IUpsertLemaAnualRequest {
  lema: string;
}

/** Largo máximo aceptado; los lemas del Bicentenario rondan los 130 caracteres. */
export const LEMA_ANUAL_MAX_LENGTH = 250;

/** El primer año del que el sistema guarda registro. */
export const LEMA_ANUAL_ANIO_MINIMO = 2020;
