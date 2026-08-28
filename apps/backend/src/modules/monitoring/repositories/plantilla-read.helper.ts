import type { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { IPlantilla, TipoMonitoreo } from '@sistema-monitoreo/shared-contracts';
import type { Prisma } from '../../../generated/prisma/client.js';
import { buildPlantilla } from './plantilla-builder.helper.js';

export interface PlantillaFilters {
  search?: string;
  anioAcademico?: number;
  tipoMonitoreo?: TipoMonitoreo;
  estado?: string;
  rolAutorAlCrear?: string;
  institucionId?: string;
  scope?: string;
  /** Ver `QueryPlantillaDto.incluirVersionadas`. */
  incluirVersionadas?: boolean;
}

export async function findAllPlantillas(
  prisma: PrismaService,
  filters?: PlantillaFilters,
): Promise<IPlantilla[]> {
  /**
   * Las versionadas quedan fuera salvo que se pidan explícitamente.
   *
   * Versionar archiva la original y la marca `deleted`. El catálogo no debe
   * mostrarla —nadie va a monitorear con una versión relevada—, pero sus fichas
   * siguen existiendo y el análisis las mide. Cuando se piden, se traen sólo las
   * que CONSERVAN fichas: una versionada sin ninguna no aporta nada y sólo
   * agregaría ruido a la lista de rúbricas.
   */
  const where: Prisma.PlantillaMonitoreoWhereInput = filters?.incluirVersionadas
    ? { OR: [{ deleted: false }, { deleted: true, fichas: { some: {} } }] }
    : { deleted: false };

  if (filters) {
    if (filters.search) {
      where.descripcion = { contains: filters.search, mode: 'insensitive' };
    }
    if (filters.anioAcademico !== undefined) where.anioAcademico = filters.anioAcademico;
    if (filters.tipoMonitoreo) where.tipoMonitoreo = filters.tipoMonitoreo;
    if (filters.estado) where.estado = filters.estado;
    if (filters.rolAutorAlCrear) where.rolAutorAlCrear = filters.rolAutorAlCrear;
    if (filters.institucionId !== undefined) {
      // `AND` y no `OR` directo: el `OR` de arriba ya puede estar ocupado por
      // `incluirVersionadas`, y pisarlo dejaría entrar plantillas de cualquier
      // institución sin que nada lo delatara.
      where.AND = [
        { OR: [{ institucionId: filters.institucionId }, { rolAutorAlCrear: 'jefe_gestion' }] },
      ];
    }
    // if (filters.scope) where.scope = filters.scope;
  }
  const plantillas = await prisma.plantillaMonitoreo.findMany({
    where,
    orderBy: [{ anioAcademico: 'desc' }, { version: 'desc' }, { createdAt: 'desc' }],
  });
  return Promise.all(plantillas.map((p) => buildPlantilla(prisma, p.id)));
}

export async function findPlantillaById(
  prisma: PrismaService,
  id: string,
): Promise<IPlantilla | null> {
  const exists = await prisma.plantillaMonitoreo.findUnique({ where: { id } });
  if (!exists) return null;
  return buildPlantilla(prisma, id);
}

export async function countFichasAsociadas(
  prisma: PrismaService,
  plantillaId: string,
): Promise<number> {
  return prisma.fichaMonitoreo.count({ where: { plantillaId } });
}

export async function findFichasByPlantilla(
  prisma: PrismaService,
  plantillaId: string,
): Promise<{ id: string; evidenciaUrls: string[] }[]> {
  const fichas = await prisma.fichaMonitoreo.findMany({
    where: { plantillaId },
    select: {
      id: true,
      respuestasEjeItem: {
        select: { evidenciaUrl: true },
      },
    },
  });
  return fichas.map((f) => ({
    id: f.id,
    evidenciaUrls: f.respuestasEjeItem
      .map((r) => r.evidenciaUrl)
      .filter((u): u is string => typeof u === 'string' && u.length > 0),
  }));
}
