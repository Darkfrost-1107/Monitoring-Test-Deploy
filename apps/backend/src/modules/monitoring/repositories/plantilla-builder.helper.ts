import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { IPlantilla, RolAutorPlantilla } from '@sistema-monitoreo/shared-contracts';
import { resolverLemaDelAnio } from './lema-anual.helper.js';

/**
 * Nombre de quien creó la plantilla.
 *
 * El catálogo rotulaba el origen con el nombre de la institución, igual en las
 * tres plantillas que ve un Director desde que cada actor tiene la suya. El
 * nombre viaja resuelto para que la lista no tenga que consultar al autor una
 * vez por tarjeta.
 */
function nombreDelAutor(
  autor: { persona: { nombres: string; apellidos: string } } | null,
): string | undefined {
  if (!autor) return undefined;
  const nombre = `${autor.persona.nombres} ${autor.persona.apellidos}`.trim();
  return nombre || undefined;
}

export async function buildPlantilla(
  prisma: PrismaService,
  plantillaId: string,
): Promise<IPlantilla> {
  const plantilla = await prisma.plantillaMonitoreo.findUnique({
    where: { id: plantillaId },
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
      // El cupo que autorizó esta plantilla, si lo hubo. Sólo se necesita
      // saber si existe.
      valeDeSolicitud: { select: { id: true } },
      institucion: { select: { nombre: true, codigoModular: true } },
      autor: { select: { persona: { select: { nombres: true, apellidos: true } } } },
    },
  });
  if (!plantilla) {
    throw new NotFoundException(`Plantilla ${plantillaId} no encontrada.`);
  }

  const lema = await resolverLemaDelAnio(prisma, plantilla.anioAcademico);

  return {
    lema,
    id: plantilla.id,
    tipoMonitoreo:
      plantilla.tipoMonitoreo as import('@sistema-monitoreo/shared-contracts').TipoPlantilla,
    anioAcademico: plantilla.anioAcademico,
    version: plantilla.version,
    baremo: plantilla.baremo as 'Vigente' | 'Porcentual',
    descripcion: plantilla.descripcion,
    estado: plantilla.estado as 'Borrador' | 'Vigente' | 'Historico',
    autorId: plantilla.autorId,
    autorNombre: nombreDelAutor(plantilla.autor),
    rolAutorAlCrear: plantilla.rolAutorAlCrear as RolAutorPlantilla,
    // Las de la UGEL no llevan institución y son el catálogo oficial: siempre
    // autorizadas. Las de una I.E. lo están sólo si nacieron de un cupo, lo que
    // deja fuera a las anteriores a que las autorizaciones existieran.
    autorizada: plantilla.institucionId === null || plantilla.valeDeSolicitud !== null,
    institucionId: plantilla.institucionId,
    niveles: plantilla.nivelesCalificacion.map((n) => ({
      id: n.id,
      plantillaId: n.plantillaId,
      nivelRomano: n.nivelRomano as 'I' | 'II' | 'III' | 'IV',
      denominacion: n.denominacion,
      rangoMin: n.rangoMin,
      color: n.color,
      orden: n.orden,
    })),
    desempenos: plantilla.desempenos.map((d) => ({
      id: d.id,
      plantillaId: d.plantillaId,
      nombre: d.nombre,
      descripcionCorta: d.descripcionCorta,
      preguntaExtra: d.preguntaExtra,
      orden: d.orden,
      aspectos: d.aspectos.map((a) => ({
        id: a.id,
        desempenoId: a.desempenoId,
        descripcion: a.descripcion,
        orden: a.orden,
      })),
      rubrica: d.rubrica.map((r) => ({
        id: r.id,
        desempenoId: r.desempenoId,
        nivelCalificacionId: r.nivelCalificacionId,
        nivelRomano: r.nivelCalificacion.nivelRomano as 'I' | 'II' | 'III' | 'IV',
        descripcion: r.descripcion,
      })),
    })),
    ejesItems: plantilla.ejesItems.map((e) => ({
      id: e.id,
      plantillaId: e.plantillaId,
      numero: e.numero,
      descripcion: e.descripcion,
      orden: e.orden,
    })),
    createdAt: plantilla.createdAt.toISOString(),
    updatedAt: plantilla.updatedAt.toISOString(),
    institucion: plantilla.institucion
      ? {
          nombre: plantilla.institucion.nombre,
          codigoModular: plantilla.institucion.codigoModular,
        }
      : undefined,
  };
}
