import { RoleCode } from '../../../common/enums/role.enum.js';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MonitoringPlanService } from './monitoring-plan.service.js';
import type { SessionUser } from '../../../shared/types/session-user.js';
import { MonitoringPlanRepository } from '../repositories/monitoring-plan.repository.js';
import type { IMonitoringPlanResponse } from '@sistema-monitoreo/shared-contracts';

describe('MonitoringPlanService', () => {
  let service: MonitoringPlanService;
  let repo: jest.Mocked<MonitoringPlanRepository>;

  const planBase: IMonitoringPlanResponse = {
    id: 'plan-1',
    titulo: 'Plan 2026',
    anioAcademico: 2026,
    tipoEntidad: 'UGEL',
    archivoUrl: '/uploads/planes/plan-1.pdf',
    estado: 'Activo',
    autorId: 'user-1',
    rolAutorAlCrear: 'jefe_gestion',
    institucionId: null,
    deleted: false,
    deletedAt: null,
    institucionesCubiertas: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const sesionJefe: SessionUser = { id: 'user-1', role: RoleCode.JEFE_GESTION };
  const sesionDirector: SessionUser = {
    id: 'user-2',
    role: RoleCode.DIRECTOR_INSTITUCION,
    institucionId: 'ie-1',
  };
  const sesionCoordinador: SessionUser = {
    id: 'user-3',
    role: RoleCode.COORDINADOR_PEDAGOGICO,
    institucionId: 'ie-1',
  };
  const sesionJefeTaller: SessionUser = {
    id: 'user-4',
    role: RoleCode.JEFE_TALLER,
    institucionId: 'ie-1',
  };
  const sesionCoordinador2: SessionUser = {
    id: 'user-5',
    role: RoleCode.COORDINADOR_PEDAGOGICO,
    institucionId: 'ie-1',
  };

  beforeEach(async () => {
    const mockRepo: Partial<jest.Mocked<MonitoringPlanRepository>> = {
      findAll: jest.fn<any>().mockResolvedValue([]),
      findById: jest.fn<any>(),
      create: jest.fn<any>(),
      softDelete: jest.fn<any>(),
      restore: jest.fn<any>(),
      findCobertura: jest.fn<any>(),
      addCobertura: jest.fn<any>(),
      removeCobertura: jest.fn<any>(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [MonitoringPlanService, { provide: MonitoringPlanRepository, useValue: mockRepo }],
    }).compile();
    service = moduleRef.get(MonitoringPlanService);
    repo = moduleRef.get(MonitoringPlanRepository);
  });

  describe('findById conスコoping', () => {
    it('lanza NotFound si el plan no existe', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.findById('no-existe')).rejects.toThrow(NotFoundException);
    });

    it('Jefe Gestion ve cualquier plan', async () => {
      repo.findById.mockResolvedValue({ ...planBase, tipoEntidad: 'IE' });
      const p = await service.findById('plan-1', sesionJefe);
      expect(p.id).toBe('plan-1');
    });

    it('Director IE NO ve plan UGEL', async () => {
      repo.findById.mockResolvedValue({ ...planBase, tipoEntidad: 'UGEL' });
      await expect(service.findById('plan-1', sesionDirector)).rejects.toThrow(ForbiddenException);
    });

    it('Director IE ve plan IE', async () => {
      repo.findById.mockResolvedValue({ ...planBase, tipoEntidad: 'IE' });
      const p = await service.findById('plan-1', sesionDirector);
      expect(p.tipoEntidad).toBe('IE');
    });
  });

  describe('create con discriminacion por rol', () => {
    it('Jefe Gestion crea plan UGEL sin institucionId', async () => {
      const dto = { titulo: 'Plan', anioAcademico: 2026, archivoUrl: '/x.pdf' } as any;
      repo.create.mockResolvedValue({ ...planBase });
      await service.create(dto, sesionJefe);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tipoEntidad: 'UGEL', institucionId: null }),
      );
    });

    it('Director IE crea plan IE con institucionId de sesion', async () => {
      const dto = { titulo: 'Plan', anioAcademico: 2026, archivoUrl: '/x.pdf' } as any;
      repo.create.mockResolvedValue({ ...planBase, tipoEntidad: 'IE' });
      await service.create(dto, sesionDirector);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tipoEntidad: 'IE', institucionId: 'ie-1' }),
      );
    });

    it('Director IE sin institucionId en sesion falla con 403', async () => {
      const dto = { titulo: 'Plan', anioAcademico: 2026, archivoUrl: '/x.pdf' } as any;
      await expect(
        service.create(dto, { id: 'user-2', role: RoleCode.DIRECTOR_INSTITUCION }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Coordinador Pedagógico crea plan IE con ámbito coordinador_pedagogico', async () => {
      const dto = { titulo: 'Plan', anioAcademico: 2026, archivoUrl: '/x.pdf' } as any;
      repo.create.mockResolvedValue({ ...planBase, tipoEntidad: 'IE' });
      await service.create(dto, sesionCoordinador);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tipoEntidad: 'IE',
          institucionId: 'ie-1',
          rolAutorAlCrear: 'coordinador_pedagogico',
        }),
      );
    });

    it('Jefe de Taller crea plan IE con ámbito jefe_taller', async () => {
      const dto = { titulo: 'Plan', anioAcademico: 2026, archivoUrl: '/x.pdf' } as any;
      repo.create.mockResolvedValue({ ...planBase, tipoEntidad: 'IE' });
      await service.create(dto, sesionJefeTaller);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tipoEntidad: 'IE', rolAutorAlCrear: 'jefe_taller' }),
      );
    });

    it('rechaza 2° plan activo del MISMO autor en la misma IE', async () => {
      const dto = { titulo: 'Plan', anioAcademico: 2026, archivoUrl: '/x.pdf' } as any;
      repo.findAll.mockResolvedValue([
        { ...planBase, tipoEntidad: 'IE', institucionId: 'ie-1', autorId: 'user-3' },
      ]);
      await expect(service.create(dto, sesionCoordinador)).rejects.toThrow(ConflictException);
    });

    it('permite planes de coordinadores DISTINTOS en la misma IE', async () => {
      const dto = { titulo: 'Plan', anioAcademico: 2026, archivoUrl: '/x.pdf' } as any;
      // Ya existe el plan del coordinador user-3; el coordinador user-5 sube el suyo.
      repo.findAll.mockResolvedValue([
        { ...planBase, tipoEntidad: 'IE', institucionId: 'ie-1', autorId: 'user-3' },
      ]);
      repo.create.mockResolvedValue({ ...planBase, tipoEntidad: 'IE' });
      await service.create(dto, sesionCoordinador2);
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ autorId: 'user-5' }));
    });
  });

  describe('toggleEstado conスコoping', () => {
    it('Director IE no puede modificar plan UGEL', async () => {
      repo.findById.mockResolvedValue({ ...planBase, tipoEntidad: 'UGEL' });
      await expect(service.toggleEstado('plan-1', sesionDirector)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('Jefe Gestion puede activar/desactivar cualquier plan', async () => {
      repo.findById.mockResolvedValue({ ...planBase, estado: 'Inactivo' });
      repo.softDelete.mockResolvedValue({ ...planBase, estado: 'Activo' });
      const p = await service.toggleEstado('plan-1', sesionJefe);
      expect(p.estado).toBe('Activo');
    });
  });

  describe('addCobertura / removeCobertura conスコoping', () => {
    it('Director IE no puede agregar cobertura a planes UGEL', async () => {
      repo.findById.mockResolvedValue({ ...planBase, tipoEntidad: 'UGEL' });
      await expect(service.addCobertura('plan-1', 'ie-99', sesionDirector)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('Jefe Gestion puede gestionar cobertura', async () => {
      repo.findById.mockResolvedValue({ ...planBase });
      repo.addCobertura.mockResolvedValue(undefined);
      repo.findCobertura.mockResolvedValue([
        { institucionId: 'ie-1', institucionNombre: 'IE 1', institucionCodigoModular: 'CM001' },
      ]);
      const r = await service.addCobertura('plan-1', 'ie-1', sesionJefe);
      expect(r).toHaveLength(1);
    });
  });
});
