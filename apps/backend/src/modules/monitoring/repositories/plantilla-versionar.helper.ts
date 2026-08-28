import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { IPlantilla, RolAutorPlantilla } from '@sistema-monitoreo/shared-contracts';
import type { UpdatePlantillaData } from './plantilla.repository.js';
import { resolverLemaDelAnio } from './lema-anual.helper.js';
import { randomUUID } from 'node:crypto';

export async function versionarConClon(
  prisma: PrismaService,
  plantillaOriginalId: string,
  data: UpdatePlantillaData,
  nuevoAutorId: string,
): Promise<IPlantilla> {
  const original = await prisma.plantillaMonitoreo.findUnique({
    where: { id: plantillaOriginalId },
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
  if (!original) {
    throw new NotFoundException(`Plantilla original ${plantillaOriginalId} no encontrada.`);
  }

  const maxVersion = await prisma.plantillaMonitoreo.aggregate({
    where: {
      tipoMonitoreo: original.tipoMonitoreo,
      anioAcademico: original.anioAcademico,
    },
    _max: { version: true },
  });
  const nuevaVersion = (maxVersion._max.version ?? 0) + 1;

  // Fuera de la transacción a propósito: el lema vive en otra tabla y no se
  // toca acá, de modo que no necesita la consistencia del bloque.
  const lema = await resolverLemaDelAnio(prisma, original.anioAcademico);

  return prisma.$transaction(async (tx) => {
    await tx.plantillaMonitoreo.update({
      where: { id: original.id },
      data: { estado: 'Historico', deleted: true },
    });

    const nuevoId = randomUUID();
    await tx.plantillaMonitoreo.create({
      data: {
        id: nuevoId,
        tipoMonitoreo: original.tipoMonitoreo,
        anioAcademico: original.anioAcademico,
        version: nuevaVersion,
        baremo: data.data.baremo ?? original.baremo,
        descripcion: data.data.descripcion ?? original.descripcion,
        estado: 'Borrador',
        autorId: nuevoAutorId,
        rolAutorAlCrear: original.rolAutorAlCrear,
        institucionId: original.institucionId,
        deleted: false,
      },
    });

    const nivelesClonados: Record<string, string> = {};
    for (const n of original.nivelesCalificacion) {
      const newUuid = randomUUID();
      nivelesClonados[n.id] = newUuid;
      await tx.nivelCalificacion.create({
        data: {
          id: newUuid,
          plantillaId: nuevoId,
          nivelRomano: n.nivelRomano,
          denominacion: n.denominacion,
          rangoMin: n.rangoMin,
          color: n.color,
          orden: n.orden,
        },
      });
    }

    const desempenosFinales = data.data.desempenos
      ? data.data.desempenos.map((d) => ({
          ...d,
          id: randomUUID(),
          aspectos: d.aspectos.map((a) => ({ ...a, id: randomUUID() })),
        }))
      : original.desempenos.map((d) => ({
          id: randomUUID(),
          nombre: d.nombre,
          descripcionCorta: d.descripcionCorta,
          preguntaExtra: d.preguntaExtra,
          orden: d.orden,
          aspectos: d.aspectos.map((a) => ({
            id: randomUUID(),
            descripcion: a.descripcion,
            orden: a.orden,
          })),
          rubrica: d.rubrica.map((r) => {
            const nivelOriginal = original.nivelesCalificacion.find(
              (n) => n.id === r.nivelCalificacionId,
            );
            return {
              nivelRomano: nivelOriginal?.nivelRomano ?? 'I',
              descripcion: r.descripcion,
            };
          }),
        }));

    for (const d of desempenosFinales) {
      await tx.desempenoPlantilla.create({
        data: {
          id: d.id,
          plantillaId: nuevoId,
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
          rubrica: {
            create: d.rubrica.map((r) => {
              const nivelNuevo = original.nivelesCalificacion.find(
                (n) => n.nivelRomano === r.nivelRomano,
              );
              return {
                nivelCalificacionId: nivelNuevo
                  ? nivelesClonados[nivelNuevo.id]
                  : Object.values(nivelesClonados)[0],
                descripcion: r.descripcion,
              };
            }),
          },
        },
      });
    }

    const ejeItemsFinales = data.data.ejeItems
      ? data.data.ejeItems
      : original.ejesItems.map((e) => ({
          numero: e.numero,
          descripcion: e.descripcion,
          orden: e.orden,
        }));

    for (const item of ejeItemsFinales) {
      await tx.ejeItemPlantilla.create({
        data: {
          id: randomUUID(),
          plantillaId: nuevoId,
          numero: item.numero,
          descripcion: item.descripcion,
          orden: item.orden ?? item.numero,
        },
      });
    }

    const creada = await tx.plantillaMonitoreo.findUnique({
      where: { id: nuevoId },
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
    if (!creada) throw new NotFoundException('Error creando nueva version.');
    /**
     * El cupo que autorizó la plantilla sigue a la versión nueva.
     *
     * Versionar no crea otra plantilla a los ojos del negocio: es la misma,
     * corregida. Si el cupo se quedara apuntando a la versión histórica, la
     * vigente nacería sin autorización y dejaría de ofrecerse para monitorear:
     * la institución tendría que volver a pedir permiso por una corrección de
     * redacción.
     */
    const { count: cuposMovidos } = await tx.solicitudPlantillaItem.updateMany({
      where: { plantillaId: original.id },
      data: { plantillaId: creada.id },
    });

    return {
      lema,
      id: creada.id,
      tipoMonitoreo:
        creada.tipoMonitoreo as import('@sistema-monitoreo/shared-contracts').TipoPlantilla,
      anioAcademico: creada.anioAcademico,
      version: creada.version,
      baremo: creada.baremo as 'Vigente' | 'Porcentual',
      descripcion: creada.descripcion,
      estado: creada.estado as 'Borrador' | 'Vigente' | 'Historico',
      autorId: creada.autorId,
      rolAutorAlCrear: creada.rolAutorAlCrear as RolAutorPlantilla,
      institucionId: creada.institucionId,
      // Versionar no crea una plantilla nueva a los ojos del negocio: es la
      // misma, corregida. Hereda la autorización del original en lugar de
      // exigir un cupo, que ya se consumió al crearla la primera vez.
      // De la UGEL siempre; de una I.E., sólo si traía cupo. Las anteriores a
      // que existieran las autorizaciones se quedan sin ella, que es lo
      // correcto: no se ofrecen para monitorear, pero sus fichas siguen vivas.
      autorizada: creada.institucionId === null || cuposMovidos > 0,
      niveles: creada.nivelesCalificacion.map((n) => ({
        id: n.id,
        plantillaId: n.plantillaId,
        nivelRomano: n.nivelRomano as 'I' | 'II' | 'III' | 'IV',
        denominacion: n.denominacion,
        rangoMin: n.rangoMin,
        color: n.color,
        orden: n.orden,
      })),
      desempenos: creada.desempenos.map((dp) => ({
        id: dp.id,
        plantillaId: dp.plantillaId,
        nombre: dp.nombre,
        descripcionCorta: dp.descripcionCorta,
        preguntaExtra: dp.preguntaExtra,
        orden: dp.orden,
        aspectos: dp.aspectos.map((a) => ({
          id: a.id,
          desempenoId: a.desempenoId,
          descripcion: a.descripcion,
          orden: a.orden,
        })),
        rubrica: dp.rubrica.map((r) => ({
          id: r.id,
          desempenoId: r.desempenoId,
          nivelCalificacionId: r.nivelCalificacionId,
          nivelRomano: r.nivelCalificacion.nivelRomano as 'I' | 'II' | 'III' | 'IV',
          descripcion: r.descripcion,
        })),
      })),
      ejesItems:
        creada.ejesItems?.map((e) => ({
          id: e.id,
          plantillaId: e.plantillaId,
          numero: e.numero,
          descripcion: e.descripcion,
          orden: e.orden,
        })) ?? [],
      createdAt: creada.createdAt.toISOString(),
      updatedAt: creada.updatedAt.toISOString(),
    };
  });
}
