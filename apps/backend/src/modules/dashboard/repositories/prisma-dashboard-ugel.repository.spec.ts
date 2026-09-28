import { jest } from '@jest/globals';
import { RoleCode } from '../../../common/enums/role.enum.js';
import { PrismaDashboardRepository } from './prisma-dashboard.repository.js';
import type { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { ScopeFilter } from '../../../shared/auth/scope-filter.js';

/**
 * La modalidad de cada II.EE. en el panel UGEL.
 *
 * El mapa de Focos de Atención sólo filtraba por Inicial, Primaria y
 * Secundaria porque el panel no decía de qué modalidad era cada institución:
 * las de EBA, EBE y CEPTRO aparecían en el mapa y ningún botón las alcanzaba.
 * Estas pruebas fijan que el dato viaja en las dos listas que consume la vista.
 */

const CEPTRO = {
  id: 'ie-ceptro',
  nombre: 'CETPRO Lampa',
  distrito: 'Lampa',
  nivelEducativo: 'Técnico Productiva',
  modalidad: 'CEPTRO',
  latitud: -15.3656,
  longitud: -70.3637,
};

const EBR = {
  id: 'ie-ebr',
  nombre: 'IE 70001',
  distrito: 'Paratía',
  nivelEducativo: 'Secundaria',
  modalidad: 'EBR',
  latitud: -15.37,
  longitud: -70.75,
};

const fichaCritica = (institucion: typeof EBR | typeof CEPTRO) => ({
  id: `f-${institucion.id}`,
  nivelLogro: 'INICIO',
  promedio: 1.2,
  finalizadaAt: new Date('2026-03-10T12:00:00.000Z'),
  createdAt: new Date('2026-03-01T12:00:00.000Z'),
  cronograma: {
    institucionId: institucion.id,
    nivelEducativo: institucion.nivelEducativo,
    tipoMonitoreo: 'DOCENTE',
    evaluadoId: `d-${institucion.id}`,
    evaluado: {
      persona: { nombres: 'Ana', apellidos: 'Quispe' },
      docenteEspecialidades: [],
      docenteCargos: [],
    },
    institucion: {
      nombre: institucion.nombre,
      codigoModular: '1234567',
      distrito: institucion.distrito,
      nivelEducativo: institucion.nivelEducativo,
      modalidad: institucion.modalidad,
    },
    monitor: { id: 'm-1', persona: { nombres: 'Luis', apellidos: 'Pérez' } },
  },
});

interface IeActiva {
  id: string;
  distrito: string;
  modalidad: string;
  nivelEducativo: string;
}

const montar = (
  fichas: unknown[],
  iesConCoordenadas: unknown[],
  cobertura: { activas: IeActiva[]; monitoreadasIds: string[] } = {
    activas: [],
    monitoreadasIds: [],
  },
) => {
  type Consulta = { select?: Record<string, unknown>; where?: Record<string, unknown> };
  const prisma = {
    institucionEducativa: {
      count: jest.fn<() => Promise<number>>().mockResolvedValue(iesConCoordenadas.length),
      // Tres consultas piden II.EE.: la del mapa (la única con coordenadas), las
      // activas y las que tuvieron un cronograma completado en el año.
      findMany: jest.fn<(args: Consulta) => Promise<unknown[]>>((args) => {
        if (args.select && 'latitud' in args.select) return Promise.resolve(iesConCoordenadas);
        if (args.where && 'cronogramas' in args.where) {
          return Promise.resolve(
            cobertura.activas
              .filter((ie) => cobertura.monitoreadasIds.includes(ie.id))
              .map(({ id }) => ({ id })),
          );
        }
        return Promise.resolve(cobertura.activas);
      }),
    },
    // La primera consulta son las fichas del año; las otras dos (año previo y
    // años disponibles) no interesan acá.
    fichaMonitoreo: {
      findMany: jest
        .fn<() => Promise<unknown[]>>()
        .mockResolvedValueOnce(fichas)
        .mockResolvedValue([]),
    },
  };
  const scopeFilter = {
    forInstitucion: jest.fn().mockReturnValue({}),
    forFicha: jest.fn().mockReturnValue({}),
  };
  const repo = new PrismaDashboardRepository(
    prisma as unknown as PrismaService,
    scopeFilter as unknown as ScopeFilter,
  );
  return { repo, prisma };
};

const sesion = {
  id: 'u-1',
  role: RoleCode.JEFE_GESTION,
  institucionId: null,
} as unknown as Parameters<PrismaDashboardRepository['getUgelDashboard']>[0];

describe('PrismaDashboardRepository — panel UGEL, modalidad de cada II.EE.', () => {
  it('pide la modalidad al consultar las II.EE. del mapa', async () => {
    const { repo, prisma } = montar([], [EBR, CEPTRO]);

    await repo.getUgelDashboard(sesion, 2026);

    const consultaDelMapa = prisma.institucionEducativa.findMany.mock.calls
      .map(([args]) => args)
      .find((args) => args.select && 'latitud' in args.select);
    expect(consultaDelMapa?.select).toEqual(expect.objectContaining({ modalidad: true }));
  });

  it('cada II.EE. del mapa lleva su modalidad', async () => {
    const { repo } = montar([], [EBR, CEPTRO]);

    const r = await repo.getUgelDashboard(sesion, 2026);

    expect(r.institucionesMapa).toEqual([
      expect.objectContaining({ institucionId: 'ie-ebr', modalidad: 'EBR' }),
      expect.objectContaining({
        institucionId: 'ie-ceptro',
        modalidad: 'CEPTRO',
        nivelEducativo: 'Técnico Productiva',
      }),
    ]);
  });

  it('las II.EE. que requieren atención llevan su modalidad', async () => {
    const { repo } = montar([fichaCritica(EBR), fichaCritica(CEPTRO)], [EBR, CEPTRO]);

    const r = await repo.getUgelDashboard(sesion, 2026);

    const modalidadPorIe = Object.fromEntries(
      r.requierenAtencion.map((ie) => [ie.institucionId, ie.modalidad]),
    );
    expect(modalidadPorIe).toEqual({ 'ie-ebr': 'EBR', 'ie-ceptro': 'CEPTRO' });
  });

  it('pide la modalidad al consultar las fichas del año', async () => {
    const { repo, prisma } = montar([], [EBR]);

    await repo.getUgelDashboard(sesion, 2026);

    const [args] = prisma.fichaMonitoreo.findMany.mock.calls[0] as unknown as [
      { select: { cronograma: { select: { institucion: { select: Record<string, unknown> } } } } },
    ];
    expect(args.select.cronograma.select.institucion.select).toEqual(
      expect.objectContaining({ modalidad: true }),
    );
  });
});

/**
 * El mapa del Director UGEL pinta cada distrito según su cobertura. Para que
 * los filtros de modalidad y nivel también repinten los distritos, la cobertura
 * viaja abierta por modalidad y nivel: el frontend suma sólo lo que el filtro
 * deja pasar.
 */
describe('PrismaDashboardRepository — panel UGEL, cobertura abierta por modalidad y nivel', () => {
  const activas: IeActiva[] = [
    { id: 'l-1', distrito: 'Lampa', modalidad: 'EBR', nivelEducativo: 'Primaria' },
    { id: 'l-2', distrito: 'Lampa', modalidad: 'EBR', nivelEducativo: 'Primaria' },
    { id: 'l-3', distrito: 'Lampa', modalidad: 'CEPTRO', nivelEducativo: 'Técnico Productiva' },
    { id: 'p-1', distrito: 'Paratía', modalidad: 'EBA', nivelEducativo: 'Avanzado' },
  ];
  const cobertura = { activas, monitoreadasIds: ['l-1', 'p-1'] };

  const distrito = async (nombre: string) => {
    const { repo } = montar([], [], cobertura);
    const r = await repo.getUgelDashboard(sesion, 2026);
    const fila = r.coberturaPorDistrito.find((d) => d.distrito === nombre);
    if (!fila) throw new Error(`Falta el distrito ${nombre}`);
    return fila;
  };

  it('cada distrito trae sus totales abiertos por modalidad y nivel', async () => {
    const lampa = await distrito('Lampa');

    expect(lampa.desglose).toEqual(
      expect.arrayContaining([
        { modalidad: 'EBR', nivelEducativo: 'Primaria', totalInstituciones: 2, monitoreadas: 1 },
        {
          modalidad: 'CEPTRO',
          nivelEducativo: 'Técnico Productiva',
          totalInstituciones: 1,
          monitoreadas: 0,
        },
      ]),
    );
    expect(lampa.desglose).toHaveLength(2);
  });

  it('el desglose suma lo mismo que los totales del distrito', async () => {
    const lampa = await distrito('Lampa');

    const total = lampa.desglose.reduce((suma, d) => suma + d.totalInstituciones, 0);
    const monitoreadas = lampa.desglose.reduce((suma, d) => suma + d.monitoreadas, 0);
    expect(total).toBe(lampa.totalInstituciones);
    expect(monitoreadas).toBe(lampa.monitoreadas);
  });

  it('no altera el porcentaje de cobertura que ya se calculaba', async () => {
    const lampa = await distrito('Lampa');

    expect(lampa.totalInstituciones).toBe(3);
    expect(lampa.monitoreadas).toBe(1);
    expect(lampa.porcentajeCobertura).toBe(33);
  });

  it('un distrito con una sola modalidad trae una sola fila', async () => {
    const paratia = await distrito('Paratía');

    expect(paratia.desglose).toEqual([
      { modalidad: 'EBA', nivelEducativo: 'Avanzado', totalInstituciones: 1, monitoreadas: 1 },
    ]);
  });

  it('pide la modalidad y el nivel al consultar las II.EE. activas', async () => {
    const { repo, prisma } = montar([], [], cobertura);

    await repo.getUgelDashboard(sesion, 2026);

    const consultaDeActivas = prisma.institucionEducativa.findMany.mock.calls
      .map(([args]) => args)
      .find((args) => !args.select?.latitud && args.where && !('cronogramas' in args.where));
    expect(consultaDeActivas?.select).toEqual(
      expect.objectContaining({ modalidad: true, nivelEducativo: true }),
    );
  });
});
