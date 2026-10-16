import { jest } from '@jest/globals';
import { PrismaReporteRepository } from './prisma-reporte.repository.js';
import { ScopeFilter } from '../../../shared/auth/scope-filter.js';
import { RoleCode } from '../../../common/enums/role.enum.js';

/**
 * Qué fichas puede ver cada rol en los reportes y en el análisis de desempeño.
 *
 * El alcance de cada rol (su institución, su nivel…) debe seguir en pie cuando
 * llegan filtros del usuario. Antes, cualquier filtro de cronograma
 * (modalidad, nivel, docente…) REEMPLAZABA al alcance en vez de sumarse a él: un
 * director de I.E. con 9 fichas de su colegio pasaba a ver 169 fichas de 47
 * instituciones con solo añadir `modalidad=EBR`.
 */

type Condicion = Record<string, unknown>;

function armar() {
  const prisma = {
    fichaMonitoreo: {
      findMany: jest.fn((..._a: unknown[]) => Promise.resolve([])),
      count: jest.fn((..._a: unknown[]) => Promise.resolve(0)),
    },
    fichaRespuestaDesempeno: { findMany: jest.fn((..._a: unknown[]) => Promise.resolve([])) },
  };
  const repo = new PrismaReporteRepository(prisma as never, new ScopeFilter());
  return { repo, prisma };
}

/** Las condiciones de la consulta, como lista, tomando la lista de fichas o el análisis. */
const condiciones = (where: Condicion): Condicion[] => {
  const y = where.AND;
  return Array.isArray(y) ? (y as Condicion[]) : y ? [y as Condicion] : [];
};

const directorIE = { id: 'u-dir', role: RoleCode.DIRECTOR_INSTITUCION, institucionId: 'ie-1' };
const jefeArea = { id: 'u-ja', role: RoleCode.JEFE_AREA, especialistaNivel: 'Primaria' };
const jefeGestion = { id: 'u-jg', role: RoleCode.JEFE_GESTION };

const endpoints = {
  'la lista de fichas completadas': {
    pedir: (repo: PrismaReporteRepository, f: object, s: object) =>
      repo.findFichasCompletadas(f, s as never),
    where: (p: ReturnType<typeof armar>['prisma']) =>
      (p.fichaMonitoreo.findMany.mock.calls[0][0] as { where: Condicion }).where,
  },
  'el análisis de desempeño': {
    pedir: (repo: PrismaReporteRepository, f: object, s: object) =>
      repo.findAnalisisDesempenos(f, s as never),
    where: (p: ReturnType<typeof armar>['prisma']) =>
      (p.fichaRespuestaDesempeno.findMany.mock.calls[0][0] as { where: { ficha: Condicion } }).where
        .ficha,
  },
};

describe.each(Object.entries(endpoints))('alcance en %s', (_nombre, ep) => {
  it('el director de I.E. mantiene su institución cuando llega un filtro de modalidad', async () => {
    const { repo, prisma } = armar();

    await ep.pedir(repo, { modalidad: 'EBR' }, directorIE);

    const lista = condiciones(ep.where(prisma));
    expect(lista).toContainEqual({ cronograma: { institucionId: 'ie-1' } });
    expect(lista).toContainEqual({ cronograma: { modalidad: 'EBR' } });
  });

  it('pedir otra institución no amplía el alcance: se exigen las dos condiciones', async () => {
    const { repo, prisma } = armar();

    await ep.pedir(repo, { institucionId: 'ie-ajena' }, directorIE);

    const lista = condiciones(ep.where(prisma));
    expect(lista).toContainEqual({ cronograma: { institucionId: 'ie-1' } });
    expect(lista).toContainEqual({ cronograma: { institucionId: 'ie-ajena' } });
  });

  it('el jefe de área mantiene su nivel cuando llega un filtro de nivel', async () => {
    const { repo, prisma } = armar();

    await ep.pedir(repo, { nivelEducativo: 'Secundaria' }, jefeArea);

    const lista = condiciones(ep.where(prisma));
    expect(lista).toContainEqual({ cronograma: { nivelEducativo: 'Primaria' } });
    expect(lista).toContainEqual({ cronograma: { nivelEducativo: 'Secundaria' } });
  });

  it('sin más filtros, el alcance sigue aplicándose', async () => {
    const { repo, prisma } = armar();

    await ep.pedir(repo, {}, directorIE);

    expect(condiciones(ep.where(prisma))).toContainEqual({
      cronograma: { institucionId: 'ie-1' },
    });
  });

  it('el jefe de gestión, que lo ve todo, no queda restringido por el alcance', async () => {
    const { repo, prisma } = armar();

    await ep.pedir(repo, { modalidad: 'EBR' }, jefeGestion);

    const lista = condiciones(ep.where(prisma));
    expect(lista).toContainEqual({ cronograma: { modalidad: 'EBR' } });
    expect(JSON.stringify(lista)).not.toContain('institucionId');
  });
});

describe.each(Object.entries(endpoints))(
  'filtro por quien realizó el monitoreo en %s',
  (_nombre, ep) => {
    const MONITOR = '3f11e2af-1f65-4825-b615-0edf8d3e12f7';

    it('acota a las fichas cuyo monitor es el elegido', async () => {
      const { repo, prisma } = armar();

      await ep.pedir(repo, { monitorId: MONITOR }, jefeGestion);

      expect(condiciones(ep.where(prisma))).toContainEqual({ cronograma: { monitorId: MONITOR } });
    });

    it('se suma al alcance del rol: el director de I.E. sigue acotado a su institución', async () => {
      const { repo, prisma } = armar();

      await ep.pedir(repo, { monitorId: MONITOR }, directorIE);

      const lista = condiciones(ep.where(prisma));
      expect(lista).toContainEqual({ cronograma: { institucionId: 'ie-1' } });
      expect(lista).toContainEqual({ cronograma: { monitorId: MONITOR } });
    });

    it('un identificador que no es UUID no revienta Prisma: devuelve cero resultados', async () => {
      const { repo, prisma } = armar();

      await ep.pedir(repo, { monitorId: 'no-es-uuid' }, jefeGestion);

      expect(condiciones(ep.where(prisma))).toContainEqual({
        cronograma: { monitorId: '00000000-0000-0000-0000-000000000000' },
      });
    });

    it('sin monitor elegido no agrega ninguna condición de monitor', async () => {
      const { repo, prisma } = armar();

      await ep.pedir(repo, {}, jefeGestion);

      expect(JSON.stringify(condiciones(ep.where(prisma)))).not.toContain('monitorId');
    });
  },
);
