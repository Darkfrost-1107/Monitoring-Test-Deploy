import type { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { randomUUID } from 'node:crypto';
import type {
  NivelCalificacionInput,
  DesempenoInput,
  EjeItemInput,
} from '../dto/create-plantilla.dto.js';

export async function syncArbol(
  prisma: PrismaService,
  plantillaId: string,
  niveles: NivelCalificacionInput[],
  desempenos: DesempenoInput[],
  ejeItems?: EjeItemInput[],
): Promise<void> {
  for (const n of niveles) {
    const existing = await prisma.nivelCalificacion.findFirst({
      where: { plantillaId, nivelRomano: n.nivelRomano },
    });
    if (existing) {
      await prisma.nivelCalificacion.update({
        where: { id: existing.id },
        data: {
          denominacion: n.denominacion,
          rangoMin: n.rangoMin,
          color: n.color,
          orden: n.orden,
        },
      });
    } else {
      await prisma.nivelCalificacion.create({
        data: {
          id: randomUUID(),
          plantillaId,
          nivelRomano: n.nivelRomano,
          denominacion: n.denominacion,
          rangoMin: n.rangoMin,
          color: n.color,
          orden: n.orden,
        },
      });
    }
  }

  const desempenosActuales = await prisma.desempenoPlantilla.findMany({
    where: { plantillaId },
  });
  const idsActuales = new Set(desempenosActuales.map((d) => d.id));
  const idsNuevos = new Set(desempenos.map((d) => d.id));

  for (const actual of desempenosActuales) {
    if (!idsNuevos.has(actual.id)) {
      await prisma.desempenoPlantilla.delete({ where: { id: actual.id } });
    }
  }

  for (const d of desempenos) {
    const desempeno = idsActuales.has(d.id)
      ? await prisma.desempenoPlantilla.update({
          where: { id: d.id },
          data: {
            nombre: d.nombre,
            descripcionCorta: d.descripcionCorta,
            preguntaExtra: d.preguntaExtra,
            orden: d.orden,
          },
        })
      : await prisma.desempenoPlantilla.create({
          data: {
            id: d.id,
            plantillaId,
            nombre: d.nombre,
            descripcionCorta: d.descripcionCorta,
            preguntaExtra: d.preguntaExtra,
            orden: d.orden,
          },
        });

    const aspectosActuales = await prisma.aspectoEvaluado.findMany({
      where: { desempenoId: desempeno.id },
    });
    const idsAspectosActuales = new Set(aspectosActuales.map((a) => a.id));
    const idsAspectosNuevos = new Set(d.aspectos.map((a) => a.id));
    for (const actual of aspectosActuales) {
      if (!idsAspectosNuevos.has(actual.id)) {
        await prisma.aspectoEvaluado.delete({ where: { id: actual.id } });
      }
    }
    for (const a of d.aspectos) {
      if (idsAspectosActuales.has(a.id)) {
        await prisma.aspectoEvaluado.update({
          where: { id: a.id },
          data: { descripcion: a.descripcion, orden: a.orden },
        });
      } else {
        await prisma.aspectoEvaluado.create({
          data: {
            id: a.id,
            desempenoId: desempeno.id,
            descripcion: a.descripcion,
            orden: a.orden,
          },
        });
      }
    }

    for (const r of d.rubrica) {
      const nivel = await prisma.nivelCalificacion.findFirst({
        where: { plantillaId, nivelRomano: r.nivelRomano },
      });
      if (!nivel) continue;
      await prisma.rubricaNivel.upsert({
        where: {
          desempenoId_nivelCalificacionId: {
            desempenoId: desempeno.id,
            nivelCalificacionId: nivel.id,
          },
        },
        update: { descripcion: r.descripcion },
        create: {
          desempenoId: desempeno.id,
          nivelCalificacionId: nivel.id,
          descripcion: r.descripcion,
        },
      });
    }
  }

  if (ejeItems) {
    const itemsActuales = await prisma.ejeItemPlantilla.findMany({
      where: { plantillaId },
    });
    const numsActuales = new Set(itemsActuales.map((i) => i.numero));
    const numsNuevos = new Set(ejeItems.map((i) => i.numero));

    for (const actual of itemsActuales) {
      if (!numsNuevos.has(actual.numero)) {
        await prisma.ejeItemPlantilla.delete({ where: { id: actual.id } });
      }
    }

    for (const item of ejeItems) {
      if (numsActuales.has(item.numero)) {
        const existing = itemsActuales.find((i) => i.numero === item.numero);
        if (existing) {
          await prisma.ejeItemPlantilla.update({
            where: { id: existing.id },
            data: { descripcion: item.descripcion, orden: item.orden ?? item.numero },
          });
        }
      } else {
        await prisma.ejeItemPlantilla.create({
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
}
