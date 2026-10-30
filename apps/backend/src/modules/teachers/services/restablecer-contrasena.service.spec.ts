import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import * as bcrypt from 'bcrypt';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RestablecerContrasenaService } from './restablecer-contrasena.service.js';
import { TeachersRepository } from '../repositories/teachers.repository.js';
import { RoleCode } from '../../../common/enums/role.enum.js';
import type { CurrentUser } from './teachers.service.js';

const INSTITUCION = 'inst-1';

const director: CurrentUser = {
  sub: 'usuario-director',
  role: RoleCode.DIRECTOR_INSTITUCION,
  permissions: ['personal:restablecer_contrasena'],
  colegio_id: INSTITUCION,
  institucion_id: INSTITUCION,
};

const docente = (over: Record<string, unknown> = {}) => ({
  id: 'docente-1',
  personaId: 'persona-1',
  institucionId: INSTITUCION,
  persona: { dni: '12345678', nombres: 'Ana', apellidos: 'Quispe' },
  ...over,
});

const usuarioObjetivo = (over: Record<string, unknown> = {}) => ({
  id: 'usuario-1',
  rolCodigo: RoleCode.DOCENTE,
  ...over,
});

describe('RestablecerContrasenaService', () => {
  let service: RestablecerContrasenaService;
  let findDocenteById: jest.Mock<any>;
  let findUsuarioPorPersonaId: jest.Mock<any>;
  let restablecerContrasena: jest.Mock<any>;

  beforeEach(async () => {
    findDocenteById = jest.fn<any>().mockResolvedValue(docente());
    findUsuarioPorPersonaId = jest.fn<any>().mockResolvedValue(usuarioObjetivo());
    restablecerContrasena = jest.fn<any>().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestablecerContrasenaService,
        {
          provide: TeachersRepository,
          useValue: { findDocenteById, findUsuarioPorPersonaId, restablecerContrasena },
        },
        { provide: ConfigService, useValue: { get: () => 4 } },
      ],
    }).compile();
    service = module.get(RestablecerContrasenaService);
  });

  it('restablece la clave al DNI y deja al usuario en primer ingreso', async () => {
    const res = await service.restablecer('docente-1', director, { ipAddress: '1.1.1.1' });

    expect(res.success).toBe(true);
    expect(JSON.stringify(res)).not.toContain('12345678');
    const arg = restablecerContrasena.mock.calls[0][0] as any;
    expect(arg.usuarioId).toBe('usuario-1');
    expect(await bcrypt.compare('12345678', arg.passwordHash)).toBe(true);
  });

  it('registra la auditoria con quien restablece, a quien y la institucion', async () => {
    await service.restablecer('docente-1', director, { ipAddress: '1.1.1.1', userAgent: 'ua' });

    const arg = restablecerContrasena.mock.calls[0][0] as any;
    expect(arg.auditoria).toMatchObject({
      actorUsuarioId: 'usuario-director',
      eventType: 'PASSWORD_RESET_BY_DIRECTOR',
      ipAddress: '1.1.1.1',
      userAgent: 'ua',
    });
    expect(arg.auditoria.eventDetail).toContain('usuario-1');
    expect(arg.auditoria.eventDetail).toContain(INSTITUCION);
    expect(arg.auditoria.eventDetail).not.toContain('12345678');
  });

  it('rechaza sin la capacidad', async () => {
    await expect(
      service.restablecer('docente-1', { ...director, permissions: [] }, {}),
    ).rejects.toThrow(ForbiddenException);
    expect(restablecerContrasena).not.toHaveBeenCalled();
  });

  it('rechaza a quien no es director de I.E. aunque tenga la capacidad', async () => {
    await expect(
      service.restablecer('docente-1', { ...director, role: RoleCode.JEFE_GESTION }, {}),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rechaza al director sin institucion en el token', async () => {
    await expect(
      service.restablecer(
        'docente-1',
        { ...director, colegio_id: undefined, institucion_id: undefined },
        {},
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('404 si el docente no existe', async () => {
    findDocenteById.mockResolvedValue(null);
    await expect(service.restablecer('x', director, {})).rejects.toThrow(NotFoundException);
  });

  it('rechaza personal de otra institucion', async () => {
    findDocenteById.mockResolvedValue(docente({ institucionId: 'otra' }));
    await expect(service.restablecer('docente-1', director, {})).rejects.toThrow(
      ForbiddenException,
    );
    expect(restablecerContrasena).not.toHaveBeenCalled();
  });

  it('404 si la persona no tiene usuario', async () => {
    findUsuarioPorPersonaId.mockResolvedValue(null);
    await expect(service.restablecer('docente-1', director, {})).rejects.toThrow(NotFoundException);
  });

  it('rechaza que el director se restablezca a si mismo', async () => {
    findUsuarioPorPersonaId.mockResolvedValue(
      usuarioObjetivo({ id: 'usuario-director', rolCodigo: RoleCode.DIRECTOR_INSTITUCION }),
    );
    await expect(service.restablecer('docente-1', director, {})).rejects.toThrow(
      ForbiddenException,
    );
  });

  it.each([
    RoleCode.DIRECTOR_INSTITUCION,
    RoleCode.DIRECTOR_UGEL,
    RoleCode.JEFE_GESTION,
    RoleCode.JEFE_AREA,
    RoleCode.ESPECIALISTA,
    RoleCode.SUPERUSUARIO,
  ])('rechaza al objetivo con rol %s', async (rolCodigo) => {
    findUsuarioPorPersonaId.mockResolvedValue(usuarioObjetivo({ rolCodigo }));
    await expect(service.restablecer('docente-1', director, {})).rejects.toThrow(
      ForbiddenException,
    );
    expect(restablecerContrasena).not.toHaveBeenCalled();
  });

  it.each([RoleCode.DOCENTE, RoleCode.COORDINADOR_PEDAGOGICO, RoleCode.JEFE_TALLER])(
    'permite al objetivo con rol %s',
    async (rolCodigo) => {
      findUsuarioPorPersonaId.mockResolvedValue(usuarioObjetivo({ rolCodigo }));
      await expect(service.restablecer('docente-1', director, {})).resolves.toBeDefined();
    },
  );
});
