import { RoleCode } from '../../../common/enums/role.enum.js';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { FichaService } from './ficha.service.js';
import { FichaRepository } from '../repositories/ficha.repository.js';
import { STORAGE_SERVICE } from '../../../shared/storage/storage.constants.js';
import { ScopeFilter } from '../../../shared/auth/scope-filter.js';
import { BaremoCalculatorService } from '../motor/baremo-calculator.service.js';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('FichaService - ILA-0046 409 PLANTILLA_VERSIONADA', () => {
  let service: FichaService;
  let repo: jest.Mocked<FichaRepository>;

  const baseFicha = {
    id: 'ficha-1',
    cronogramaId: 'cronograma-1',
    plantillaId: 'plantilla-v1',
    especialistaId: 'user-1',
    estado: 'BORRADOR',
    anioAcademico: 2026,
    puntajeTotal: 0,
    promedio: 0,
    nivelLogro: 'EN_PROCESO',
    observaciones: null,
    respuestasDesempeno: [],
    respuestasAspecto: [],
    contexto: null,
    createdAt: new Date().toISOString(),
    finalizadaAt: null,
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        FichaService,
        {
          provide: FichaRepository,
          useValue: {
            findById: jest.fn<any>(),
            findByVisitaId: jest.fn<any>(),
            findCronogramaBasicById: jest
              .fn<any>()
              .mockResolvedValue({ id: 'cronograma-1', monitorId: 'esp-1' }),
            create: jest.fn<any>(),
            saveRespuestaDesempeno: jest.fn<any>(),
            saveRespuestaAspecto: jest.fn<any>(),
            findPlantillaBasicById: jest.fn<any>(),
            findPlantillaVigente: jest.fn<any>(),
            existsWithScope: jest.fn<any>().mockResolvedValue(true),
          },
        },
        {
          provide: STORAGE_SERVICE,
          useValue: { savePdf: jest.fn<any>() },
        },
        {
          provide: ScopeFilter,
          useValue: { forFicha: jest.fn<any>().mockReturnValue({}) },
        },
        BaremoCalculatorService,
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn<any>() },
        },
      ],
    }).compile();

    service = module.get(FichaService);
    repo = module.get(FichaRepository);
  });

  describe('guardarRespuesta con plantilla vigente', () => {
    it('permite guardar normalmente', async () => {
      repo.findById = jest.fn<any>().mockResolvedValue(baseFicha);
      (repo.findPlantillaBasicById as jest.Mock<any>).mockResolvedValue({
        id: 'plantilla-v1',
        tipoMonitoreo: 'DOCENTE',
        anioAcademico: 2026,
        estado: 'Vigente',
        descripcion: null,
      });
      repo.saveRespuestaDesempeno = jest.fn<any>().mockResolvedValue(undefined);
      repo.findById = jest
        .fn<any>()
        .mockResolvedValueOnce(baseFicha)
        .mockResolvedValueOnce({
          ...baseFicha,
          respuestasDesempeno: [{ desempenoId: 'd1', nivel: 3 }],
        });

      const result = await service.guardarRespuesta(
        'ficha-1',
        { desempenoId: 'd1', nivel: 3 },
        { id: 'user-1', role: RoleCode.ESPECIALISTA, especialistaId: 'esp-1' },
      );

      expect(result.respuestasDesempeno).toHaveLength(1);
      expect(repo.saveRespuestaDesempeno).toHaveBeenCalled();
    });
  });

  describe('guardarRespuesta con plantilla HISTORICO (ILA-0046)', () => {
    it('lanza 409 con code PLANTILLA_VERSIONADA y datos de la v2', async () => {
      repo.findById = jest.fn<any>().mockResolvedValue(baseFicha);
      (repo.findPlantillaBasicById as jest.Mock<any>).mockResolvedValue({
        id: 'plantilla-v1',
        tipoMonitoreo: 'DOCENTE',
        anioAcademico: 2026,
        estado: 'Historico',
        descripcion: null,
      });
      (repo.findPlantillaVigente as jest.Mock<any>).mockResolvedValue({
        id: 'plantilla-v2',
        descripcion: 'Plantilla DOCENTE 2026 v2',
      });

      try {
        await service.guardarRespuesta(
          'ficha-1',
          { desempenoId: 'd1', nivel: 3 },
          { id: 'user-1', role: RoleCode.ESPECIALISTA, especialistaId: 'esp-1' },
        );
        fail('Debio lanzar ConflictException');
      } catch (err) {
        expect(err).toBeInstanceOf(ConflictException);
        const body = (err as ConflictException).getResponse() as Record<string, unknown>;
        expect(body.code).toBe('PLANTILLA_VERSIONADA');
        expect(body.plantillaVigenteId).toBe('plantilla-v2');
        expect(body.plantillaVigenteNombre).toBe('Plantilla DOCENTE 2026 v2');
      }

      expect(repo.saveRespuestaDesempeno).not.toHaveBeenCalled();
    });

    it('lanza 409 sin plantillaVigenteId si no hay vigente', async () => {
      repo.findById = jest.fn<any>().mockResolvedValue(baseFicha);
      (repo.findPlantillaBasicById as jest.Mock<any>).mockResolvedValue({
        id: 'plantilla-v1',
        tipoMonitoreo: 'DOCENTE',
        anioAcademico: 2026,
        estado: 'Historico',
        descripcion: null,
      });
      (repo.findPlantillaVigente as jest.Mock<any>).mockResolvedValue(null);

      try {
        await service.guardarRespuesta(
          'ficha-1',
          { desempenoId: 'd1', nivel: 3 },
          { id: 'user-1', role: RoleCode.ESPECIALISTA, especialistaId: 'esp-1' },
        );
        fail('Debio lanzar ConflictException');
      } catch (err) {
        const body = (err as ConflictException).getResponse() as Record<string, unknown>;
        expect(body.code).toBe('PLANTILLA_VERSIONADA');
        expect(body.plantillaVigenteId).toBeNull();
      }
    });
  });

  describe('guardarRespuestaAspecto con plantilla HISTORICO (ILA-0046)', () => {
    it('tambien aplica a aspectos', async () => {
      repo.findById = jest.fn<any>().mockResolvedValue(baseFicha);
      (repo.findPlantillaBasicById as jest.Mock<any>).mockResolvedValue({
        id: 'plantilla-v1',
        tipoMonitoreo: 'DOCENTE',
        anioAcademico: 2026,
        estado: 'Historico',
        descripcion: null,
      });
      (repo.findPlantillaVigente as jest.Mock<any>).mockResolvedValue(null);

      try {
        await service.guardarRespuestaAspecto('ficha-1', 'aspecto-1', true, {
          id: 'user-1',
          role: RoleCode.ESPECIALISTA,
          especialistaId: 'esp-1',
        });
        fail('Debio lanzar ConflictException');
      } catch (err) {
        expect(err).toBeInstanceOf(ConflictException);
        const body = (err as ConflictException).getResponse() as Record<string, unknown>;
        expect(body.code).toBe('PLANTILLA_VERSIONADA');
      }

      expect(repo.saveRespuestaAspecto).not.toHaveBeenCalled();
    });
  });

  describe('errores que ya existian', () => {
    it('lanza NotFound si la ficha no existe', async () => {
      repo.findById = jest.fn<any>().mockResolvedValue(null);
      await expect(
        service.guardarRespuesta(
          'ficha-x',
          { desempenoId: 'd1', nivel: 1 },
          { id: 'user-1', role: RoleCode.ESPECIALISTA, especialistaId: 'esp-1' },
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
