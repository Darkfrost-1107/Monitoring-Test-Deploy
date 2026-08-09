import { BadRequestException, Injectable } from '@nestjs/common';
import {
  LEMA_ANUAL_ANIO_MINIMO,
  LEMA_ANUAL_MAX_LENGTH,
  type ILemaAnual,
} from '@sistema-monitoreo/shared-contracts';
import { LemaAnualRepository } from '../repositories/lema-anual.repository.js';

/**
 * El lema oficial que encabeza todo documento del Estado peruano.
 *
 * Lo fija un decreto supremo cada enero y es el mismo para todo el país: es
 * propiedad del año, no de la plantilla registrada en él. Guardarlo por
 * plantilla habría dejado una copia por cada tipo de monitoreo, cada versión y
 * cada institución, todas editables por separado y libres de divergir.
 */
@Injectable()
export class LemaAnualService {
  constructor(private readonly repository: LemaAnualRepository) {}

  /** El lema del año, o nulo si todavía no se cargó. */
  async findByAnio(anio: number): Promise<ILemaAnual | null> {
    return this.repository.findByAnio(anio);
  }

  /**
   * Carga o corrige el lema de un año.
   *
   * Se acepta hasta el año siguiente al corriente: el decreto del año nuevo
   * suele publicarse sobre el cambio de año, y quien registre la primera
   * plantilla de enero necesita poder cargarlo.
   */
  async upsert(anio: number, lema: string, autorId: string): Promise<ILemaAnual> {
    const limpio = lema.trim();

    if (!limpio) {
      throw new BadRequestException('El lema oficial del año no puede estar vacío.');
    }

    if (limpio.length > LEMA_ANUAL_MAX_LENGTH) {
      throw new BadRequestException(
        `El lema oficial no puede superar los ${LEMA_ANUAL_MAX_LENGTH} caracteres.`,
      );
    }

    const anioMaximo = new Date().getFullYear() + 1;

    if (!Number.isInteger(anio) || anio < LEMA_ANUAL_ANIO_MINIMO || anio > anioMaximo) {
      throw new BadRequestException(
        `El año debe estar entre ${LEMA_ANUAL_ANIO_MINIMO} y ${anioMaximo}.`,
      );
    }

    return this.repository.upsert(anio, limpio, autorId);
  }
}
