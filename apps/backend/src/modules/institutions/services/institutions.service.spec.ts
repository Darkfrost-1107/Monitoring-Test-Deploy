import { RoleCode } from '../../../common/enums/role.enum.js';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { InstitutionsService } from './institutions.service.js';
import { InstitutionsRepository } from '../repositories/institutions.repository.js';
import { CreateInstitucionDto } from '../dto/create-institucion.dto.js';
import { UpdateInstitucionDto } from '../dto/update-institucion.dto.js';
import { QueryInstitucionDto } from '../dto/query-institucion.dto.js';
import { Institucion } from '../entities/institucion.entity.js';

describe('InstitutionsService', () => {
  let service: InstitutionsService;
  let findByIdMock: jest.Mock<(id: string) => Promise<Institucion | null>>;
  let findByCodigoModularMock: jest.Mock<(code: string) => Promise<Institucion | null>>;
  let createMock: jest.Mock<(data: any) => Promise<Institucion>>;
  let updateMock: jest.Mock<(id: string, data: any) => Promise<Institucion>>;
  let softDeleteMock: jest.Mock<(id: string) => Promise<Institucion>>;
  let restoreMock: jest.Mock<(id: string) => Promise<Institucion>>;
  let findAllMock: jest.Mock<(query: any) => Promise<{ data: Institucion[]; total: number }>>;

  beforeEach(async () => {
    findByIdMock = jest.fn<any>();
    findByCodigoModularMock = jest.fn<any>();
    createMock = jest.fn<any>();
    updateMock = jest.fn<any>();
    softDeleteMock = jest.fn<any>();
    restoreMock = jest.fn<any>();
    findAllMock = jest.fn<any>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstitutionsService,
        {
          provide: InstitutionsRepository,
          useValue: {
            findById: findByIdMock,
            findByCodigoModular: findByCodigoModularMock,
            create: createMock,
            update: updateMock,
            softDelete: softDeleteMock,
            restore: restoreMock,
            findAll: findAllMock,
          },
        },
      ],
    }).compile();

    service = module.get<InstitutionsService>(InstitutionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = new CreateInstitucionDto();
    dto.codigoModular = '1234567';
    dto.codigoLocal = '12345678';
    dto.nombre = 'Test IE';

    it('should create institution if codigoModular is unique', async () => {
      findByCodigoModularMock.mockResolvedValue(null);
      const mockResult = { id: 'ie-uuid', ...dto } as unknown as Institucion;
      createMock.mockResolvedValue(mockResult);

      const result = await service.create(dto);
      expect(result).toBeDefined();
      expect(result.id).toBe('ie-uuid');
      expect(createMock).toHaveBeenCalledWith(dto);
    });

    it('should throw ConflictException if codigoModular already exists', async () => {
      findByCodigoModularMock.mockResolvedValue({
        id: 'ie-uuid',
        codigoModular: '1234567',
      } as Institucion);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(createMock).not.toHaveBeenCalled();
    });

    describe('Jefe de Área constraints', () => {
      it('should allow Jefe de Área with level Inicial to create EBR Inicial', async () => {
        const user = { role: RoleCode.JEFE_AREA, especialista_nivel: 'Inicial' } as any;
        const initialDto = {
          ...dto,
          modalidad: 'EBR',
          nivelEducativo: 'Inicial',
        } as CreateInstitucionDto;
        findByCodigoModularMock.mockResolvedValue(null);
        createMock.mockResolvedValue({ id: 'ie-uuid', ...initialDto } as unknown as Institucion);

        const result = await service.create(initialDto, user);
        expect(result).toBeDefined();
        expect(createMock).toHaveBeenCalledWith(initialDto);
      });

      it('should allow Jefe de Área with level Inicial to create EBE CEBE', async () => {
        const user = { role: RoleCode.JEFE_AREA, especialista_nivel: 'Inicial' } as any;
        const ebeDto = { ...dto, modalidad: 'EBE', nivelEducativo: 'CEBE' } as CreateInstitucionDto;
        findByCodigoModularMock.mockResolvedValue(null);
        createMock.mockResolvedValue({ id: 'ie-uuid', ...ebeDto } as unknown as Institucion);

        const result = await service.create(ebeDto, user);
        expect(result).toBeDefined();
      });

      it('should block Jefe de Área with level Inicial from creating EBR Primaria', async () => {
        const user = { role: RoleCode.JEFE_AREA, especialista_nivel: 'Inicial' } as any;
        const invalidDto = {
          ...dto,
          modalidad: 'EBR',
          nivelEducativo: 'Primaria',
        } as CreateInstitucionDto;

        await expect(service.create(invalidDto, user)).rejects.toThrow(
          'Un Responsable de Nivel de nivel Inicial solo puede crear instituciones de nivel Inicial (EBR) o de la modalidad Especial (EBE).',
        );
      });

      it('should allow Jefe de Área with level Primaria to create EBR Primaria', async () => {
        const user = { role: RoleCode.JEFE_AREA, especialista_nivel: 'Primaria' } as any;
        const primDto = {
          ...dto,
          modalidad: 'EBR',
          nivelEducativo: 'Primaria',
        } as CreateInstitucionDto;
        findByCodigoModularMock.mockResolvedValue(null);
        createMock.mockResolvedValue({ id: 'ie-uuid', ...primDto } as unknown as Institucion);

        const result = await service.create(primDto, user);
        expect(result).toBeDefined();
      });

      it('should block Jefe de Área with level Primaria from creating EBR Secundaria', async () => {
        const user = { role: RoleCode.JEFE_AREA, especialista_nivel: 'Primaria' } as any;
        const invalidDto = {
          ...dto,
          modalidad: 'EBR',
          nivelEducativo: 'Secundaria',
        } as CreateInstitucionDto;

        await expect(service.create(invalidDto, user)).rejects.toThrow(
          'Un Responsable de Nivel de nivel Primaria solo puede crear instituciones de nivel Primaria (EBR).',
        );
      });

      it('should allow Jefe de Área with level Secundaria to create EBR Secundaria', async () => {
        const user = { role: RoleCode.JEFE_AREA, especialista_nivel: 'Secundaria' } as any;
        const secDto = {
          ...dto,
          modalidad: 'EBR',
          nivelEducativo: 'Secundaria',
        } as CreateInstitucionDto;
        findByCodigoModularMock.mockResolvedValue(null);
        createMock.mockResolvedValue({ id: 'ie-uuid', ...secDto } as unknown as Institucion);

        const result = await service.create(secDto, user);
        expect(result).toBeDefined();
      });

      it('should allow Jefe de Área with level Secundaria to create CEPTRO', async () => {
        const user = { role: RoleCode.JEFE_AREA, especialista_nivel: 'Secundaria' } as any;
        const ceptroDto = {
          ...dto,
          modalidad: 'CEPTRO',
          nivelEducativo: 'Corte y Ensamblaje',
        } as CreateInstitucionDto;
        findByCodigoModularMock.mockResolvedValue(null);
        createMock.mockResolvedValue({ id: 'ie-uuid', ...ceptroDto } as unknown as Institucion);

        const result = await service.create(ceptroDto, user);
        expect(result).toBeDefined();
      });

      it('should block Jefe de Área with level Secundaria from creating EBR Primaria', async () => {
        const user = { role: RoleCode.JEFE_AREA, especialista_nivel: 'Secundaria' } as any;
        const invalidDto = {
          ...dto,
          modalidad: 'EBR',
          nivelEducativo: 'Primaria',
        } as CreateInstitucionDto;

        await expect(service.create(invalidDto, user)).rejects.toThrow(
          'Un Responsable de Nivel de nivel Secundaria solo puede crear instituciones de nivel Secundaria (EBR), Alternativa (EBA) o CEPTRO.',
        );
      });
    });
  });

  describe('findById', () => {
    it('should return record if it exists', async () => {
      const mockRecord = { id: 'ie-uuid', nombre: 'Test IE' } as Institucion;
      findByIdMock.mockResolvedValue(mockRecord);

      const result = await service.findById('ie-uuid');
      expect(result).toBeDefined();
      expect(result.id).toBe('ie-uuid');
    });

    it('should throw NotFoundException if it does not exist', async () => {
      findByIdMock.mockResolvedValue(null);

      await expect(service.findById('ie-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const dto = new UpdateInstitucionDto();
    dto.nombre = 'Updated IE Name';

    it('should update and return record if it exists', async () => {
      const mockRecord = { id: 'ie-uuid', nombre: 'Test IE' } as Institucion;
      findByIdMock.mockResolvedValue(mockRecord);
      updateMock.mockResolvedValue({ id: 'ie-uuid', nombre: 'Updated IE Name' } as Institucion);

      const result = await service.update('ie-uuid', dto);
      expect(result).toBeDefined();
      expect(result.nombre).toBe('Updated IE Name');
      expect(updateMock).toHaveBeenCalledWith('ie-uuid', dto);
    });

    it('should throw NotFoundException on update if record not found', async () => {
      findByIdMock.mockResolvedValue(null);

      await expect(service.update('ie-uuid', dto)).rejects.toThrow(NotFoundException);
      expect(updateMock).not.toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    it('should soft delete and return record if it exists', async () => {
      const mockRecord = { id: 'ie-uuid', nombre: 'Test IE', estado: 'Activa' } as Institucion;
      findByIdMock.mockResolvedValue(mockRecord);
      softDeleteMock.mockResolvedValue({
        id: 'ie-uuid',
        nombre: 'Test IE',
        estado: 'Inactiva',
      } as Institucion);

      const result = await service.softDelete('ie-uuid');
      expect(result).toBeDefined();
      expect(result.estado).toBe('Inactiva');
      expect(softDeleteMock).toHaveBeenCalledWith('ie-uuid');
    });

    it('should throw NotFoundException on soft delete if record not found', async () => {
      findByIdMock.mockResolvedValue(null);

      await expect(service.softDelete('ie-uuid')).rejects.toThrow(NotFoundException);
      expect(softDeleteMock).not.toHaveBeenCalled();
    });
  });

  describe('restore', () => {
    it('should reactivate and return record if it exists', async () => {
      const mockRecord = { id: 'ie-uuid', nombre: 'Test IE', estado: 'Inactiva' } as Institucion;
      findByIdMock.mockResolvedValue(mockRecord);
      restoreMock.mockResolvedValue({
        id: 'ie-uuid',
        nombre: 'Test IE',
        estado: 'Activa',
      } as Institucion);

      const result = await service.restore('ie-uuid');
      expect(result).toBeDefined();
      expect(result.estado).toBe('Activa');
      expect(restoreMock).toHaveBeenCalledWith('ie-uuid');
    });

    it('should throw NotFoundException on restore if record not found', async () => {
      findByIdMock.mockResolvedValue(null);

      await expect(service.restore('ie-uuid')).rejects.toThrow(NotFoundException);
      expect(restoreMock).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return list of institutions with pagination details', async () => {
      const query = new QueryInstitucionDto();
      query.limit = 5;
      query.offset = 0;

      const mockList = [{ id: 'ie-1', nombre: 'IE 1' } as Institucion];
      findAllMock.mockResolvedValue({ data: mockList, total: 1 });

      const result = await service.findAll(query);
      expect(result).toBeDefined();
      expect(result.data.length).toBe(1);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(5);
      expect(result.offset).toBe(0);
      expect(findAllMock).toHaveBeenCalledWith(
        {
          limit: 5,
          offset: 0,
          nombre: undefined,
          nivelEducativo: undefined,
          estado: undefined,
          modalidad: undefined,
        },
        undefined,
      );
    });

    it('should pass user payload to repository for role-based filtering', async () => {
      const query = new QueryInstitucionDto();
      query.limit = 5;
      query.offset = 0;
      const user = {
        id: 'user-id',
        role: RoleCode.JEFE_AREA,
        especialista_nivel: 'Inicial',
      } as any;

      const mockList = [{ id: 'ie-1', nombre: 'IE 1' } as Institucion];
      findAllMock.mockResolvedValue({ data: mockList, total: 1 });

      const result = await service.findAll(query, user);
      expect(result).toBeDefined();
      expect(findAllMock).toHaveBeenCalledWith(
        {
          limit: 5,
          offset: 0,
          nombre: undefined,
          nivelEducativo: undefined,
          estado: undefined,
          modalidad: undefined,
        },
        user,
      );
    });
  });
});
