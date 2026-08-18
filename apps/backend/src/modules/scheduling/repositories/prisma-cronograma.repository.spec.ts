import { jest } from '@jest/globals';
import { PrismaCronogramaRepository } from './prisma-cronograma.repository.js';
import type { PrismaService } from '../../../shared/prisma/prisma.service.js';

/**
 * Pruebas de caracterización del repositorio de cronogramas.
 *
 * Fase 3 de PLAN_REMEDIACION.md y prerrequisito de la Fase 4: este archivo
 * suprime tres reglas de tipado en su primera línea
 * —`no-unsafe-assignment`, `no-unsafe-member-access` y `no-unsafe-argument`—
 * y usa `any` en el mapeo, de modo que nada de lo que hace está verificado.
 *
 * Lo que se fija aquí son los límites que el código calcula a mano: qué rango
 * cubre «el año», qué rango cubre «el día», y qué estados cuentan como visita
 * vigente. Son la base de la detección de duplicados y de solapamientos de
 * agenda, y ninguno estaba enunciado.
 */

const montar = () => {
  const prisma = {
    cronograma: {
      count: jest.fn<() => Promise<unknown>>().mockResolvedValue(0),
      findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue(null),
      findMany: jest.fn<() => Promise<unknown>>().mockResolvedValue([]),
    },
    institucionEducativa: { findUnique: jest.fn<() => Promise<unknown>>() },
    especialista: { findUnique: jest.fn<() => Promise<unknown>>() },
    docente: { findUnique: jest.fn<() => Promise<unknown>>() },
  };
  const repo = new PrismaCronogramaRepository(prisma as unknown as PrismaService);
  return { repo, prisma };
};

/** Estados que el repositorio considera «visita aún vigente». */
const ESTADOS_VIGENTES = ['PROGRAMADO', 'EN_PROCESO', 'REPROGRAMADO'];

describe('PrismaCronogramaRepository', () => {
  describe('validación de entidades activas', () => {
    const activas = (prisma: ReturnType<typeof montar>['prisma']) => {
      prisma.institucionEducativa.findUnique.mockResolvedValue({ estado: 'Activa' });
      prisma.especialista.findUnique.mockResolvedValue({ estado: 'Activo', cargo: 'Especialista' });
      prisma.docente.findUnique.mockResolvedValue({ estado: 'Activo', docenteCargos: [] });
    };

    it('confirma las tres entidades cuando están activas', async () => {
      const { repo, prisma } = montar();
      activas(prisma);

      const r = await repo.validateEntidadesActivas('ie-1', 'm-1', 'd-1');

      expect(r).toEqual({
        institucion: true,
        monitor: true,
        evaluado: true,
        monitorCargo: 'Especialista',
        monitorEsDirectorUgel: false,
        evaluadoEsDirector: false,
      });
    });

    it('la institución usa «Activa» y las personas «Activo»', async () => {
      // Los estados no comparten vocabulario: la institución se declara en
      // femenino. Escribir 'Activo' para la IE la daría por inactiva.
      const { repo, prisma } = montar();
      activas(prisma);
      prisma.institucionEducativa.findUnique.mockResolvedValue({ estado: 'Activo' });

      const r = await repo.validateEntidadesActivas('ie-1', 'm-1', 'd-1');

      expect(r.institucion).toBe(false);
    });

    it.each([
      ['institucionEducativa', 'institucion'],
      ['especialista', 'monitor'],
      ['docente', 'evaluado'],
    ])('marca en falso %s cuando no existe', async (modelo, campo) => {
      const { repo, prisma } = montar();
      activas(prisma);
      (prisma as unknown as Record<string, { findUnique: jest.Mock }>)[
        modelo
      ].findUnique.mockResolvedValue(null as never);

      const r = await repo.validateEntidadesActivas('ie-1', 'm-1', 'd-1');

      expect(r[campo as 'institucion' | 'monitor' | 'evaluado']).toBe(false);
    });

    it('devuelve el cargo del monitor para que el servicio decida sobre él', async () => {
      const { repo, prisma } = montar();
      activas(prisma);
      prisma.especialista.findUnique.mockResolvedValue({
        estado: 'Activo',
        cargo: 'Jefe de Taller',
      });

      const r = await repo.validateEntidadesActivas('ie-1', 'm-1', 'd-1');

      expect(r.monitorCargo).toBe('Jefe de Taller');
    });

    /**
     * A un director se lo evalúa sólo con la ficha directiva, así que al
     * programar hay que saber si quien va a ser evaluado dirige la institución.
     */
    it('avisa que el evaluado dirige cuando tiene designación abierta', async () => {
      const { repo, prisma } = montar();
      activas(prisma);
      prisma.docente.findUnique.mockResolvedValue({
        estado: 'Activo',
        docenteCargos: [{ id: 'dc-1' }],
      });

      const r = await repo.validateEntidadesActivas('ie-1', 'm-1', 'd-1');

      expect(r.evaluadoEsDirector).toBe(true);
    });

    it('sólo cuenta la designación vigente, que es la que la consulta filtra', async () => {
      const { repo, prisma } = montar();
      activas(prisma);

      await repo.validateEntidadesActivas('ie-1', 'm-1', 'd-1');

      const args = (
        prisma.docente.findUnique.mock.calls as unknown as [
          { include: { docenteCargos: { where: Record<string, unknown> } } },
        ][]
      )[0][0];
      expect(args.include.docenteCargos.where).toEqual({
        fechaFin: null,
        cargo: { nombre: 'Director' },
      });
    });

    it('consulta las tres entidades en paralelo', async () => {
      const { repo, prisma } = montar();
      activas(prisma);

      await repo.validateEntidadesActivas('ie-1', 'm-1', 'd-1');

      expect(prisma.institucionEducativa.findUnique).toHaveBeenCalledWith({
        where: { id: 'ie-1' },
      });
      expect(prisma.especialista.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'm-1' } }),
      );
      expect(prisma.docente.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'd-1' } }),
      );
    });
  });

  describe('carga pendiente del monitor', () => {
    it('cuenta sólo las visitas aún vigentes', async () => {
      // Una visita COMPLETADA o ANULADA no ocupa agenda. El conjunto es el
      // mismo que usa la detección de solapamientos.
      const { repo, prisma } = montar();

      await repo.countPendientesByMonitor('m-1');

      expect(prisma.cronograma.count).toHaveBeenCalledWith({
        where: { monitorId: 'm-1', estado: { in: ESTADOS_VIGENTES } },
      });
    });
  });

  describe('detección de visita duplicada en el año', () => {
    it('acota el rango al año calendario completo', async () => {
      const { repo, prisma } = montar();

      await repo.findVisitaExistente('d-1', 2026, 2);

      const [args] = prisma.cronograma.findFirst.mock.calls[0] as unknown as [
        { where: { fechaProgramada: { gte: Date; lte: Date } } },
      ];
      expect(args.where.fechaProgramada.gte).toEqual(new Date(2026, 0, 1));
      expect(args.where.fechaProgramada.lte).toEqual(new Date(2026, 11, 31, 23, 59, 59, 999));
    });

    it('ignora las visitas anuladas', async () => {
      // Anular una visita libera su número: el docente puede recibir otra con
      // el mismo número en el mismo año.
      const { repo, prisma } = montar();

      await repo.findVisitaExistente('d-1', 2026, 2);

      const [args] = prisma.cronograma.findFirst.mock.calls[0] as unknown as [
        { where: { estado: { not: string } } },
      ];
      expect(args.where.estado).toEqual({ not: 'ANULADO' });
    });

    it('devuelve nulo cuando no hay visita previa con ese número', async () => {
      const { repo } = montar();

      expect(await repo.findVisitaExistente('d-1', 2026, 2)).toBeNull();
    });
  });

  describe('agenda del monitor en una fecha', () => {
    it('cubre el día completo, sin depender de la hora recibida', async () => {
      // La fecha llega con hora arbitraria; el rango se normaliza al día para
      // que la comprobación de solapamiento no dependa de a qué hora se pidió.
      const { repo, prisma } = montar();

      await repo.findVisitasMonitorPorFecha('m-1', new Date(2026, 3, 15, 14, 37, 22));

      const [args] = prisma.cronograma.findMany.mock.calls[0] as unknown as [
        { where: { fechaProgramada: { gte: Date; lte: Date } } },
      ];
      expect(args.where.fechaProgramada.gte).toEqual(new Date(2026, 3, 15, 0, 0, 0, 0));
      expect(args.where.fechaProgramada.lte).toEqual(new Date(2026, 3, 15, 23, 59, 59, 999));
    });

    it('considera ocupada la agenda sólo por visitas vigentes', async () => {
      const { repo, prisma } = montar();

      await repo.findVisitasMonitorPorFecha('m-1', new Date(2026, 3, 15));

      const [args] = prisma.cronograma.findMany.mock.calls[0] as unknown as [
        { where: { estado: { in: string[] } } },
      ];
      expect(args.where.estado).toEqual({ in: ESTADOS_VIGENTES });
    });

    it('no altera la fecha que recibe', async () => {
      // El código construye copias con `new Date(...)`; mutar el argumento
      // afectaría al llamador.
      const { repo } = montar();
      const fecha = new Date(2026, 3, 15, 14, 37, 22);
      const original = fecha.getTime();

      await repo.findVisitasMonitorPorFecha('m-1', fecha);

      expect(fecha.getTime()).toBe(original);
    });

    it('devuelve lista vacía cuando el monitor no tiene visitas ese día', async () => {
      const { repo } = montar();

      expect(await repo.findVisitasMonitorPorFecha('m-1', new Date(2026, 3, 15))).toEqual([]);
    });
  });
});
