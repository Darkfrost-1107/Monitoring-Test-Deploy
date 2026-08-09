import { randomUUID } from 'node:crypto';
import type { Prisma } from '../../../generated/prisma/client.js';

export interface SyncNivel {
  nivelRomano: string;
  denominacion: string;
  rangoMin: number;
  color?: string | null;
  orden: number;
}

export interface SyncAspecto {
  id: string;
  descripcion: string;
  orden: number;
}

export interface SyncRubrica {
  nivelRomano: string;
  descripcion: string;
}

export interface SyncDesempeno {
  id: string;
  nombre: string;
  descripcionCorta: string;
  preguntaExtra?: string | null;
  orden: number;
  aspectos: SyncAspecto[];
  rubrica: SyncRubrica[];
}

export interface SyncEjeItem {
  numero: number;
  descripcion: string;
  orden?: number | null;
}

export async function syncArbolWithTx(
  tx: Prisma.TransactionClient,
  plantillaId: string,
  niveles: SyncNivel[],
  desempenos: SyncDesempeno[],
  ejeItems?: SyncEjeItem[],
): Promise<void> {
  for (const n of niveles) {
    await tx.nivelCalificacion.create({
      data: {
        id: randomUUID(),
        plantillaId,
        nivelRomano: n.nivelRomano,
        denominacion: n.denominacion,
        rangoMin: n.rangoMin,
        color: n.color ?? '#000000',
        orden: n.orden,
      },
    });
  }

  for (const d of desempenos) {
    await tx.desempenoPlantilla.create({
      data: {
        id: d.id,
        plantillaId,
        nombre: d.nombre,
        descripcionCorta: d.descripcionCorta,
        preguntaExtra: d.preguntaExtra,
        orden: d.orden,
        aspectos: {
          create: d.aspectos.map((a) => ({
            id: a.id,
            descripcion: a.descripcion,
            orden: a.orden,
          })),
        },
      },
    });

    for (const r of d.rubrica) {
      const nivel = await tx.nivelCalificacion.findFirst({
        where: { plantillaId, nivelRomano: r.nivelRomano },
      });
      if (!nivel) continue;
      await tx.rubricaNivel.create({
        data: {
          desempenoId: d.id,
          nivelCalificacionId: nivel.id,
          descripcion: r.descripcion,
        },
      });
    }
  }

  if (ejeItems) {
    for (const item of ejeItems) {
      await tx.ejeItemPlantilla.create({
        data: {
          id: randomUUID(),
          plantillaId,
          numero: item.numero,
          descripcion: item.descripcion,
          orden: item.orden ?? item.numero,
        },
      });
    }
  }
}
