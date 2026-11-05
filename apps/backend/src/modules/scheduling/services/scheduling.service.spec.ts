import { RoleCode } from '../../../common/enums/role.enum.js';
import { CargoNombre } from '../../../common/enums/cargo.enum.js';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SchedulingService } from './scheduling.service.js';
import { PrerrequisitosDirectorService } from '../../monitoring/services/prerrequisitos-director.service.js';
import {
  CronogramaRepository,
  SolicitudReprogramacionRepository,
} from '../repositories/cronograma.repository.js';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { STORAGE_SERVICE } from '../../../shared/storage/storage.constants.js';
import { ScopeFilter } from '../../../shared/auth/scope-filter.js';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('SchedulingService - Reprogramaciones', () => {
  let service: SchedulingService;
  let cronogramaRepo: jest.Mocked<CronogramaRepository>;
  let solicitudRepo: jest.Mocked<SolicitudReprogramacionRepository>;
  let storage: any;
  let eventEmitter: EventEmitter2;

  const sesionEspecialista = { id: 'esp-1', role: RoleCode.ESPECIALISTA };
  const sesionJefe = { id: 'jefe-1', role: RoleCode.JEFE_GESTION };
  const sesionDirector = {
    id: 'dir-1',
    role: RoleCode.DIRECTOR_INSTITUCION,
    institucionId: 'ie-1',
  };

  const visitaBase = {
    id: 'vis-1',
    monitorId: 'esp-1',
    institucionId: 'ie-1',
    evaluadoId: 'doc-1',
    planId: 'plan-1',
    tipoMonitoreo: 'DOCENTE' as const,
    numeroVisita: 1,
    fechaProgramada: '2099-03-15',
    horaInicio: '09:00:00',
    detalles: null,
    estado: 'PROGRAMADO' as const,
    modalidad: 'EBR' as const,
    nivelEducativo: 'Primaria',
    creadoPorId: 'esp-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    const mockCron: Partial<jest.Mocked<CronogramaRepository>> = {
      findAll: jest.fn<any>().mockResolvedValue([visitaBase]),
      findById: jest.fn<any>().mockResolvedValue(visitaBase),
      findPlanVigentePara: jest.fn<any>(),
      findPlantillaVigentePara: jest.fn<any>().mockResolvedValue('plantilla-1'),
      validateEntidadesActivas: jest.fn<any>().mockResolvedValue({
        institucion: true,
        monitor: true,
        evaluado: true,
        monitorEsDirectorUgel: false,
        monitorEspecialidades: [],
        evaluadoEsDirector: false,
        evaluadoEspecialidades: [],
      }),
      countPendientesByMonitor: jest.fn<any>().mockResolvedValue(0),
      findVisitasMonitorPorFecha: jest.fn<any>().mockResolvedValue([]),
      findVisitaExistente: jest.fn<any>().mockResolvedValue(null),
      create: jest.fn<any>().mockResolvedValue(visitaBase),
      update: jest.fn<any>().mockResolvedValue({ ...visitaBase, estado: 'REPROGRAMADO' }),
      remove: jest.fn<any>(),
      findMonitorEspecialidades: jest.fn<any>().mockResolvedValue([]),
      applyReprogramacion: jest.fn<any>().mockResolvedValue(undefined),
      ejecutarAccionExcepcional: jest.fn<any>(),
      findOperacionExcepcionalByCronograma: jest.fn<any>(),
    };
    const mockSol: Partial<jest.Mocked<SolicitudReprogramacionRepository>> = {
      findAll: jest.fn<any>(),
      findById: jest.fn<any>(),
      findPendienteByCronograma: jest.fn<any>(),
      create: jest.fn<any>().mockResolvedValue({}),
      resolver: jest.fn<any>(),
    };
    const mockStorage = {
      savePdf: jest.fn<any>().mockResolvedValue({ url: '/uploads/reprog/x.pdf' }),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        SchedulingService,
        { provide: CronogramaRepository, useValue: mockCron },
        { provide: SolicitudReprogramacionRepository, useValue: mockSol },
        { provide: STORAGE_SERVICE, useValue: mockStorage },
        { provide: ScopeFilter, useClass: ScopeFilter },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn<any>() },
        },
        {
          provide: PrerrequisitosDirectorService,
          useValue: { asegurar: jest.fn<any>().mockResolvedValue(undefined) },
        },
        {
          provide: PrismaService,
          useValue: {
            $executeRawUnsafe: jest.fn<any>().mockResolvedValue(undefined),
            $transaction: jest.fn<any>().mockImplementation((arg: any) => {
              if (Array.isArray(arg)) return Promise.all(arg);
              if (typeof arg === 'function') return arg(this);
              return Promise.resolve(arg);
            }),
            cronograma: {
              update: jest.fn<any>().mockResolvedValue({}),
            },
          },
        },
      ],
    }).compile();
    service = moduleRef.get(SchedulingService);
    cronogramaRepo = moduleRef.get(CronogramaRepository);
    solicitudRepo = moduleRef.get(SolicitudReprogramacionRepository);
    storage = moduleRef.get(STORAGE_SERVICE);
    eventEmitter = moduleRef.get(EventEmitter2);
  });

  describe('crearVisita - plan vigente requerido', () => {
    it('rechaza si no hay plan vigente para la institucion y anio', async () => {
      cronogramaRepo.findPlanVigentePara.mockResolvedValue(null);
      await expect(
        service.crearVisita(
          {
            monitorId: 'esp-1',
            institucionId: 'ie-1',
            evaluadoId: 'doc-1',
            tipoMonitoreo: 'DOCENTE',
            numeroVisita: 1,
            fechaProgramada: '2099-03-15',
            horaInicio: '09:00:00',
            modalidad: 'EBR',
            nivelEducativo: 'Primaria',
          } as any,
          sesionJefe,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('crea visita si hay plan vigente', async () => {
      cronogramaRepo.findPlanVigentePara.mockResolvedValue('plan-ugel-2026');
      cronogramaRepo.create.mockResolvedValue(visitaBase);
      const r = await service.crearVisita(
        {
          monitorId: 'esp-1',
          institucionId: 'ie-1',
          evaluadoId: 'doc-1',
          tipoMonitoreo: 'DOCENTE',
          numeroVisita: 1,
          fechaProgramada: '2099-03-15',
          horaInicio: '09:00:00',
          modalidad: 'EBR',
          nivelEducativo: 'Primaria',
        } as any,
        sesionJefe,
      );
      expect(r.id).toBe('vis-1');
    });
  });

  describe('crearVisita - a un director solo la ficha directiva', () => {
    const visitaPara = (tipoMonitoreo: 'DOCENTE' | 'DIRECTIVO') => ({
      monitorId: 'esp-1',
      institucionId: 'ie-1',
      evaluadoId: 'doc-1',
      tipoMonitoreo,
      numeroVisita: 1,
      fechaProgramada: '2099-03-15',
      horaInicio: '09:00:00',
      modalidad: 'EBR',
      nivelEducativo: 'Primaria',
    });

    beforeEach(() => {
      cronogramaRepo.findPlanVigentePara.mockResolvedValue('plan-ugel-2026');
      cronogramaRepo.validateEntidadesActivas.mockResolvedValue({
        institucion: true,
        monitor: true,
        evaluado: true,
        monitorCargo: 'Especialista',
        monitorNivel: 'Primaria',
        monitorEsDirectorUgel: false,
        monitorEspecialidades: [],
        evaluadoEsDirector: true,
        evaluadoEspecialidades: [],
      });
    });

    /**
     * La ficha equivocada no se nota hasta que ya está llena: mide desempeño de
     * aula a quien conduce la institución. Por eso se rechaza al programar.
     */
    it('rechaza programarle una ficha docente', async () => {
      await expect(service.crearVisita(visitaPara('DOCENTE') as any, sesionJefe)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('el mensaje dice qué tipo corresponde', async () => {
      await expect(service.crearVisita(visitaPara('DOCENTE') as any, sesionJefe)).rejects.toThrow(
        /ficha directiva/i,
      );
    });

    it('acepta la ficha directiva', async () => {
      cronogramaRepo.create.mockResolvedValue(visitaBase);

      const r = await service.crearVisita(visitaPara('DIRECTIVO') as any, sesionJefe);

      expect(r.id).toBe('vis-1');
    });

    it('a quien no dirige no le impone la ficha directiva', async () => {
      cronogramaRepo.validateEntidadesActivas.mockResolvedValue({
        institucion: true,
        monitor: true,
        evaluado: true,
        monitorCargo: 'Especialista',
        monitorNivel: 'Primaria',
        monitorEsDirectorUgel: false,
        monitorEspecialidades: [],
        evaluadoEsDirector: false,
        evaluadoEspecialidades: [],
      });
      cronogramaRepo.create.mockResolvedValue(visitaBase);

      const r = await service.crearVisita(visitaPara('DOCENTE') as any, sesionJefe);

      expect(r.id).toBe('vis-1');
    });
  });

  describe('crearVisita - el Director de UGEL no monitorea', () => {
    it('rechaza asignar a un Director de UGEL como monitor', async () => {
      cronogramaRepo.findPlanVigentePara.mockResolvedValue('plan-ugel-2026');
      cronogramaRepo.validateEntidadesActivas.mockResolvedValue({
        institucion: true,
        monitor: true,
        evaluado: true,
        evaluadoEsDirector: false,
        monitorEsDirectorUgel: true,
        monitorEspecialidades: [],
        evaluadoEspecialidades: [],
      });

      await expect(
        service.crearVisita(
          {
            monitorId: 'esp-ugel',
            institucionId: 'ie-1',
            evaluadoId: 'doc-1',
            tipoMonitoreo: 'DOCENTE',
            numeroVisita: 1,
            fechaProgramada: '2099-05-01',
            horaInicio: '09:00:00',
            modalidad: 'EBR',
            nivelEducativo: 'Primaria',
          } as any,
          sesionJefe,
        ),
      ).rejects.toThrow(/Director de UGEL no realiza visitas/i);
    });
  });

  describe('crearVisita - Secundaria monitorea por área', () => {
    const visitaSecundaria = () => ({
      monitorId: 'esp-1',
      institucionId: 'ie-1',
      evaluadoId: 'doc-1',
      tipoMonitoreo: 'DOCENTE',
      numeroVisita: 1,
      fechaProgramada: '2099-06-01',
      horaInicio: '09:00:00',
      modalidad: 'EBR',
      nivelEducativo: 'Secundaria',
    });

    it('rechaza si el especialista y el docente no comparten especialidad', async () => {
      cronogramaRepo.findPlanVigentePara.mockResolvedValue('plan-ugel-2026');
      cronogramaRepo.validateEntidadesActivas.mockResolvedValue({
        institucion: true,
        monitor: true,
        evaluado: true,
        monitorCargo: 'Especialista',
        monitorNivel: 'Secundaria',
        monitorEsDirectorUgel: false,
        monitorEspecialidades: ['Matematica'],
        evaluadoEsDirector: false,
        evaluadoEspecialidades: ['Comunicacion'],
      });

      await expect(service.crearVisita(visitaSecundaria() as any, sesionJefe)).rejects.toThrow(
        /deben compartir/i,
      );
    });

    it('acepta cuando comparten al menos una especialidad', async () => {
      cronogramaRepo.findPlanVigentePara.mockResolvedValue('plan-ugel-2026');
      cronogramaRepo.validateEntidadesActivas.mockResolvedValue({
        institucion: true,
        monitor: true,
        evaluado: true,
        monitorCargo: 'Especialista',
        monitorNivel: 'Secundaria',
        monitorEsDirectorUgel: false,
        monitorEspecialidades: ['Matematica', 'Comunicacion'],
        evaluadoEsDirector: false,
        evaluadoEspecialidades: ['Comunicacion'],
      });
      cronogramaRepo.create.mockResolvedValue(visitaBase);

      const r = await service.crearVisita(visitaSecundaria() as any, sesionJefe);

      expect(r.id).toBe('vis-1');
    });
  });

  describe('crearVisita - límite de visitas por monitor (máximo 3 por día, ilimitado en días distintos)', () => {
    it('rechaza crear si el monitor ya tiene 3 visitas en el mismo día', async () => {
      cronogramaRepo.findPlanVigentePara.mockResolvedValue('plan-ugel-2026');
      cronogramaRepo.findVisitasMonitorPorFecha.mockResolvedValue([
        { ...visitaBase, id: 'v-1', horaInicio: '08:00:00' },
        { ...visitaBase, id: 'v-2', horaInicio: '11:00:00' },
        { ...visitaBase, id: 'v-3', horaInicio: '14:00:00' },
      ]);
      cronogramaRepo.create.mockResolvedValue(visitaBase);

      await expect(
        service.crearVisita(
          {
            monitorId: 'esp-1',
            institucionId: 'ie-1',
            evaluadoId: 'doc-1',
            tipoMonitoreo: 'DOCENTE',
            numeroVisita: 2,
            fechaProgramada: '2099-04-01',
            horaInicio: '17:00:00',
            modalidad: 'EBR',
            nivelEducativo: 'Primaria',
          } as any,
          sesionJefe,
        ),
      ).rejects.toThrow(
        new BadRequestException(
          'El monitor ya tiene 3 visitas programadas para este día. El límite máximo es de 3 visitas por día.',
        ),
      );
    });

    it('permite crear visita si el monitor tiene 3 o más visitas en días distintos pero menos de 3 el mismo día', async () => {
      cronogramaRepo.findPlanVigentePara.mockResolvedValue('plan-ugel-2026');
      // En el mismo día sólo tiene 1 visita programada
      cronogramaRepo.findVisitasMonitorPorFecha.mockResolvedValue([
        { ...visitaBase, id: 'v-1', horaInicio: '08:00:00' },
      ]);
      // En otros días tiene muchas visitas pendientes (simuladas con countPendientesByMonitor = 10)
      cronogramaRepo.countPendientesByMonitor.mockResolvedValue(10);
      cronogramaRepo.create.mockResolvedValue(visitaBase);

      const r = await service.crearVisita(
        {
          monitorId: 'esp-1',
          institucionId: 'ie-1',
          evaluadoId: 'doc-1',
          tipoMonitoreo: 'DOCENTE',
          numeroVisita: 1,
          fechaProgramada: '2099-04-01',
          horaInicio: '11:00:00',
          modalidad: 'EBR',
          nivelEducativo: 'Primaria',
        } as any,
        sesionJefe,
      );

      expect(r.id).toBe('vis-1');
    });
  });

  describe('crearVisita - restricciones Jefe de Área por nivel', () => {
    const sesionJefeAreaPrimaria = {
      id: 'jefe-primaria-1',
      role: RoleCode.JEFE_AREA,
      especialistaNivel: 'Primaria',
    };

    const sesionJefeAreaSecundaria = {
      id: 'jefe-secundaria-1',
      role: RoleCode.JEFE_AREA,
      especialistaNivel: 'Secundaria',
    };

    it('permite a Jefe de Área Primaria crear visita para nivel Primaria', async () => {
      cronogramaRepo.findPlanVigentePara.mockResolvedValue('plan-2026');
      cronogramaRepo.countPendientesByMonitor.mockResolvedValue(0);
      cronogramaRepo.create.mockResolvedValue(visitaBase);

      const r = await service.crearVisita(
        {
          monitorId: 'esp-1',
          institucionId: 'ie-1',
          evaluadoId: 'doc-1',
          tipoMonitoreo: 'DOCENTE',
          numeroVisita: 1,
          fechaProgramada: '2099-03-15',
          horaInicio: '09:00:00',
          modalidad: 'EBR',
          nivelEducativo: 'Primaria',
        } as any,
        sesionJefeAreaPrimaria,
      );
      expect(r.id).toBe('vis-1');
    });

    it('rechaza si Jefe de Área Primaria intenta crear visita para nivel Secundaria', async () => {
      cronogramaRepo.findPlanVigentePara.mockResolvedValue('plan-2026');
      cronogramaRepo.countPendientesByMonitor.mockResolvedValue(0);

      await expect(
        service.crearVisita(
          {
            monitorId: 'esp-1',
            institucionId: 'ie-1',
            evaluadoId: 'doc-1',
            tipoMonitoreo: 'DOCENTE',
            numeroVisita: 1,
            fechaProgramada: '2099-03-15',
            horaInicio: '09:00:00',
            modalidad: 'EBR',
            nivelEducativo: 'Secundaria',
          } as any,
          sesionJefeAreaPrimaria,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permite a Jefe de Área Secundaria crear visita para nivel Secundaria, EBA o CEPTRO', async () => {
      cronogramaRepo.findPlanVigentePara.mockResolvedValue('plan-2026');
      cronogramaRepo.countPendientesByMonitor.mockResolvedValue(0);
      cronogramaRepo.validateEntidadesActivas.mockResolvedValue({
        institucion: true,
        monitor: true,
        evaluado: true,
        monitorCargo: 'Especialista',
        monitorNivel: 'Secundaria',
        monitorEsDirectorUgel: false,
        monitorEspecialidades: ['Educación para el Trabajo'],
        evaluadoEsDirector: false,
        evaluadoEspecialidades: ['Educación para el Trabajo'],
      });
      cronogramaRepo.create.mockResolvedValue(visitaBase);

      const r = await service.crearVisita(
        {
          monitorId: 'esp-1',
          institucionId: 'ie-1',
          evaluadoId: 'doc-1',
          tipoMonitoreo: 'DOCENTE',
          numeroVisita: 1,
          fechaProgramada: '2099-03-15',
          horaInicio: '09:00:00',
          modalidad: 'CEPTRO',
          nivelEducativo: 'Auxiliar Técnico',
        } as any,
        sesionJefeAreaSecundaria,
      );
      expect(r.id).toBe('vis-1');
    });
  });

  describe('crearVisita - jerarquía de asignación', () => {
    it('rechaza la creación de visitas por parte de un Especialista', async () => {
      await expect(service.crearVisita(visitaBase as any, sesionEspecialista)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.crearVisita(visitaBase as any, sesionEspecialista)).rejects.toThrow(
        /no programan visitas de monitoreo/i,
      );
    });

    it('un Jefe de Área no puede asignar visitas al Jefe de Gestión', async () => {
      cronogramaRepo.findPlanVigentePara.mockResolvedValue('plan-2026');
      cronogramaRepo.validateEntidadesActivas.mockResolvedValue({
        institucion: true,
        monitor: true,
        evaluado: true,
        monitorCargo: CargoNombre.JEFE_GESTION,
        monitorNivel: 'Secundaria',
        monitorEsDirectorUgel: false,
        monitorEspecialidades: [],
        evaluadoEsDirector: false,
        evaluadoEspecialidades: [],
      });

      await expect(
        service.crearVisita(
          {
            ...visitaBase,
            monitorId: 'jefe-gestion-id',
            modalidad: 'EBR',
            nivelEducativo: 'Primaria',
          } as any,
          { id: 'jefe-area-1', role: RoleCode.JEFE_AREA, especialistaNivel: 'Primaria' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('un Jefe de Área no puede asignar a especialistas de otro nivel educativo', async () => {
      cronogramaRepo.findPlanVigentePara.mockResolvedValue('plan-2026');
      cronogramaRepo.validateEntidadesActivas.mockResolvedValue({
        institucion: true,
        monitor: true,
        evaluado: true,
        monitorCargo: CargoNombre.ESPECIALISTA,
        monitorNivel: 'Secundaria',
        monitorEsDirectorUgel: false,
        monitorEspecialidades: [],
        evaluadoEsDirector: false,
        evaluadoEspecialidades: [],
      });

      await expect(
        service.crearVisita(
          {
            ...visitaBase,
            monitorId: 'esp-secundaria-id',
            modalidad: 'EBR',
            nivelEducativo: 'Primaria',
          } as any,
          { id: 'jefe-area-1', role: RoleCode.JEFE_AREA, especialistaNivel: 'Primaria' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  /**
   * Quién monitorea a quién depende del cargo del monitor:
   *  - Especialista: docentes (y directores) de su nivel y área.
   *  - Responsable de Nivel (Jefe de Área): docentes y directores de su nivel.
   *  - Jefe de Gestión: sólo directores de institución.
   *
   * Antes el Responsable de Nivel se rechazaba como monitor («rol no evaluador»)
   * aunque el formulario sí lo ofrecía, y al Jefe de Gestión no se le decía nada.
   */
  describe('crearVisita - quién puede ser monitor según su cargo', () => {
    const visitaPara = (tipoMonitoreo: 'DOCENTE' | 'DIRECTIVO') => ({
      monitorId: 'mon-1',
      institucionId: 'ie-1',
      evaluadoId: 'eval-1',
      tipoMonitoreo,
      numeroVisita: 1,
      fechaProgramada: '2099-03-15',
      horaInicio: '09:00:00',
      modalidad: 'EBR',
      nivelEducativo: 'Primaria',
    });

    const conMonitor = (monitorCargo: string, evaluadoEsDirector: boolean) => {
      cronogramaRepo.findPlanVigentePara.mockResolvedValue('plan-ugel-2026');
      cronogramaRepo.create.mockResolvedValue(visitaBase);
      cronogramaRepo.validateEntidadesActivas.mockResolvedValue({
        institucion: true,
        monitor: true,
        evaluado: true,
        monitorCargo,
        monitorEsDirectorUgel: false,
        monitorEspecialidades: [],
        evaluadoEsDirector,
        evaluadoEspecialidades: [],
      });
    };

    it('acepta a un Responsable de Nivel como monitor de un docente', async () => {
      conMonitor('Jefe de Área', false);

      const r = await service.crearVisita(visitaPara('DOCENTE') as any, sesionJefe);

      expect(r.id).toBe('vis-1');
    });

    it('acepta a un Responsable de Nivel como monitor de un director', async () => {
      conMonitor('Jefe de Área', true);

      const r = await service.crearVisita(visitaPara('DIRECTIVO') as any, sesionJefe);

      expect(r.id).toBe('vis-1');
    });

    it('acepta al Jefe de Gestión como monitor de un director', async () => {
      conMonitor('Jefe de Gestión', true);

      const r = await service.crearVisita(visitaPara('DIRECTIVO') as any, sesionJefe);

      expect(r.id).toBe('vis-1');
    });

    it('acepta a un Especialista como monitor de un director', async () => {
      conMonitor('Especialista', true);

      const r = await service.crearVisita(visitaPara('DIRECTIVO') as any, sesionJefe);

      expect(r.id).toBe('vis-1');
    });

    it('rechaza al Jefe de Gestión como monitor de un docente', async () => {
      conMonitor('Jefe de Gestión', false);

      await expect(service.crearVisita(visitaPara('DOCENTE') as any, sesionJefe)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('el rechazo dice que el Jefe de Gestión sólo monitorea a directores', async () => {
      conMonitor('Jefe de Gestión', false);

      await expect(service.crearVisita(visitaPara('DOCENTE') as any, sesionJefe)).rejects.toThrow(
        /solo monitorea a los directores/i,
      );
    });

    it('un especialista sigue monitoreando a un docente', async () => {
      conMonitor('Especialista', false);

      const r = await service.crearVisita(visitaPara('DOCENTE') as any, sesionJefe);
      expect(r.id).toBe('vis-1');
    });

    it('permite a un Jefe de Área monitorear docentes de su nivel asignado', async () => {
      cronogramaRepo.findPlanVigentePara.mockResolvedValue('plan-2026');
      cronogramaRepo.countPendientesByMonitor.mockResolvedValue(0);
      cronogramaRepo.validateEntidadesActivas.mockResolvedValue({
        institucion: true,
        monitor: true,
        evaluado: true,
        monitorCargo: 'Jefe de Área',
        monitorNivel: 'Primaria',
        monitorEsDirectorUgel: false,
        monitorEspecialidades: [],
        evaluadoEsDirector: false,
        evaluadoEspecialidades: [],
      });
      cronogramaRepo.create.mockResolvedValue(visitaBase);

      const r = await service.crearVisita(
        {
          monitorId: 'jefe-primaria-1',
          institucionId: 'ie-1',
          evaluadoId: 'doc-1',
          tipoMonitoreo: 'DOCENTE',
          numeroVisita: 1,
          fechaProgramada: '2099-03-15',
          horaInicio: '09:00:00',
          modalidad: 'EBR',
          nivelEducativo: 'Primaria',
        } as any,
        sesionJefe,
      );
      expect(r.id).toBe('vis-1');
    });

    it('rechaza si se asigna a Jefe de Área Primaria para visita de Secundaria', async () => {
      cronogramaRepo.findPlanVigentePara.mockResolvedValue('plan-2026');
      cronogramaRepo.countPendientesByMonitor.mockResolvedValue(0);
      cronogramaRepo.validateEntidadesActivas.mockResolvedValue({
        institucion: true,
        monitor: true,
        evaluado: true,
        monitorCargo: 'Jefe de Área',
        monitorNivel: 'Primaria',
        monitorEsDirectorUgel: false,
        monitorEspecialidades: [],
        evaluadoEsDirector: false,
        evaluadoEspecialidades: [],
      });

      await expect(
        service.crearVisita(
          {
            monitorId: 'jefe-primaria-1',
            institucionId: 'ie-1',
            evaluadoId: 'doc-1',
            tipoMonitoreo: 'DOCENTE',
            numeroVisita: 1,
            fechaProgramada: '2099-03-15',
            horaInicio: '09:00:00',
            modalidad: 'EBR',
            nivelEducativo: 'Secundaria',
          } as any,
          sesionJefe,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permite a Jefe de Área Secundaria monitorear docentes de Secundaria sin exigir especialidad de área', async () => {
      cronogramaRepo.findPlanVigentePara.mockResolvedValue('plan-2026');
      cronogramaRepo.countPendientesByMonitor.mockResolvedValue(0);
      cronogramaRepo.validateEntidadesActivas.mockResolvedValue({
        institucion: true,
        monitor: true,
        evaluado: true,
        monitorCargo: 'Jefe de Área',
        monitorNivel: 'Secundaria',
        monitorEsDirectorUgel: false,
        monitorEspecialidades: ['Comunicación'],
        evaluadoEsDirector: false,
        evaluadoEspecialidades: ['Matemática'],
      });
      cronogramaRepo.create.mockResolvedValue(visitaBase);

      const r = await service.crearVisita(
        {
          monitorId: 'jefe-secundaria-1',
          institucionId: 'ie-1',
          evaluadoId: 'doc-1',
          tipoMonitoreo: 'DOCENTE',
          numeroVisita: 1,
          fechaProgramada: '2099-03-15',
          horaInicio: '09:00:00',
          modalidad: 'EBR',
          nivelEducativo: 'Secundaria',
        } as any,
        sesionJefe,
      );
      expect(r.id).toBe('vis-1');
    });
  });

  describe('crearSolicitud', () => {
    it('crea solicitud válida SIN PDF de sustento exitosamente', async () => {
      cronogramaRepo.findById.mockResolvedValue({ ...visitaBase, nivelEducativo: 'Secundaria' });
      solicitudRepo.findPendienteByCronograma.mockResolvedValue(null);
      solicitudRepo.create.mockResolvedValue({ id: 'sol-new' } as any);
      await service.crearSolicitud(
        {
          cronogramaId: 'vis-1',
          fechaPropuesta: '2026-04-01',
          horaPropuesta: '10:00:00',
          justificacion: 'Huelga distrital sin PDF',
        },
        sesionEspecialista,
      );
      expect(storage.savePdf).not.toHaveBeenCalled();
      expect(solicitudRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ archivoSustentoUrl: '' }),
      );
    });

    it('rechaza si ya existe una solicitud PENDIENTE', async () => {
      cronogramaRepo.findById.mockResolvedValue({ ...visitaBase, nivelEducativo: 'Secundaria' });
      solicitudRepo.findPendienteByCronograma.mockResolvedValue({ id: 'sol-pend' } as any);
      await expect(
        service.crearSolicitud(
          {
            cronogramaId: 'vis-1',
            fechaPropuesta: '2026-04-01',
            horaPropuesta: '10:00:00',
            justificacion: 'Huelga',
          } as any,
          sesionEspecialista,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('permite solicitud si es para nivel Inicial o Primaria', async () => {
      cronogramaRepo.findById.mockResolvedValue({ ...visitaBase, nivelEducativo: 'Primaria' });
      solicitudRepo.findPendienteByCronograma.mockResolvedValue(null);
      solicitudRepo.create.mockResolvedValue({ id: 'sol-new' } as any);
      const res = await service.crearSolicitud(
        {
          cronogramaId: 'vis-1',
          fechaPropuesta: '2026-04-01',
          horaPropuesta: '10:00:00',
          justificacion: 'Huelga distrital nivel primaria',
        },
        sesionEspecialista,
      );
      expect(res.id).toBe('sol-new');
      expect(solicitudRepo.create).toHaveBeenCalled();
    });

    it('crea solicitud valida con PDF y lo guarda', async () => {
      cronogramaRepo.findById.mockResolvedValue({ ...visitaBase, nivelEducativo: 'Secundaria' });
      solicitudRepo.findPendienteByCronograma.mockResolvedValue(null);
      solicitudRepo.create.mockResolvedValue({ id: 'sol-new' } as any);
      await service.crearSolicitud(
        {
          cronogramaId: 'vis-1',
          fechaPropuesta: '2026-04-01',
          horaPropuesta: '10:00:00',
          justificacion: 'Huelga distrital programada',
          archivoSustentoBase64: Buffer.from('PDF').toString('base64'),
          archivoSustentoNombre: 'oficio.pdf',
        },
        sesionEspecialista,
      );
      expect(storage.savePdf).toHaveBeenCalledWith(
        'reprogramaciones',
        'oficio.pdf',
        expect.any(Buffer),
      );
      expect(solicitudRepo.create).toHaveBeenCalled();
    });
  });

  describe('aprobarSolicitud - mutacion sincrona del cronograma (ESP-0054A)', () => {
    const solicitudPendiente = {
      id: 'sol-1',
      cronogramaId: 'vis-1',
      solicitanteId: 'esp-1',
      solicitanteRolAlCrear: 'especialista',
      fechaOriginal: '2099-03-15',
      horaOriginal: '09:00:00',
      fechaPropuesta: '2026-04-01',
      horaPropuesta: '10:00:00',
      justificacion: 'Huelga',
      archivoSustentoUrl: '/uploads/reprog/x.pdf',
      estado: 'PENDIENTE' as const,
      resueltoPorId: null,
      comentarioResolucion: null,
      fechaResolucion: null,
      createdAt: '2026-01-01T00:00:00Z',
    };

    it('rechaza si no es autoridad (Jefe Gestion / Director IE)', async () => {
      solicitudRepo.findById.mockResolvedValue(solicitudPendiente);
      await expect(
        service.aprobarSolicitud('sol-1', { comentario: 'OK' } as any, sesionEspecialista),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza si la solicitud ya no esta PENDIENTE', async () => {
      solicitudRepo.findById.mockResolvedValue({
        ...solicitudPendiente,
        estado: 'APROBADO' as const,
      });
      await expect(
        service.aprobarSolicitud('sol-1', { comentario: 'OK' } as any, sesionJefe),
      ).rejects.toThrow(BadRequestException);
    });

    it('al aprobar, muta el cronograma con la nueva fecha/hora', async () => {
      solicitudRepo.findById.mockResolvedValue(solicitudPendiente);
      solicitudRepo.resolver.mockResolvedValue({
        ...solicitudPendiente,
        estado: 'APROBADO' as const,
      });
      cronogramaRepo.update.mockResolvedValue({
        ...visitaBase,
        estado: 'REPROGRAMADO' as const,
      });

      const r = await service.aprobarSolicitud('sol-1', { comentario: 'Aprobado' }, sesionJefe);
      expect(cronogramaRepo.applyReprogramacion).toHaveBeenCalledWith(
        'vis-1',
        new Date('2026-04-01'),
        '10:00:00',
      );
      expect(r.estado).toBe('APROBADO');
    });
  });

  describe('rechazarSolicitud - no muta cronograma', () => {
    const solicitudPendiente = {
      id: 'sol-1',
      cronogramaId: 'vis-1',
      estado: 'PENDIENTE' as const,
      fechaOriginal: '2099-03-15',
      horaOriginal: '09:00:00',
      fechaPropuesta: '2026-04-01',
      horaPropuesta: '10:00:00',
      justificacion: 'X',
      archivoSustentoUrl: '/uploads/reprog/x.pdf',
      solicitanteId: 'e1',
      solicitanteRolAlCrear: 'especialista',
      resueltoPorId: null,
      comentarioResolucion: null,
      fechaResolucion: null,
      createdAt: '2026-01-01T00:00:00Z',
    } as any;

    it('rechaza pero NO modifica el cronograma', async () => {
      solicitudRepo.findById.mockResolvedValue(solicitudPendiente);
      solicitudRepo.resolver.mockResolvedValue({
        ...solicitudPendiente,
        estado: 'RECHAZADO' as const,
      });
      await service.rechazarSolicitud('sol-1', { comentario: 'No procede' }, sesionJefe);
      expect(cronogramaRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('scoping por rol', () => {
    it('Director IE solo ve visitas de su institucion', async () => {
      cronogramaRepo.findAll.mockResolvedValue([
        visitaBase,
        { ...visitaBase, id: 'vis-otra', institucionId: 'ie-2' },
      ]);
      const r = await service.findAllVisitas({}, sesionDirector);
      expect(r).toHaveLength(1);
      expect(r[0].institucionId).toBe('ie-1');
    });

    it('Jefe de Gestion ve todas las visitas', async () => {
      cronogramaRepo.findAll.mockResolvedValue([
        visitaBase,
        { ...visitaBase, id: 'vis-otra', institucionId: 'ie-2' },
      ]);
      const r = await service.findAllVisitas({}, sesionJefe);
      expect(r).toHaveLength(2);
    });

    it('Director IE no puede ver visita de otra institucion', async () => {
      cronogramaRepo.findById.mockResolvedValue({
        ...visitaBase,
        institucionId: 'ie-2',
      });
      await expect(service.findVisitaById('vis-1', sesionDirector)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('actualizarVisita - cambio de fecha/hora directo', () => {
    it('rechaza cambio directo de fecha/hora (solo via solicitud)', async () => {
      await expect(
        service.actualizarVisita('vis-1', { fechaProgramada: '2026-05-01' } as any, sesionJefe),
      ).rejects.toThrow(BadRequestException);
    });

    it('permite cambio de estado sin tocar fecha/hora', async () => {
      await service.actualizarVisita('vis-1', { estado: 'EN_PROCESO' }, sesionJefe);
      expect(cronogramaRepo.update).toHaveBeenCalledWith('vis-1', {
        detalles: undefined,
        estado: 'EN_PROCESO',
      });
    });
  });

  describe('ejecutarAccionExcepcional', () => {
    it('ejecuta accion y emite evento cronograma.accion_excepcional', async () => {
      const mockOp = {
        id: 'op-1',
        cronogramaId: 'vis-1',
        tipoAccion: 'ANULACION_TOTAL' as const,
        numeroExpediente: 'EXP-123',
        motivo: 'Motivo explicativo mayor a diez caracteres',
        archivoSustentoUrl: '/storage/sustento.pdf',
        ejecutadoPorId: 'user-jefe',
        createdAt: '2026-05-01T10:00:00Z',
      };
      cronogramaRepo.findById.mockResolvedValue(visitaBase);
      (cronogramaRepo.ejecutarAccionExcepcional as any).mockResolvedValue(mockOp);

      const res = await service.ejecutarAccionExcepcional(
        'vis-1',
        {
          tipoAccion: 'ANULACION_TOTAL',
          numeroExpediente: 'EXP-123',
          motivo: 'Motivo explicativo mayor a diez caracteres',
          archivoSustentoBase64: 'QUJD',
        },
        sesionJefe,
      );

      expect(res).toEqual(mockOp);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'cronograma.accion_excepcional',
        expect.objectContaining({
          cronogramaId: 'vis-1',
          tipoAccion: 'ANULACION_TOTAL',
        }),
      );
    });

    it('obtiene la operacion excepcional por cronograma', async () => {
      const mockOp = {
        id: 'op-1',
        cronogramaId: 'vis-1',
        tipoAccion: 'ANULACION_TOTAL' as const,
        numeroExpediente: 'EXP-123',
        motivo: 'Motivo explicativo',
        archivoSustentoUrl: '/storage/sustento.pdf',
        ejecutadoPorId: 'user-jefe',
        createdAt: '2026-05-01T10:00:00Z',
      };
      cronogramaRepo.findById.mockResolvedValue(visitaBase);
      (cronogramaRepo.findOperacionExcepcionalByCronograma as any).mockResolvedValue(mockOp);

      const res = await service.findOperacionExcepcionalByCronograma('vis-1', sesionJefe);
      expect(res).toEqual(mockOp);
    });
  });
});
