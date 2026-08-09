import { Injectable } from '@nestjs/common';
import type { ILemaAnual } from '@sistema-monitoreo/shared-contracts';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { LemaAnualRepository } from './lema-anual.repository.js';

interface FilaLemaAnual {
  anio: number;
  lema: string;
  createdAt: Date;
  updatedAt: Date;
}

const aContrato = (fila: FilaLemaAnual): ILemaAnual => ({
  anio: fila.anio,
  lema: fila.lema,
  createdAt: fila.createdAt.toISOString(),
  updatedAt: fila.updatedAt.toISOString(),
});

@Injectable()
export class PrismaLemaAnualRepository extends LemaAnualRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByAnio(anio: number): Promise<ILemaAnual | null> {
    const fila = await this.prisma.lemaAnual.findUnique({ where: { anio } });
    return fila ? aContrato(fila) : null;
  }

  /**
   * El año es la clave primaria, de modo que la corrección de un lema ya
   * cargado se resuelve con el mismo `upsert` que su alta.
   */
  async upsert(anio: number, lema: string, autorId: string): Promise<ILemaAnual> {
    const fila = await this.prisma.lemaAnual.upsert({
      where: { anio },
      create: { anio, lema, autorId },
      update: { lema, autorId },
    });

    return aContrato(fila);
  }
}
