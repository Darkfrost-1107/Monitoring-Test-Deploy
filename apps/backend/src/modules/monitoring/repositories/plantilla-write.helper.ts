import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { Prisma } from '../../../generated/prisma/client.js';
import type { IPlantilla } from '@sistema-monitoreo/shared-contracts';
import type { CreatePlantillaData, UpdatePlantillaData } from './plantilla.repository.js';
import { buildPlantilla } from './plantilla-builder.helper.js';
import { syncArbol } from './plantilla-sync-arbol.helper.js';
import { syncArbolWithTx } from './plantilla-sync-arbol-tx.helper.js';
import type { SyncDesempeno } from './plantilla-sync-arbol-tx.helper.js';
import type { NivelCalificacionInput } from '../dto/create-plantilla.dto.js';
import { randomUUID } from 'node:crypto';

export async function createPlantilla(
  prisma: PrismaService,
  data: CreatePlantillaData,
): Promise<IPlantilla> {
  const maxVersion = await prisma.plantillaMonitoreo.aggregate({
    where: {
      tipoMonitoreo: data.data.tipoMonitoreo,
      anioAcademico: data.data.anioAcademico,
    },
    _max: { version: true },
  });
  const nextVersion = (maxVersion._max.version ?? 0) + 1;

  const id = randomUUID();
  await prisma.$transaction(async (tx) => {
    await tx.plantillaMonitoreo.create({
      data: {
        id,
        tipoMonitoreo: data.data.tipoMonitoreo,
        anioAcademico: data.data.anioAcademico,
        version: nextVersion,
        baremo: data.data.baremo,
        descripcion: data.data.descripcion,
        estado: 'Borrador',
        autorId: data.autorId,
        rolAutorAlCrear: data.rolAutorAlCrear,
        institucionId: data.institucionId,
        deleted: false,
      },
    });
    await syncArbolWithTx(
      tx,
      id,
      data.data.niveles,
      data.data.desempenos as unknown as SyncDesempeno[],
      data.data.ejeItems,
    );
  });
  return buildPlantilla(prisma, id);
}

export async function updatePlantillaInPlace(
  prisma: PrismaService,
  plantillaId: string,
  data: UpdatePlantillaData,
): Promise<IPlantilla> {
  const updateData: Prisma.PlantillaMonitoreoUpdateInput = {};
  if (data.data.baremo !== undefined) updateData.baremo = data.data.baremo;
  if (data.data.descripcion !== undefined) updateData.descripcion = data.data.descripcion;
  if (Object.keys(updateData).length > 0) {
    await prisma.plantillaMonitoreo.update({
      where: { id: plantillaId },
      data: updateData,
    });
  }
  if (data.data.niveles || data.data.desempenos || data.data.ejeItems) {
    const nivelesActuales = data.data.niveles
      ? data.data.niveles
      : ((
          await prisma.nivelCalificacion.findMany({
            where: { plantillaId },
            orderBy: { orden: 'asc' },
          })
        ).map((n) => ({
          nivelRomano: n.nivelRomano,
          denominacion: n.denominacion,
          rangoMin: n.rangoMin,
          color: n.color,
          orden: n.orden,
        })) as unknown as typeof data.data.niveles);

    const desempenosActuales = data.data.desempenos ? data.data.desempenos : [];
    if (data.data.desempenos) {
      await syncArbol(
        prisma,
        plantillaId,
        nivelesActuales as unknown as NivelCalificacionInput[],
        desempenosActuales,
        data.data.ejeItems,
      );
    } else {
      for (const n of nivelesActuales as {
        nivelRomano: string;
        denominacion: string;
        rangoMin: number;
        color?: string | null;
        orden: number;
      }[]) {
        const existing = await prisma.nivelCalificacion.findFirst({
          where: { plantillaId, nivelRomano: n.nivelRomano },
        });
        if (existing) {
          await prisma.nivelCalificacion.update({
            where: { id: existing.id },
            data: {
              denominacion: n.denominacion,
              rangoMin: n.rangoMin,
              color: n.color ?? undefined,
              orden: n.orden,
            },
          });
        }
      }
      if (data.data.ejeItems) {
        await syncArbol(
          prisma,
          plantillaId,
          nivelesActuales as unknown as NivelCalificacionInput[],
          [],
          data.data.ejeItems,
        );
      }
    }
  }
  return buildPlantilla(prisma, plantillaId);
}

export async function updatePlantillaEstado(
  prisma: PrismaService,
  id: string,
  estado: 'Borrador' | 'Vigente' | 'Historico',
): Promise<IPlantilla> {
  const exists = await prisma.plantillaMonitoreo.findUnique({ where: { id } });
  if (!exists) throw new NotFoundException(`Plantilla ${id} no encontrada.`);
  await prisma.plantillaMonitoreo.update({ where: { id }, data: { estado } });
  return buildPlantilla(prisma, id);
}

export async function softDeletePlantilla(prisma: PrismaService, id: string): Promise<IPlantilla> {
  const exists = await prisma.plantillaMonitoreo.findUnique({ where: { id } });
  if (!exists) throw new NotFoundException(`Plantilla ${id} no encontrada.`);
  if (exists.deleted) {
    return buildPlantilla(prisma, id);
  }
  await prisma.plantillaMonitoreo.update({
    where: { id },
    data: { deleted: true },
  });
  return buildPlantilla(prisma, id);
}
