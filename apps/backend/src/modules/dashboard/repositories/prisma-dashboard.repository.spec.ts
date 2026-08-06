import { jest } from '@jest/globals';
import { RoleCode } from '../../../common/enums/role.enum.js';
import { PrismaDashboardRepository } from './prisma-dashboard.repository.js';
import type { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { ScopeFilter } from '../../../shared/auth/scope-filter.js';

/**
 * Pruebas de caracterización del cálculo del panel del director.
 *
 * Fase 3 de PLAN_REMEDIACION.md. El repositorio estaba en 0 % y es el archivo
 * más grande sin cobertura del backend.
 *
 * Se cubre `getDirectorDashboard`, que mezcla consultas con agregación real:
 * el semáforo por nivel de logro, la cobertura y el promedio. `getUgelDashboard`
 * son 408 líneas en un solo método y se aborda por separado —ver la nota al
 * final de este archivo.
 *
 * Lo que importa aquí no son las consultas sino las reglas que nadie escribió:
 * qué nivel de logro cae en cada franja del semáforo, qué pasa cuando no hay
 * docentes, y de qué depende que «la última ficha» sea realmente la última.
 */

const ficha = (over: Record<string, unknown> = {}) => ({
  id: 'f-1',
  nivelLogro: 'LOGRO_ESPERADO',
  promedio: 18,
  finalizadaAt: new Date('2026-03-10T12:00:00.000Z'),
  createdAt: new Date('2026-03-01T12:00:00.000Z'),
  cronograma: {
    evaluadoId: 'd-1',
    nivelEducativo: 'Secundaria',
    evaluado: { persona: { nombres: 'Ana', apellidos: 'Quispe' } },
    monitor: { persona: { nombres: 'Luis', apellidos: 'Pérez' } },
  },
  ...over,
});

const conDocente = (docenteId: string, over: Record<string, unknown> = {}) =>
  ficha({ ...over, cronograma: { ...ficha().cronograma, evaluadoId: docenteId } });

const montar = (docentes: { id: string }[], fichas: unknown[]) => {
  const prisma = {
    institucionEducativa: {
      findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        id: 'ie-1',
        nombre: 'I.E. Ejemplo',
        codigoModular: '1234567',
        nivelEducativo: 'Secundaria',
        distrito: 'Lampa',
      }),
    },
    docente: { findMany: jest.fn<() => Promise<unknown>>().mockResolvedValue(docentes) },
    fichaMonitoreo: { findMany: jest.fn<() => Promise<unknown>>().mockResolvedValue(fichas) },
  };
  const scopeFilter = {
    forInstitucion: jest.fn().mockReturnValue({}),
    forDocente: jest.fn().mockReturnValue({}),
    forFicha: jest.fn().mockReturnValue({}),
  };
  const repo = new PrismaDashboardRepository(
    prisma as unknown as PrismaService,
    scopeFilter as unknown as ScopeFilter,
  );
  return { repo, prisma, scopeFilter };
};

const sesion = {
  id: 'u-1',
  role: RoleCode.DIRECTOR_INSTITUCION,
  institucionId: 'ie-1',
};

describe('PrismaDashboardRepository — panel del director', () => {
  describe('semáforo por nivel de logro', () => {
    it.each([
      ['INICIO', 'critico'],
      ['EN_PROCESO', 'enProceso'],
      ['LOGRO_ESPERADO', 'logroPrevisto'],
      ['LOGRO_DESTACADO', 'logroPrevisto'],
    ])('%s cuenta en la franja %s', async (nivelLogro, franja) => {
      // LOGRO_ESPERADO y LOGRO_DESTACADO comparten franja: el semáforo tiene
      // tres colores y hay cuatro niveles de logro.
      const { repo } = montar([{ id: 'd-1' }], [conDocente('d-1', { nivelLogro })]);

      const r = await repo.getDirectorDashboard(sesion);

      expect(r.semaforo[franja as keyof typeof r.semaforo]).toBe(1);
    });

    it('cuenta una sola vez por docente, no por ficha', async () => {
      // Un docente con tres monitoreos aporta un punto al semáforo, el de su
      // última ficha, no tres.
      const { repo } = montar(
        [{ id: 'd-1' }],
        [
          conDocente('d-1', { id: 'f-3', nivelLogro: 'INICIO' }),
          conDocente('d-1', { id: 'f-2', nivelLogro: 'EN_PROCESO' }),
          conDocente('d-1', { id: 'f-1', nivelLogro: 'LOGRO_ESPERADO' }),
        ],
      );

      const r = await repo.getDirectorDashboard(sesion);

      expect(r.semaforo.critico).toBe(1);
      expect(r.semaforo.enProceso).toBe(0);
      expect(r.semaforo.logroPrevisto).toBe(0);
      expect(r.kpis.monitoreados).toBe(1);
    });

    it('«la última ficha» depende del orden que pide la consulta', async () => {
      // El código toma la PRIMERA ficha que ve por docente y confía en que la
      // consulta las devuelve por fecha descendente. Es un acoplamiento real
      // entre el orderBy y el cálculo: si alguien cambia el orden, el semáforo
      // pasa a reflejar la ficha más antigua sin que nada falle.
      const { repo, prisma } = montar(
        [{ id: 'd-1' }],
        [
          conDocente('d-1', { nivelLogro: 'INICIO' }),
          conDocente('d-1', { nivelLogro: 'LOGRO_DESTACADO' }),
        ],
      );

      const r = await repo.getDirectorDashboard(sesion);

      expect(r.semaforo.critico).toBe(1);
      expect(prisma.fichaMonitoreo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ finalizadaAt: 'desc' }, { createdAt: 'desc' }],
        }),
      );
    });

    it('los docentes sin ficha quedan en «sin registro»', async () => {
      const { repo } = montar([{ id: 'd-1' }, { id: 'd-2' }, { id: 'd-3' }], [conDocente('d-1')]);

      const r = await repo.getDirectorDashboard(sesion);

      expect(r.semaforo.sinRegistro).toBe(2);
      expect(r.kpis.pendientes).toBe(2);
    });
  });

  describe('indicadores', () => {
    it('calcula la cobertura como porcentaje redondeado', async () => {
      const { repo } = montar([{ id: 'd-1' }, { id: 'd-2' }, { id: 'd-3' }], [conDocente('d-1')]);

      const r = await repo.getDirectorDashboard(sesion);

      expect(r.kpis.porcentajeCobertura).toBe(33); // 1/3 redondeado
    });

    it('promedia sólo sobre docentes monitoreados, no sobre el total', async () => {
      // Un docente sin monitorear no arrastra el promedio a la baja.
      const { repo } = montar(
        [{ id: 'd-1' }, { id: 'd-2' }],
        [conDocente('d-1', { promedio: 16 })],
      );

      const r = await repo.getDirectorDashboard(sesion);

      expect(r.kpis.nivelPromedio).toBe(16);
    });

    it('redondea el promedio a dos decimales', async () => {
      const { repo } = montar(
        [{ id: 'd-1' }, { id: 'd-2' }, { id: 'd-3' }],
        [
          conDocente('d-1', { promedio: 10 }),
          conDocente('d-2', { promedio: 11 }),
          conDocente('d-3', { promedio: 13 }),
        ],
      );

      const r = await repo.getDirectorDashboard(sesion);

      expect(r.kpis.nivelPromedio).toBe(11.33);
    });

    describe('institución sin datos', () => {
      it('no divide por cero al no haber docentes', async () => {
        const { repo } = montar([], []);

        const r = await repo.getDirectorDashboard(sesion);

        expect(r.kpis.porcentajeCobertura).toBe(0);
        expect(r.kpis.nivelPromedio).toBe(0);
        expect(Number.isNaN(r.kpis.nivelPromedio)).toBe(false);
      });

      it('no produce pendientes negativos si hay más fichas que docentes', async () => {
        // Puede ocurrir con docentes dados de baja que conservan sus fichas.
        const { repo } = montar([{ id: 'd-1' }], [conDocente('d-1'), conDocente('d-2')]);

        const r = await repo.getDirectorDashboard(sesion);

        expect(r.kpis.pendientes).toBe(0);
        expect(r.semaforo.sinRegistro).toBe(0);
      });
    });
  });

  describe('monitoreos recientes', () => {
    it('compone los nombres completos de docente y especialista', async () => {
      const { repo } = montar([{ id: 'd-1' }], [conDocente('d-1')]);

      const r = await repo.getDirectorDashboard(sesion);

      expect(r.monitoreosRecientes[0]).toEqual(
        expect.objectContaining({
          docenteNombre: 'Ana Quispe',
          especialistaNombre: 'Luis Pérez',
          nivelEducativo: 'Secundaria',
        }),
      );
    });

    it('usa la fecha de creación cuando la ficha no tiene fecha de finalización', async () => {
      const { repo } = montar([{ id: 'd-1' }], [conDocente('d-1', { finalizadaAt: null })]);

      const r = await repo.getDirectorDashboard(sesion);

      expect(r.monitoreosRecientes[0].fecha).toBe('2026-03-01T12:00:00.000Z');
    });

    it('acota la lista a un máximo', async () => {
      const muchas = Array.from({ length: 20 }, (_, i) => conDocente(`d-${i}`, { id: `f-${i}` }));
      const { repo } = montar(
        muchas.map((_, i) => ({ id: `d-${i}` })),
        muchas,
      );

      const r = await repo.getDirectorDashboard(sesion);

      expect(r.monitoreosRecientes.length).toBeLessThan(20);
    });
  });

  describe('acotamiento por ámbito', () => {
    it('delega en ScopeFilter la restricción de institución, docentes y fichas', async () => {
      // El repositorio no decide el alcance: lo hace ScopeFilter con el contexto
      // de sesión. Es lo que impide que un director vea otra institución.
      const { repo, scopeFilter } = montar([{ id: 'd-1' }], []);

      await repo.getDirectorDashboard(sesion);

      const contextoEsperado = expect.objectContaining({
        userId: 'u-1',
        role: RoleCode.DIRECTOR_INSTITUCION,
        institucionId: 'ie-1',
      });
      expect(scopeFilter.forInstitucion).toHaveBeenCalledWith(contextoEsperado);
      expect(scopeFilter.forDocente).toHaveBeenCalledWith(contextoEsperado);
      expect(scopeFilter.forFicha).toHaveBeenCalledWith(contextoEsperado);
    });

    it('sólo considera docentes activos y fichas finalizadas', async () => {
      const { repo, prisma } = montar([{ id: 'd-1' }], []);

      await repo.getDirectorDashboard(sesion);

      expect(prisma.docente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ estado: 'Activo' }) }),
      );
      expect(prisma.fichaMonitoreo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ estado: 'FINALIZADO' }) }),
      );
    });
  });
});
