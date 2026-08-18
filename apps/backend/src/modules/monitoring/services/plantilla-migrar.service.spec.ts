import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PlantillaService } from './plantilla.service.js';
import { PrerrequisitosDirectorService } from './prerrequisitos-director.service.js';
import { PlantillaRepository } from '../repositories/plantilla.repository.js';
import { RoleCode } from '../../../common/enums/role.enum.js';

describe('PlantillaService - ILA-0046 Versionado', () => {
  let service: PlantillaService;
  let repo: jest.Mocked<PlantillaRepository>;

  const basePlantilla = {
    id: 'plantilla-v1',
    tipoMonitoreo: 'DOCENTE' as const,
    anioAcademico: 2026,
    version: 1,
    baremo: 'Vigente' as const,
    descripcion: 'Plantilla oficial',
    estado: 'Vigente' as const,
    autorId: 'user-jefe',
    rolAutorAlCrear: 'jefe_gestion' as const,
    institucionId: null,
    niveles: [],
    desempenos: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PlantillaService,
        {
          provide: PrerrequisitosDirectorService,
          useValue: { asegurar: jest.fn<any>().mockResolvedValue(undefined) },
        },
        {
          provide: PlantillaRepository,
          useValue: {
            findById: jest.fn<any>(),
            findAll: jest.fn<any>(),
            countFichasAsociadas: jest.fn<any>(),
            create: jest.fn<any>(),
            updateInPlace: jest.fn<any>(),
            versionarConClon: jest.fn<any>(),
            updateEstado: jest.fn<any>(),
            clone: jest.fn<any>(),
          },
        },
      ],
    }).compile();

    service = module.get(PlantillaService);
    repo = module.get(PlantillaRepository);
  });

  describe('cambiarEstado (Borrador -> Vigente)', () => {
    it('debe transicionar Borrador a Vigente', async () => {
      const borrador = { ...basePlantilla, estado: 'Borrador' as const };
      repo.findById = jest.fn<any>().mockResolvedValue(borrador);
      repo.findAll = jest.fn<any>().mockResolvedValue([]);
      repo.updateEstado = jest
        .fn<any>()
        .mockResolvedValue({ ...borrador, estado: 'Vigente' as const });

      const result = await service.cambiarEstado(
        'plantilla-v1',
        { estado: 'Vigente' },
        { id: 'admin', role: 'admin' as RoleCode },
      );

      expect(result.estado).toBe('Vigente');
      expect(repo.updateEstado).toHaveBeenCalledWith('plantilla-v1', 'Vigente');
    });

    it('debe fallar con NotFoundException si la plantilla no existe', async () => {
      repo.findById = jest.fn<any>().mockResolvedValue(null);

      await expect(
        service.cambiarEstado(
          'plantilla-inexistente',
          { estado: 'Vigente' },
          { id: 'admin', role: 'admin' as RoleCode },
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe fallar con BadRequest si la plantilla ya es Historico', async () => {
      const historico = { ...basePlantilla, estado: 'Historico' as const };
      repo.findById = jest.fn<any>().mockResolvedValue(historico);

      await expect(
        service.cambiarEstado(
          'plantilla-v1',
          { estado: 'Vigente' },
          { id: 'admin', role: 'admin' as RoleCode },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    /**
     * Sigue habiendo una sola plantilla Vigente por (tipo, año, autor, IE). Lo
     * que cambió es quién hace cumplir la regla: antes se rechazaba con un 409
     * que exigía archivar la anterior a mano; ahora la activación la releva.
     */
    it('archiva la vigente anterior al activar la nueva', async () => {
      const borrador = { ...basePlantilla, estado: 'Borrador' as const };
      const otraVigente = { ...basePlantilla, id: 'otra-vigente', estado: 'Vigente' as const };
      repo.findById = jest.fn<any>().mockResolvedValue(borrador);
      repo.findAll = jest.fn<any>().mockResolvedValue([basePlantilla, otraVigente]);
      repo.activarArchivando = jest
        .fn<any>()
        .mockResolvedValue({ ...basePlantilla, estado: 'Vigente' });

      const r = await service.cambiarEstado(
        'plantilla-v1',
        { estado: 'Vigente' },
        { id: 'admin', role: 'admin' as RoleCode },
      );

      expect(repo.activarArchivando).toHaveBeenCalledWith('plantilla-v1', ['otra-vigente']);
      expect(r.estado).toBe('Vigente');
    });

    it('debe ser idempotente: si el estado es el mismo, retorna sin error', async () => {
      repo.findById = jest.fn<any>().mockResolvedValue(basePlantilla);

      const result = await service.cambiarEstado(
        'plantilla-v1',
        { estado: 'Vigente' },
        { id: 'admin', role: 'admin' as RoleCode },
      );

      expect(result).toBe(basePlantilla);
      expect(repo.updateEstado).not.toHaveBeenCalled();
    });
  });

  describe('update (versionado por fichas asociadas)', () => {
    it('debe versionar (clonar a v+1) si la plantilla tiene fichas asociadas', async () => {
      const clon = { ...basePlantilla, id: 'plantilla-v2', version: 2 };
      repo.findById = jest.fn<any>().mockResolvedValue(basePlantilla);
      repo.countFichasAsociadas = jest.fn<any>().mockResolvedValue(3);
      repo.versionarConClon = jest.fn<any>().mockResolvedValue(clon);

      const result = await service.update(
        'plantilla-v1',
        { descripcion: 'cambiada' },
        { id: 'admin', role: 'admin' as RoleCode },
      );

      expect(result.modo).toBe('VERSIONADO');
      expect(result.version).toBe(2);
      expect(result.mensaje).toContain('3 ficha(s)');
      expect(repo.updateInPlace).not.toHaveBeenCalled();
    });

    it('debe hacer updateInPlace si NO tiene fichas asociadas', async () => {
      repo.findById = jest.fn<any>().mockResolvedValue(basePlantilla);
      repo.countFichasAsociadas = jest.fn<any>().mockResolvedValue(0);
      repo.updateInPlace = jest
        .fn<any>()
        .mockResolvedValue({ ...basePlantilla, descripcion: 'actualizada' });

      const result = await service.update(
        'plantilla-v1',
        { descripcion: 'actualizada' },
        { id: 'admin', role: 'admin' as RoleCode },
      );

      expect(result.modo).toBe('IN_PLACE');
      expect(result.plantilla.descripcion).toBe('actualizada');
      expect(repo.versionarConClon).not.toHaveBeenCalled();
    });

    it('debe fallar con NotFound si la plantilla no existe', async () => {
      repo.findById = jest.fn<any>().mockResolvedValue(null);

      await expect(
        service.update(
          'plantilla-inexistente',
          { descripcion: 'x' },
          { id: 'admin', role: 'admin' as RoleCode },
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
