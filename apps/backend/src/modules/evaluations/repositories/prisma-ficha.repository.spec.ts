import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { PrismaFichaRepository } from './prisma-ficha.repository.js';
import type { PrismaService } from '../../../shared/prisma/prisma.service.js';

/**
 * Pruebas de caracterización del repositorio de fichas.
 *
 * Fase 3 de PLAN_REMEDIACION.md, y prerrequisito de la Fase 4: este archivo
 * lleva un `eslint-disable no-unsafe-assignment` en su primera línea, de modo
 * que ninguna asignación suya está verificada por el compilador. Antes de
 * retirar esa supresión hace falta saber qué hace hoy.
 *
 * Lo relevante no son las consultas sino tres reglas que el código aplica sin
 * dejarlas escritas: cómo se comporta el guardado repetido de una respuesta,
 * qué distingue a un campo omitido de uno puesto en blanco, y de qué orden
 * depende el historial pedagógico.
 */

const fichaCompleta = (over: Record<string, unknown> = {}) => ({
  id: 'f-1',
  cronogramaId: 'c-1',
  plantillaId: 'p-1',
  fichaContextoId: 'ctx-1',
  anioAcademico: 2026,
  puntajeTotal: 54,
  promedio: 18,
  nivelLogro: 'LOGRO_ESPERADO',
  estado: 'EN_PROCESO',
  creadoPorId: 'u-1',
  finalizadaPorId: null,
  observaciones: null,
  sugerencias: null,
  compromisos: null,
  evidenciaGeneral: null,
  createdAt: new Date('2026-03-01T10:00:00.000Z'),
  finalizadaAt: null,
  fichaContexto: {
    id: 'ctx-1',
    areaCurricular: 'Matemática',
    grado: '3',
    seccion: 'A',
    cantidadEstudiantes: 28,
    cantidadEstudiantesNee: 0,
    cursoId: 'curso-1',
  },
  respuestasDesempeno: [],
  respuestasAspecto: [],
  respuestasEjeItem: [],
  plantilla: { id: 'p-1', version: 1, estado: 'Vigente' },
  ...over,
});

const montar = () => {
  const prisma = {
    fichaMonitoreo: {
      findUnique: jest.fn<() => Promise<unknown>>(),
      findMany: jest.fn<() => Promise<unknown>>(),
      update: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
      count: jest.fn<() => Promise<unknown>>(),
    },
    fichaRespuestaDesempeno: {
      findFirst: jest.fn<() => Promise<unknown>>(),
      update: jest.fn<() => Promise<unknown>>(),
      create: jest.fn<() => Promise<unknown>>(),
    },
    plantillaMonitoreo: { findUnique: jest.fn<() => Promise<unknown>>() },
  };
  const repo = new PrismaFichaRepository(prisma as unknown as PrismaService);
  return { repo, prisma };
};

describe('PrismaFichaRepository', () => {
  describe('búsqueda de fichas', () => {
    it('devuelve nulo cuando no existe ficha para la visita', async () => {
      const { repo, prisma } = montar();
      prisma.fichaMonitoreo.findUnique.mockResolvedValue(null);

      expect(await repo.findByVisitaId('c-x')).toBeNull();
    });

    it('devuelve nulo cuando no existe la ficha pedida por id', async () => {
      const { repo, prisma } = montar();
      prisma.fichaMonitoreo.findUnique.mockResolvedValue(null);

      expect(await repo.findById('f-x')).toBeNull();
    });

    it('reconstruye la ficha completa tras localizarla por visita', async () => {
      // La búsqueda inicial trae sólo la fila; el detalle se recompone en una
      // segunda consulta con todos los `include`.
      const { repo, prisma } = montar();
      prisma.fichaMonitoreo.findUnique
        .mockResolvedValueOnce({ id: 'f-1' })
        .mockResolvedValueOnce(fichaCompleta());

      const f = await repo.findByVisitaId('c-1');

      expect(f?.id).toBe('f-1');
      expect(f?.contexto.areaCurricular).toBe('Matemática');
      expect(prisma.fichaMonitoreo.findUnique).toHaveBeenCalledTimes(2);
    });

    it('falla si la ficha desaparece entre las dos consultas', async () => {
      // Condición de carrera improbable pero contemplada: el código lanza en
      // lugar de devolver una ficha a medias.
      const { repo, prisma } = montar();
      prisma.fichaMonitoreo.findUnique
        .mockResolvedValueOnce({ id: 'f-1' })
        .mockResolvedValueOnce(null);

      await expect(repo.findById('f-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('guardado de respuestas — actualiza si ya existe, crea si no', () => {
    it('crea la respuesta la primera vez', async () => {
      const { repo, prisma } = montar();
      prisma.fichaRespuestaDesempeno.findFirst.mockResolvedValue(null);
      prisma.fichaRespuestaDesempeno.create.mockResolvedValue({
        id: 'rd-1',
        fichaId: 'f-1',
        desempenoId: 'd-1',
        nivel: 3,
        observaciones: null,
        preguntaExtraRespuesta: null,
      });

      const r = await repo.saveRespuestaDesempeno({ fichaId: 'f-1', desempenoId: 'd-1', nivel: 3 });

      expect(r.id).toBe('rd-1');
      expect(prisma.fichaRespuestaDesempeno.update).not.toHaveBeenCalled();
    });

    it('actualiza en lugar de duplicar cuando la respuesta ya existe', async () => {
      // Es un upsert manual: el evaluador puede corregir su respuesta tantas
      // veces como quiera sin generar filas nuevas.
      const { repo, prisma } = montar();
      prisma.fichaRespuestaDesempeno.findFirst.mockResolvedValue({ id: 'rd-1' });
      prisma.fichaRespuestaDesempeno.update.mockResolvedValue({
        id: 'rd-1',
        fichaId: 'f-1',
        desempenoId: 'd-1',
        nivel: 4,
        observaciones: null,
        preguntaExtraRespuesta: null,
      });

      const r = await repo.saveRespuestaDesempeno({ fichaId: 'f-1', desempenoId: 'd-1', nivel: 4 });

      expect(r.nivel).toBe(4);
      expect(prisma.fichaRespuestaDesempeno.create).not.toHaveBeenCalled();
    });

    it('al ACTUALIZAR, omitir un campo lo deja intacto', async () => {
      // `observaciones !== undefined ? … : undefined` hace que Prisma no toque
      // la columna. Guardar sólo el nivel no borra la observación ya escrita.
      const { repo, prisma } = montar();
      prisma.fichaRespuestaDesempeno.findFirst.mockResolvedValue({ id: 'rd-1' });
      prisma.fichaRespuestaDesempeno.update.mockResolvedValue({
        id: 'rd-1',
        fichaId: 'f-1',
        desempenoId: 'd-1',
        nivel: 4,
        observaciones: 'la de antes',
        preguntaExtraRespuesta: null,
      });

      await repo.saveRespuestaDesempeno({ fichaId: 'f-1', desempenoId: 'd-1', nivel: 4 });

      expect(prisma.fichaRespuestaDesempeno.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ observaciones: undefined }),
        }),
      );
    });

    it('al CREAR, omitir un campo lo deja en nulo', async () => {
      // Asimetría deliberada frente al caso anterior: en la creación no hay
      // valor previo que preservar, de modo que el `?? null` fija la columna.
      const { repo, prisma } = montar();
      prisma.fichaRespuestaDesempeno.findFirst.mockResolvedValue(null);
      prisma.fichaRespuestaDesempeno.create.mockResolvedValue({
        id: 'rd-1',
        fichaId: 'f-1',
        desempenoId: 'd-1',
        nivel: 3,
        observaciones: null,
        preguntaExtraRespuesta: null,
      });

      await repo.saveRespuestaDesempeno({ fichaId: 'f-1', desempenoId: 'd-1', nivel: 3 });

      expect(prisma.fichaRespuestaDesempeno.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ observaciones: null, preguntaExtraRespuesta: null }),
        }),
      );
    });

    it('al ACTUALIZAR, un campo en blanco explícito sí se guarda', async () => {
      // Distinto de omitirlo: pasar cadena vacía borra la observación anterior.
      const { repo, prisma } = montar();
      prisma.fichaRespuestaDesempeno.findFirst.mockResolvedValue({ id: 'rd-1' });
      prisma.fichaRespuestaDesempeno.update.mockResolvedValue({
        id: 'rd-1',
        fichaId: 'f-1',
        desempenoId: 'd-1',
        nivel: 4,
        observaciones: '',
        preguntaExtraRespuesta: null,
      });

      await repo.saveRespuestaDesempeno({
        fichaId: 'f-1',
        desempenoId: 'd-1',
        nivel: 4,
        observaciones: '',
      });

      expect(prisma.fichaRespuestaDesempeno.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ observaciones: '' }) }),
      );
    });
  });

  describe('finalización', () => {
    it('marca la ficha como FINALIZADO y sella quién y cuándo', async () => {
      const { repo, prisma } = montar();
      prisma.fichaMonitoreo.findUnique.mockResolvedValue(fichaCompleta({ estado: 'FINALIZADO' }));

      await repo.finalizar('f-1', 54, 18, 'LOGRO_ESPERADO', 'u-2');

      expect(prisma.fichaMonitoreo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado: 'FINALIZADO',
            finalizadaPorId: 'u-2',
            puntajeTotal: 54,
            nivelLogro: 'LOGRO_ESPERADO',
            finalizadaAt: expect.any(Date),
          }),
        }),
      );
    });

    it('devuelve la ficha recompuesta, no la fila actualizada', async () => {
      const { repo, prisma } = montar();
      prisma.fichaMonitoreo.findUnique.mockResolvedValue(fichaCompleta({ estado: 'FINALIZADO' }));

      const f = await repo.finalizar('f-1', 54, 18, 'LOGRO_ESPERADO', 'u-2');

      expect(f.contexto).toBeDefined();
      expect(f.estado).toBe('FINALIZADO');
    });
  });

  describe('estado de la plantilla', () => {
    it.each([
      ['Historico', true],
      ['Vigente', false],
      ['Borrador', false],
    ])('una plantilla en %s da %s', async (estado, esperado) => {
      const { repo, prisma } = montar();
      prisma.plantillaMonitoreo.findUnique.mockResolvedValue({ estado });

      expect(await repo.plantillaEstaHistorica('p-1')).toBe(esperado);
    });

    it('una plantilla inexistente no se considera histórica', async () => {
      const { repo, prisma } = montar();
      prisma.plantillaMonitoreo.findUnique.mockResolvedValue(null);

      expect(await repo.plantillaEstaHistorica('p-x')).toBe(false);
    });
  });

  describe('historial pedagógico', () => {
    const fichaHistorial = (over: Record<string, unknown> = {}) => ({
      id: 'f-1',
      promedio: 15,
      nivelLogro: 'EN_PROCESO',
      observaciones: 'primera visita',
      cronograma: { fechaProgramada: new Date('2026-03-01T00:00:00.000Z') },
      ...over,
    });

    it('devuelve las fichas en orden cronológico ascendente', async () => {
      // El historial se lee como una línea de tiempo: de la primera visita a la
      // última. Es el orden inverso al del panel, que muestra lo más reciente.
      const { repo, prisma } = montar();
      prisma.fichaMonitoreo.findMany.mockResolvedValue([fichaHistorial()]);

      await repo.getHistorial('d-1');

      expect(prisma.fichaMonitoreo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { cronograma: { fechaProgramada: 'asc' } },
        }),
      );
    });

    it('sólo incluye fichas finalizadas del docente indicado', async () => {
      const { repo, prisma } = montar();
      prisma.fichaMonitoreo.findMany.mockResolvedValue([]);

      await repo.getHistorial('d-1');

      expect(prisma.fichaMonitoreo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { cronograma: { evaluadoId: 'd-1' }, estado: 'FINALIZADO' },
        }),
      );
    });

    it('convierte el decimal del promedio y la fecha a ISO', async () => {
      const { repo, prisma } = montar();
      prisma.fichaMonitoreo.findMany.mockResolvedValue([
        fichaHistorial({ promedio: { toString: () => '15.5' } }),
      ]);

      const h = await repo.getHistorial('d-1');

      expect(h[0].promedio).toBe(15.5);
      expect(h[0].fecha).toBe('2026-03-01T00:00:00.000Z');
    });

    it('devuelve lista vacía para un docente sin monitoreos finalizados', async () => {
      const { repo, prisma } = montar();
      prisma.fichaMonitoreo.findMany.mockResolvedValue([]);

      expect(await repo.getHistorial('d-nuevo')).toEqual([]);
    });
  });
});
