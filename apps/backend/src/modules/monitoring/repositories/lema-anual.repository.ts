import type { ILemaAnual } from '@sistema-monitoreo/shared-contracts';

/**
 * Acceso al lema oficial de cada año académico.
 *
 * Una fila por año, con el año como clave primaria: el lema lo fija un decreto
 * supremo y es el mismo para todo el país, de modo que no hay forma de guardar
 * dos para el mismo año.
 */
export abstract class LemaAnualRepository {
  abstract findByAnio(anio: number): Promise<ILemaAnual | null>;

  /** Alta o corrección. El año ya existente se sobrescribe. */
  abstract upsert(anio: number, lema: string, autorId: string): Promise<ILemaAnual>;
}
