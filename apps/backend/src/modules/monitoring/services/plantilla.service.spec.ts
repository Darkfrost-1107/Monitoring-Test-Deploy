import { RoleCode } from '../../../common/enums/role.enum.js';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PlantillaService } from './plantilla.service.js';
import { PlantillaRepository } from '../repositories/plantilla.repository.js';

describe('PlantillaService - ILA-0046', () => {
  let service: PlantillaService;
  let repo: jest.Mocked<PlantillaRepository>;

  const plantillaVigente = {
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
    ejesItems: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lema: null,
  };

  const plantillaHistorica = {
    ...plantillaVigente,
    estado: 'Historico' as const,
  };

  const sesionJefe = { id: 'user-jefe', role: RoleCode.JEFE_GESTION };
  const sesionDirector = {
    id: 'user-dir',
    role: RoleCode.DIRECTOR_INSTITUCION,
    institucionId: 'ie-1',
  };

  beforeEach(async () => {
    const mockRepo: Partial<jest.Mocked<PlantillaRepository>> = {
      findById: jest.fn<any>(),
      findAll: jest.fn<any>(),
      countFichasAsociadas: jest.fn<any>(),
      create: jest.fn<any>(),
      updateInPlace: jest.fn<any>(),
      versionarConClon: jest.fn<any>(),
      updateEstado: jest.fn<any>(),
      activarArchivando: jest.fn<any>(),
      clone: jest.fn<any>(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [PlantillaService, { provide: PlantillaRepository, useValue: mockRepo }],
    }).compile();
    service = moduleRef.get(PlantillaService);
    repo = moduleRef.get(PlantillaRepository);
  });

  describe('validarReglas (create)', () => {
    it('rechaza si no hay exactamente 4 niveles', async () => {
      const dto: any = {
        tipoMonitoreo: 'DOCENTE',
        anioAcademico: 2026,
        baremo: 'Vigente',
        niveles: [
          { nivelRomano: 'I', denominacion: 'A', rangoMin: 0, color: '#000000', orden: 1 },
          { nivelRomano: 'II', denominacion: 'B', rangoMin: 5, color: '#000000', orden: 2 },
        ],
        desempenos: [
          {
            id: 'd1',
            nombre: 'D1',
            descripcionCorta: '',
            orden: 1,
            aspectos: [{ id: 'a1', descripcion: 'X', orden: 1 }],
            rubrica: [
              { nivelRomano: 'I', descripcion: '' },
              { nivelRomano: 'II', descripcion: '' },
              { nivelRomano: 'III', descripcion: '' },
              { nivelRomano: 'IV', descripcion: '' },
            ],
          },
        ],
      };
      await expect(service.create(dto, sesionJefe)).rejects.toThrow(BadRequestException);
    });

    it('rechaza si un desempeno no tiene 4 entradas de rubrica', async () => {
      const dto: any = {
        tipoMonitoreo: 'DOCENTE',
        anioAcademico: 2026,
        baremo: 'Vigente',
        niveles: [
          { nivelRomano: 'I', denominacion: 'A', rangoMin: 0, color: '#000000', orden: 1 },
          { nivelRomano: 'II', denominacion: 'B', rangoMin: 5, color: '#000000', orden: 2 },
          { nivelRomano: 'III', denominacion: 'C', rangoMin: 10, color: '#000000', orden: 3 },
          { nivelRomano: 'IV', denominacion: 'D', rangoMin: 15, color: '#000000', orden: 4 },
        ],
        desempenos: [
          {
            id: 'd1',
            nombre: 'D1',
            descripcionCorta: '',
            orden: 1,
            aspectos: [{ id: 'a1', descripcion: 'X', orden: 1 }],
            rubrica: [
              { nivelRomano: 'I', descripcion: '' },
              { nivelRomano: 'II', descripcion: '' },
            ],
          },
        ],
      };
      await expect(service.create(dto, sesionJefe)).rejects.toThrow(BadRequestException);
    });

    /**
     * La Ficha Docente EIB es una lista de cotejo de tres valores: No,
     * Parcialmente, Sí. Antes acá se exigían cuatro niveles para todos los
     * instrumentos, así que la plantilla EIB sólo pasaba agregando un cuarto
     * nivel inventado y una entrada de rúbrica que duplicaba «Sí». La cantidad
     * ahora la declara `VALORACIONES_POR_TIPO` en el contrato compartido.
     */
    const dtoEib = (
      niveles: { nivelRomano: string }[],
      rubrica: { nivelRomano: string }[],
    ): any => ({
      tipoMonitoreo: 'DOCENTE_EIB',
      anioAcademico: new Date().getFullYear(),
      baremo: 'Porcentual',
      niveles: niveles.map((n, i) => ({
        ...n,
        denominacion: `N${i + 1}`,
        rangoMin: i * 50,
        color: '#000000',
        orden: i + 1,
      })),
      desempenos: [
        {
          id: 'd1',
          nombre: 'D1',
          descripcionCorta: '',
          orden: 1,
          aspectos: [{ id: 'a1', descripcion: 'X', orden: 1 }],
          rubrica: rubrica.map((r) => ({ ...r, descripcion: '' })),
        },
      ],
    });

    const TRES = [{ nivelRomano: 'I' }, { nivelRomano: 'II' }, { nivelRomano: 'III' }];
    const CUATRO = [...TRES, { nivelRomano: 'IV' }];

    it('acepta una plantilla EIB con tres niveles', async () => {
      repo.create.mockResolvedValue({
        ...plantillaVigente,
        id: 'plantilla-eib',
        tipoMonitoreo: 'DOCENTE_EIB' as const,
        baremo: 'Porcentual' as const,
      });

      await expect(service.create(dtoEib(TRES, TRES), sesionJefe)).resolves.toBeDefined();
    });

    it('rechaza una plantilla EIB con un cuarto nivel', async () => {
      await expect(service.create(dtoEib(CUATRO, CUATRO), sesionJefe)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rechaza una rubrica EIB con una cuarta entrada', async () => {
      await expect(service.create(dtoEib(TRES, CUATRO), sesionJefe)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update (regla ILA-0046)', () => {
    const dtoUpdate: any = { baremo: 'Porcentual' };

    it('hace IN_PLACE si NO tiene fichas asociadas', async () => {
      repo.findById.mockResolvedValue(plantillaVigente);
      repo.countFichasAsociadas.mockResolvedValue(0);
      repo.updateInPlace.mockResolvedValue({
        ...plantillaVigente,
        baremo: 'Porcentual',
      });

      const r = await service.update('plantilla-v1', dtoUpdate, sesionJefe);
      expect(r.modo).toBe('IN_PLACE');
      expect(r.version).toBe(1);
      expect(repo.updateInPlace).toHaveBeenCalledWith('plantilla-v1', { data: dtoUpdate });
      expect(repo.versionarConClon).not.toHaveBeenCalled();
    });

    it('hace VERSIONADO si tiene fichas asociadas', async () => {
      repo.findById.mockResolvedValue(plantillaVigente);
      repo.countFichasAsociadas.mockResolvedValue(5);
      const clonV2 = {
        ...plantillaVigente,
        id: 'plantilla-v2',
        version: 2,
        estado: 'Borrador' as const,
      };
      repo.versionarConClon.mockResolvedValue(clonV2);

      const r = await service.update('plantilla-v1', dtoUpdate, sesionJefe);
      expect(r.modo).toBe('VERSIONADO');
      expect(r.version).toBe(2);
      expect(r.id).toBe('plantilla-v2');
      expect(r.mensaje).toContain('5 ficha');
      expect(repo.versionarConClon).toHaveBeenCalledWith(
        'plantilla-v1',
        { data: dtoUpdate },
        'user-jefe',
      );
      expect(repo.updateInPlace).not.toHaveBeenCalled();
    });

    it('lanza NotFound si la plantilla no existe', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.update('no-existe', dtoUpdate, sesionJefe)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cambiarEstado (maquina de estados)', () => {
    it('rechaza transicion desde Historico', async () => {
      repo.findById.mockResolvedValue(plantillaHistorica);
      await expect(
        service.cambiarEstado('plantilla-v1', { estado: 'Borrador' }, sesionJefe),
      ).rejects.toThrow(BadRequestException);
    });

    /**
     * Activar una plantilla archiva a la que estaba vigente.
     *
     * Antes se rechazaba con un 409 que exigía archivarla a mano: dos pasos para
     * una sola intención —«esta es la que rige ahora»— y un error que no decía
     * cuál era el paso que faltaba.
     */
    it('archiva la vigente anterior en vez de rechazar', async () => {
      repo.findById.mockResolvedValue({ ...plantillaVigente, estado: 'Borrador' });
      repo.findAll.mockResolvedValue([{ ...plantillaVigente, id: 'otra-vigente' }]);
      repo.activarArchivando.mockResolvedValue(plantillaVigente);

      const r = await service.cambiarEstado('plantilla-v1', { estado: 'Vigente' }, sesionJefe);

      expect(repo.activarArchivando).toHaveBeenCalledWith('plantilla-v1', ['otra-vigente']);
      expect(r.estado).toBe('Vigente');
    });

    it('el relevo es una sola operación, no dos escrituras sueltas', async () => {
      repo.findById.mockResolvedValue({ ...plantillaVigente, estado: 'Borrador' });
      repo.findAll.mockResolvedValue([{ ...plantillaVigente, id: 'otra-vigente' }]);
      repo.activarArchivando.mockResolvedValue(plantillaVigente);

      await service.cambiarEstado('plantilla-v1', { estado: 'Vigente' }, sesionJefe);

      // Si se archivara por un lado y se activara por el otro, un fallo entre
      // ambas dejaría al año sin ninguna plantilla vigente.
      expect(repo.updateEstado).not.toHaveBeenCalled();
    });

    it('archiva todas las vigentes que hubiera, no sólo la primera', async () => {
      repo.findById.mockResolvedValue({ ...plantillaVigente, estado: 'Borrador' });
      repo.findAll.mockResolvedValue([
        { ...plantillaVigente, id: 'otra-vigente' },
        { ...plantillaVigente, id: 'tercera-vigente' },
      ]);
      repo.activarArchivando.mockResolvedValue(plantillaVigente);

      await service.cambiarEstado('plantilla-v1', { estado: 'Vigente' }, sesionJefe);

      expect(repo.activarArchivando).toHaveBeenCalledWith('plantilla-v1', [
        'otra-vigente',
        'tercera-vigente',
      ]);
    });

    it('permite promover a Vigente si no hay otra', async () => {
      repo.findById.mockResolvedValue({
        ...plantillaVigente,
        estado: 'Borrador',
      });
      repo.findAll.mockResolvedValue([]);
      repo.updateEstado.mockResolvedValue(plantillaVigente);
      const r = await service.cambiarEstado('plantilla-v1', { estado: 'Vigente' }, sesionJefe);
      expect(r.estado).toBe('Vigente');
    });

    it('no hace nada si el estado ya es el mismo', async () => {
      repo.findById.mockResolvedValue(plantillaVigente);
      const r = await service.cambiarEstado('plantilla-v1', { estado: 'Vigente' }, sesionJefe);
      expect(r.estado).toBe('Vigente');
      expect(repo.updateEstado).not.toHaveBeenCalled();
    });
  });

  describe('scoping por rol (modificacion)', () => {
    it('Director IE no puede modificar plantilla UGEL', async () => {
      repo.findById.mockResolvedValue(plantillaVigente);
      await expect(
        service.update('plantilla-v1', { baremo: 'Vigente' }, sesionDirector),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Director IE puede VER plantilla UGEL (no modifica)', async () => {
      repo.findById.mockResolvedValue(plantillaVigente);
      const p = await service.findById('plantilla-v1', sesionDirector);
      expect(p.id).toBe('plantilla-v1');
    });
  });

  describe('duplicar', () => {
    it('rechaza si no es Director IE o Jefe de Gestion', async () => {
      repo.findById.mockResolvedValue(plantillaVigente);
      const sesionEspecialista = { id: 'user-esp', role: RoleCode.ESPECIALISTA };
      await expect(service.duplicar('plantilla-v1', sesionEspecialista)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rechaza si Director IE no tiene institucionId', async () => {
      repo.findById.mockResolvedValue(plantillaVigente);
      await expect(
        service.duplicar('plantilla-v1', { id: 'd1', role: RoleCode.DIRECTOR_INSTITUCION }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('clona plantilla UGEL como Director IE con institucionId', async () => {
      const clon = { ...plantillaVigente, id: 'clon-1', institucionId: 'ie-1' };
      repo.findById.mockResolvedValue(plantillaVigente);
      repo.clone.mockResolvedValue(clon);
      const r = await service.duplicar('plantilla-v1', sesionDirector);
      expect(r.id).toBe('clon-1');
      // Sin anioAcademico explicito, duplicar() usa el año académico actual.
      expect(repo.clone).toHaveBeenCalledWith(
        'plantilla-v1',
        'user-dir',
        'director_ie',
        'ie-1',
        undefined,
        new Date().getFullYear(),
      );
    });
  });
});
