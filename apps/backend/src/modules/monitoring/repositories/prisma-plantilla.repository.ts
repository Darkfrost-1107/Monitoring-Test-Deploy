import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { IPlantilla, RolAutorPlantilla } from '@sistema-monitoreo/shared-contracts';
import {
  PlantillaRepository,
  CreatePlantillaData,
  UpdatePlantillaData,
} from './plantilla.repository.js';
import {
  findAllPlantillas,
  findPlantillaById,
  countFichasAsociadas,
  findFichasByPlantilla,
} from './plantilla-read.helper.js';
import {
  createPlantilla,
  updatePlantillaInPlace,
  updatePlantillaEstado,
  softDeletePlantilla,
} from './plantilla-write.helper.js';
import { eliminarConCascade as eliminarConCascadeFn } from './plantilla-delete.helper.js';
import { versionarConClon } from './plantilla-versionar.helper.js';
import { clonePlantilla } from './plantilla-clone.helper.js';

@Injectable()
export class PrismaPlantillaRepository implements PlantillaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters?: any): Promise<IPlantilla[]> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return findAllPlantillas(this.prisma, filters);
  }

  async findById(id: string): Promise<IPlantilla | null> {
    return findPlantillaById(this.prisma, id);
  }

  async countFichasAsociadas(plantillaId: string): Promise<number> {
    return countFichasAsociadas(this.prisma, plantillaId);
  }

  async findFichasByPlantilla(
    plantillaId: string,
  ): Promise<{ id: string; evidenciaUrls: string[] }[]> {
    return findFichasByPlantilla(this.prisma, plantillaId);
  }

  async create(data: CreatePlantillaData): Promise<IPlantilla> {
    return createPlantilla(this.prisma, data);
  }

  async updateInPlace(plantillaId: string, data: UpdatePlantillaData): Promise<IPlantilla> {
    return updatePlantillaInPlace(this.prisma, plantillaId, data);
  }

  async versionarConClon(
    plantillaOriginalId: string,
    data: UpdatePlantillaData,
    nuevoAutorId: string,
  ): Promise<IPlantilla> {
    return versionarConClon(this.prisma, plantillaOriginalId, data, nuevoAutorId);
  }

  async updateEstado(
    id: string,
    estado: 'Borrador' | 'Vigente' | 'Historico',
  ): Promise<IPlantilla> {
    return updatePlantillaEstado(this.prisma, id, estado);
  }

  async softDelete(id: string): Promise<IPlantilla> {
    return softDeletePlantilla(this.prisma, id);
  }

  async eliminarConCascade(id: string): Promise<{ id: string; deletedFichas: number }> {
    return eliminarConCascadeFn(this.prisma, id);
  }

  async clone(
    sourceId: string,
    nuevoAutorId: string,
    rolAutorAlCrear: RolAutorPlantilla,
    institucionId: string | null,
    descripcion?: string,
    anioAcademico?: number,
  ): Promise<IPlantilla> {
    return clonePlantilla(
      this.prisma,
      sourceId,
      nuevoAutorId,
      rolAutorAlCrear,
      institucionId,
      descripcion,
      anioAcademico,
    );
  }
}
