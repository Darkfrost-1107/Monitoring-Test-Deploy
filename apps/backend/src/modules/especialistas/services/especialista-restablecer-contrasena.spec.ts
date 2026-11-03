import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import * as bcrypt from 'bcrypt';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EspecialistaService } from './especialista.service.js';
import { EspecialistaRepository } from '../repositories/especialista.repository.js';
import { CatalogsRepository } from '../../catalogs/repositories/catalogs.repository.js';
import { SessionRepository } from '../../auth/repositories/session.repository.js';
import { RoleCode } from '../../../common/enums/role.enum.js';
import type { JwtPayload } from '../../auth/services/auth-token.service.js';

const jefeGestion: JwtPayload = {
  sub: 'usuario-jg',
  dni: '11111111',
  nombres: 'Jefe',
  apellidos: 'Gestion',
  role: RoleCode.JEFE_GESTION,
  permissions: ['personal:restablecer_contrasena'],
  firstLogin: false,
};

const superusuario: JwtPayload = {
  sub: 'usuario-super',
  dni: '00000000',
  nombres: 'Super',
  apellidos: 'Admin',
  role: RoleCode.SUPERUSUARIO,
  permissions: ['personal:restablecer_contrasena'],
  firstLogin: false,
};

const director: JwtPayload = {
  sub: 'usuario-dir',
  dni: '22222222',
  nombres: 'Director',
  apellidos: 'IE',
  role: RoleCode.DIRECTOR_INSTITUCION,
  permissions: ['personal:restablecer_contrasena'],
  firstLogin: false,
};

const especialistaMock = {
  id: 'esp-1',
  personaId: 'persona-1',
  persona: {
    id: 'persona-1',
    dni: '87654321',
    nombres: 'Carlos',
    apellidos: 'Mamani',
    correo: 'carlos@ugel.edu.pe',
    telefono: '999888777',
  },
  cargo: 'Especialista',
  nivelEducativo: 'Secundaria',
  estado: 'Activo',
  createdAt: new Date(),
  updatedAt: new Date(),
} as any;

describe('EspecialistaService.restablecerContrasena', () => {
  let service: EspecialistaService;
  let findById: jest.Mock<any>;
  let findUserIdByEspecialistaId: jest.Mock<any>;
  let restablecerContrasena: jest.Mock<any>;

  beforeEach(async () => {
    findById = jest.fn<any>().mockResolvedValue(especialistaMock);
    findUserIdByEspecialistaId = jest.fn<any>().mockResolvedValue('usuario-esp-1');
    restablecerContrasena = jest.fn<any>().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EspecialistaService,
        {
          provide: EspecialistaRepository,
          useValue: { findById, findUserIdByEspecialistaId, restablecerContrasena },
        },
        { provide: CatalogsRepository, useValue: {} },
        { provide: SessionRepository, useValue: {} },
        { provide: ConfigService, useValue: { get: () => 4 } },
      ],
    }).compile();

    service = module.get(EspecialistaService);
  });

  it('restablece la clave al DNI de especialista para Jefe de Gestión', async () => {
    const res = await service.restablecerContrasena('esp-1', jefeGestion, {
      ipAddress: '10.0.0.1',
      userAgent: 'Jest',
    });

    expect(res.success).toBe(true);
    expect(restablecerContrasena).toHaveBeenCalledTimes(1);

    const callArg = restablecerContrasena.mock.calls[0][0] as any;
    expect(callArg.usuarioId).toBe('usuario-esp-1');
    expect(await bcrypt.compare('87654321', callArg.passwordHash)).toBe(true);
    expect(callArg.auditoria).toMatchObject({
      actorUsuarioId: 'usuario-jg',
      eventType: 'PASSWORD_RESET_BY_JEFE_GESTION',
      ipAddress: '10.0.0.1',
      userAgent: 'Jest',
    });
  });

  it('permite a un superusuario restablecer la clave', async () => {
    const res = await service.restablecerContrasena('esp-1', superusuario, {});
    expect(res.success).toBe(true);
  });

  it('rechaza si no tiene la capacidad personal:restablecer_contrasena', async () => {
    await expect(
      service.restablecerContrasena('esp-1', { ...jefeGestion, permissions: [] }, {}),
    ).rejects.toThrow(ForbiddenException);
    expect(restablecerContrasena).not.toHaveBeenCalled();
  });

  it('rechaza a un director de I.E. que intente restablecer a un especialista', async () => {
    await expect(service.restablecerContrasena('esp-1', director, {})).rejects.toThrow(
      ForbiddenException,
    );
    expect(restablecerContrasena).not.toHaveBeenCalled();
  });

  it('lanza 404 si el especialista no existe', async () => {
    findById.mockResolvedValue(null);
    await expect(service.restablecerContrasena('inexistente', jefeGestion, {})).rejects.toThrow(
      NotFoundException,
    );
  });

  it('lanza 404 si el especialista no tiene usuario', async () => {
    findUserIdByEspecialistaId.mockResolvedValue(null);
    await expect(service.restablecerContrasena('esp-1', jefeGestion, {})).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rechaza si el usuario intenta restablecerse a sí mismo', async () => {
    findUserIdByEspecialistaId.mockResolvedValue('usuario-jg');
    await expect(service.restablecerContrasena('esp-1', jefeGestion, {})).rejects.toThrow(
      ForbiddenException,
    );
  });
});
