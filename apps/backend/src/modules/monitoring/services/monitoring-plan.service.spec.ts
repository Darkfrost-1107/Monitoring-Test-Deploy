import { RoleCode } from '../../../common/enums/role.enum.js';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MonitoringPlanService } from './monitoring-plan.service.js';
import { PrerrequisitosDirectorService } from './prerrequisitos-director.service.js';
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
      contarDependencias: jest
        .fn<any>()
        .mockResolvedValue({ plantillasVigentes: 0, cronogramas: 0 }),
      restore: jest.fn<any>(),
      findCobertura: jest.fn<any>(),
      addCobertura: jest.fn<any>(),
      removeCobertura: jest.fn<any>(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        MonitoringPlanService,
        { provide: MonitoringPlanRepository, useValue: mockRepo },
        {
          provide: PrerrequisitosDirectorService,
          useValue: { asegurar: jest.fn<any>().mockResolvedValue(undefined) },
        },
      ],
    }).compile();
    service = moduleRef.get(MonitoringPlanService);
    repo = moduleRef.get(MonitoringPlanRepository);
  });

  /**
   * El listado de planes se acota por institución para TODO el personal de I.E.
   *
   * El bug: sólo se acotaba para el Director. El Coordinador Pedagógico y el
   * Jefe de Taller —que también son personal de I.E.— caían en la rama que no
   * filtraba, de modo que veían los planes de instituciones a las que no
   * pertenecen. El repositorio ya honra `institucionId` (planes de esa IE más
   * los de UGEL); lo que faltaba era pasárselo.
   */
  describe('findAll con scoping por institucion', () => {
    it('acota al Director a su institucion', async () => {
      await service.findAll(undefined, sesionDirector);
      expect(repo.findAll).toHaveBeenCalledWith(expect.objectContaining({ institucionId: 'ie-1' }));
    });

    it('acota al Coordinador Pedagogico a su institucion', async () => {
      await service.findAll(undefined, sesionCoordinador);
      expect(repo.findAll).toHaveBeenCalledWith(expect.objectContaining({ institucionId: 'ie-1' }));
    });

    it('acota al Jefe de Taller a su institucion', async () => {
      await service.findAll(undefined, sesionJefeTaller);
      expect(repo.findAll).toHaveBeenCalledWith(expect.objectContaining({ institucionId: 'ie-1' }));
    });

    it('el Jefe de Area solo ve planes UGEL', async () => {
      await service.findAll(undefined, { id: 'u', role: RoleCode.JEFE_AREA });
      expect(repo.findAll).toHaveBeenCalledWith(expect.objectContaining({ tipoEntidad: 'UGEL' }));
    });

    /** El Jefe de Gestion es de la UGEL: ve los planes de todas las II.EE. */
    it('no acota al Jefe de Gestion', async () => {
      await service.findAll(undefined, sesionJefe);
      const arg = repo.findAll.mock.calls[0][0];
      expect(arg?.institucionId).toBeUndefined();
      expect(arg?.tipoEntidad).toBeUndefined();
    });

    /** Personal de I.E. sin institucion en el token: no ve nada ajeno por defecto. */
    it('no acota si el personal de I.E. no trae institucion', async () => {
      await service.findAll(undefined, { id: 'u', role: RoleCode.COORDINADOR_PEDAGOGICO });
      const arg = repo.findAll.mock.calls[0][0];
      expect(arg?.institucionId).toBeUndefined();
    });
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

    /**
     * El Director SÍ ve los planes de la UGEL: el listado ya se los mostraba
     * —el repositorio agrega los de tipoEntidad UGEL a los de la institución—.
     * `findById` se los negaba, una incoherencia entre las dos vistas del mismo
     * dato. Ahora ambas dicen lo mismo.
     */
    it('Director IE ve plan UGEL', async () => {
      repo.findById.mockResolvedValue({ ...planBase, tipoEntidad: 'UGEL', institucionId: null });
      const p = await service.findById('plan-1', sesionDirector);
      expect(p.tipoEntidad).toBe('UGEL');
    });

    it('Director IE ve plan IE de su institucion', async () => {
      repo.findById.mockResolvedValue({ ...planBase, tipoEntidad: 'IE', institucionId: 'ie-1' });
      const p = await service.findById('plan-1', sesionDirector);
      expect(p.tipoEntidad).toBe('IE');
    });

    /**
     * El listado ya se acota por institución, pero `findById` es la puerta de
     * atrás: `GET /planes/:id/archivo` descarga el PDF por id. Sin este control,
     * el personal de una I.E. abría el plan de otra institución conociendo su id.
     */
    it('el personal de I.E. NO ve el plan IE de otra institucion', async () => {
      repo.findById.mockResolvedValue({ ...planBase, tipoEntidad: 'IE', institucionId: 'ie-2' });

      await expect(service.findById('plan-1', sesionDirector)).rejects.toThrow(ForbiddenException);
      await expect(service.findById('plan-1', sesionCoordinador)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findById('plan-1', sesionJefeTaller)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('el Coordinador ve el plan IE de su propia institucion', async () => {
      repo.findById.mockResolvedValue({ ...planBase, tipoEntidad: 'IE', institucionId: 'ie-1' });
      const p = await service.findById('plan-1', sesionCoordinador);
      expect(p.tipoEntidad).toBe('IE');
    });

    /** El plan de la UGEL lo ve todo el personal de I.E. */
    it('el personal de I.E. ve los planes de la UGEL', async () => {
      repo.findById.mockResolvedValue({ ...planBase, tipoEntidad: 'UGEL', institucionId: null });
      const p = await service.findById('plan-1', sesionCoordinador);
      expect(p.tipoEntidad).toBe('UGEL');
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

    /**
     * El mismo hueco que en `findById`, pero peor porque MUTA: el Coordinador
     * caía en la rama que no comprobaba institución y podía cambiar el estado
     * del plan de otra I.E. conociendo su id.
     */
    it('el personal de I.E. no puede modificar el plan de otra institucion', async () => {
      repo.findById.mockResolvedValue({ ...planBase, tipoEntidad: 'IE', institucionId: 'ie-2' });
      await expect(service.toggleEstado('plan-1', sesionCoordinador)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.toggleEstado('plan-1', sesionJefeTaller)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('Jefe Gestion puede activar/desactivar cualquier plan', async () => {
      repo.findById.mockResolvedValue({ ...planBase, estado: 'Inactivo' });
      repo.softDelete.mockResolvedValue({ ...planBase, estado: 'Activo' });
      const p = await service.toggleEstado('plan-1', sesionJefe);
      expect(p.estado).toBe('Activo');
    });

    /**
     * No se inactiva un plan activo que sostiene monitoreo en curso: sus
     * plantillas vigentes y cronogramas quedarían sin plan activo, y la regla
     * del prerrequisito volvería a bloquear al personal de la I.E.
     */
    const planActivoIE = {
      ...planBase,
      estado: 'Activo',
      tipoEntidad: 'IE',
      institucionId: 'ie-1',
    };

    it('no inactiva un plan con plantillas vigentes o cronogramas', async () => {
      repo.findById.mockResolvedValue(planActivoIE);
      repo.contarDependencias.mockResolvedValue({ plantillasVigentes: 2, cronogramas: 0 });

      await expect(service.toggleEstado('plan-1', sesionDirector)).rejects.toThrow(
        ConflictException,
      );
      expect(repo.softDelete).not.toHaveBeenCalled();
    });

    it('bloquea la inactivacion tambien cuando lo que cuelga son cronogramas', async () => {
      repo.findById.mockResolvedValue(planActivoIE);
      repo.contarDependencias.mockResolvedValue({ plantillasVigentes: 0, cronogramas: 3 });

      await expect(service.toggleEstado('plan-1', sesionDirector)).rejects.toThrow(
        ConflictException,
      );
    });

    it('inactiva el plan cuando nada depende de el', async () => {
      repo.findById.mockResolvedValue(planActivoIE);
      repo.contarDependencias.mockResolvedValue({ plantillasVigentes: 0, cronogramas: 0 });
      repo.softDelete.mockResolvedValue({ ...planActivoIE, estado: 'Inactivo' });

      const p = await service.toggleEstado('plan-1', sesionDirector);
      expect(p.estado).toBe('Inactivo');
    });

    /** Reactivar no consulta dependencias: esa via la gobierna el duplicado. */
    it('reactivar no verifica dependencias', async () => {
      repo.findById.mockResolvedValue({ ...planBase, estado: 'Inactivo' });
      repo.softDelete.mockResolvedValue({ ...planBase, estado: 'Activo' });

      await service.toggleEstado('plan-1', sesionJefe);
      expect(repo.contarDependencias).not.toHaveBeenCalled();
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
