import type { PrismaService } from '../../../shared/prisma/prisma.service.js';

/**
 * Lema oficial de un año académico.
 *
 * Se resuelve con una consulta aparte y no con una relación de Prisma a
 * propósito: una clave foránea de `plantillas_monitoreo.anio_academico` hacia
 * `lemas_anuales.anio` impediría registrar una plantilla de un año cuyo lema
 * todavía no se cargó, y el orden en que ocurren esas dos altas no es del
 * dominio de la base. La búsqueda es por clave primaria.
 *
 * Devuelve nulo cuando el año no tiene lema: un encabezado oficial equivocado es
 * peor que ninguno, porque afirma la vigencia de un decreto que no rige.
 */
export async function resolverLemaDelAnio(
  prisma: PrismaService,
  anio: number,
): Promise<string | null> {
  const registro = await prisma.lemaAnual.findUnique({
    where: { anio },
    select: { lema: true },
  });

  return registro?.lema ?? null;
}
