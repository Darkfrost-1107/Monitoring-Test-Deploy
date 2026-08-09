import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { IPlantilla } from '@sistema-monitoreo/shared-contracts';
import { buildPlantilla } from './plantilla-builder.helper.js';
import { randomUUID } from 'node:crypto';

export async function clonePlantilla(
  prisma: PrismaService,
  sourceId: string,
  nuevoAutorId: string,
  rolAutorAlCrear: 'jefe_gestion' | 'director_ie',
  institucionId: string | null,
  descripcion?: string,
  anioAcademico?: number,
): Promise<IPlantilla> {
  const original = await prisma.plantillaMonitoreo.findUnique({
    where: { id: sourceId },
    include: {
      nivelesCalificacion: { orderBy: { orden: 'asc' } },
      desempenos: {
        orderBy: { orden: 'asc' },
        include: {
          aspectos: { orderBy: { orden: 'asc' } },
          rubrica: { include: { nivelCalificacion: true } },
        },
      },
      ejesItems: { orderBy: { orden: 'asc' } },
    },
  });
  if (!original) throw new NotFoundException(`Plantilla origen ${sourceId} no encontrada.`);

  const anioDestino = anioAcademico ?? new Date().getFullYear();
  const maxVersion = await prisma.plantillaMonitoreo.aggregate({
    where: {
      tipoMonitoreo: original.tipoMonitoreo,
      anioAcademico: anioDestino,
    },
    _max: { version: true },
  });
  const nextVersion = (maxVersion._max.version ?? 0) + 1;

  const nuevoId = randomUUID();
  await prisma.plantillaMonitoreo.create({
    data: {
      id: nuevoId,
      tipoMonitoreo: original.tipoMonitoreo,
      anioAcademico: anioDestino,
      version: nextVersion,
      baremo: original.baremo,
      descripcion:
        descripcion ??
        `Copia basada en ${original.tipoMonitoreo} ${original.anioAcademico} v${original.version}.`,
      estado: 'Borrador',
      autorId: nuevoAutorId,
      rolAutorAlCrear,
      institucionId,
      deleted: false,
    },
  });

  for (const n of original.nivelesCalificacion) {
    await prisma.nivelCalificacion.create({
      data: {
        id: randomUUID(),
        plantillaId: nuevoId,
        nivelRomano: n.nivelRomano,
        denominacion: n.denominacion,
        rangoMin: n.rangoMin,
        color: n.color,
        orden: n.orden,
      },
    });
  }

  const nuevosNiveles = await prisma.nivelCalificacion.findMany({
    where: { plantillaId: nuevoId },
  });
  const mapNiveles: Record<string, string> = {};
  for (const o of original.nivelesCalificacion) {
    const n = nuevosNiveles.find((x) => x.nivelRomano === o.nivelRomano);
    if (n) mapNiveles[o.id] = n.id;
  }

  for (const d of original.desempenos) {
    await prisma.desempenoPlantilla.create({
      data: {
        id: randomUUID(),
        plantillaId: nuevoId,
        nombre: d.nombre,
        descripcionCorta: d.descripcionCorta,
        preguntaExtra: d.preguntaExtra,
        orden: d.orden,
        aspectos: {
          create: d.aspectos.map((a) => ({
            id: randomUUID(),
            descripcion: a.descripcion,
            orden: a.orden,
          })),
        },
        rubrica: {
          create: d.rubrica.map((r) => ({
            nivelCalificacionId: mapNiveles[r.nivelCalificacionId] ?? nuevosNiveles[0].id,
            descripcion: r.descripcion,
          })),
        },
      },
    });
  }

  for (const e of original.ejesItems) {
    await prisma.ejeItemPlantilla.create({
      data: {
        id: randomUUID(),
        plantillaId: nuevoId,
        numero: e.numero,
        descripcion: e.descripcion,
        orden: e.orden,
      },
    });
  }

  return buildPlantilla(prisma, nuevoId);
}
