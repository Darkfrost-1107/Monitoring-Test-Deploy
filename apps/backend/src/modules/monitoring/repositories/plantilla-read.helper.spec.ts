import { jest } from '@jest/globals';
import { findAllPlantillas } from './plantilla-read.helper.js';
import type { PrismaService } from '../../../shared/prisma/prisma.service.js';

/**
 * Qué plantillas devuelve la consulta del catálogo.
 *
 * ── El defecto que trae estas pruebas ──
 * Versionar una plantilla archiva la original y la marca `deleted`, de modo que
 * deja de listarse. Para el catálogo está bien: nadie va a monitorear con una
 * versión relevada. Para el análisis no: sus fichas siguen existiendo y son las
 * que se miden.
 *
 * Una UGEL con 77 fichas sobre la v1 y 24 sobre la v2 veía «Docente 24» y, al
 * mismo tiempo, «77 monitoreos analizados»: la pantalla calculaba sobre una
 * rúbrica que no figuraba entre las opciones y ninguna quedaba resaltada.
 */

const montar = () => {
  const findMany = jest.fn<any>().mockResolvedValue([]);
  const prisma = { plantillaMonitoreo: { findMany } } as unknown as PrismaService;
  return { prisma, findMany };
};

const whereDe = (findMany: jest.Mock<any>) =>
  (findMany.mock.calls[0]?.[0] as { where: Record<string, unknown> }).where;

describe('findAllPlantillas', () => {
  it('oculta las versionadas por defecto: el catálogo no las necesita', async () => {
    const { prisma, findMany } = montar();

    await findAllPlantillas(prisma);

    expect(whereDe(findMany)).toMatchObject({ deleted: false });
  });

  it('con `incluirVersionadas` trae también las que conservan fichas', async () => {
    const { prisma, findMany } = montar();

    await findAllPlantillas(prisma, { incluirVersionadas: true });

    expect(whereDe(findMany).OR).toEqual([
      { deleted: false },
      { deleted: true, fichas: { some: {} } },
    ]);
  });

  /**
   * Una versionada SIN fichas no aporta nada: sería una rúbrica en cero que
   * nadie puede analizar, sumando ruido a la lista.
   */
  it('no trae una versionada que se quedó sin fichas', async () => {
    const { prisma, findMany } = montar();

    await findAllPlantillas(prisma, { incluirVersionadas: true });

    expect(whereDe(findMany).OR).toContainEqual({ deleted: true, fichas: { some: {} } });
  });

  /**
   * El filtro por institución usaba `where.OR` directamente. Con
   * `incluirVersionadas` ese `OR` ya está ocupado, y pisarlo dejaba entrar
   * plantillas de CUALQUIER institución sin que nada lo delatara.
   */
  it('el ámbito de institución no pisa el filtro de versionadas', async () => {
    const { prisma, findMany } = montar();

    await findAllPlantillas(prisma, { incluirVersionadas: true, institucionId: 'ie-1' });

    const where = whereDe(findMany);
    expect(where.OR).toEqual([{ deleted: false }, { deleted: true, fichas: { some: {} } }]);
    expect(where.AND).toEqual([
      { OR: [{ institucionId: 'ie-1' }, { rolAutorAlCrear: 'jefe_gestion' }] },
    ]);
  });

  it('sin versionadas el ámbito de institución sigue acotando igual', async () => {
    const { prisma, findMany } = montar();

    await findAllPlantillas(prisma, { institucionId: 'ie-1' });

    expect(whereDe(findMany).AND).toEqual([
      { OR: [{ institucionId: 'ie-1' }, { rolAutorAlCrear: 'jefe_gestion' }] },
    ]);
  });
});
