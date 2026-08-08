import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard.js';
import { SessionRepository } from '../repositories/session.repository.js';
import { RlsGucService } from '../services/rls-guc.service.js';
import { RoleCode } from '../../../common/enums/role.enum.js';

/**
 * Pruebas de caracterización del guardián de autenticación.
 *
 * Es lo primero que corre en cada petición autenticada y decide tres cosas: si
 * el token vale, si su sesión sigue viva en la base, y con qué contexto se
 * consultan las tablas con seguridad a nivel de fila.
 */

const PAYLOAD = {
  sub: 'u-1',
  jti: 'sesion-1',
  role: RoleCode.ESPECIALISTA,
  institucion_id: 'ie-1',
  firstLogin: false,
};

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: { verifyAsync: jest.Mock };
  let sessionRepository: { isSessionActive: jest.Mock };
  let rlsGucService: { setSessionGucs: jest.Mock };
  let reflector: { getAllAndOverride: jest.Mock };

  /** Petición con el token donde el guardián lo busca. */
  const contexto = (opciones: {
    cookies?: Record<string, string>;
    authorization?: string;
  }): ExecutionContext => {
    const request = {
      cookies: opciones.cookies ?? {},
      headers: opciones.authorization ? { authorization: opciones.authorization } : {},
    };

    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => undefined,
      getClass: () => undefined,
      __request: request,
    } as unknown as ExecutionContext;
  };

  const conCookie = () => contexto({ cookies: { accessToken: 'token' } });

  beforeEach(async () => {
    jwtService = { verifyAsync: jest.fn(() => Promise.resolve(PAYLOAD)) };
    sessionRepository = { isSessionActive: jest.fn(() => Promise.resolve(true)) };
    rlsGucService = { setSessionGucs: jest.fn(() => Promise.resolve(undefined)) };
    reflector = { getAllAndOverride: jest.fn(() => false) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: JwtService, useValue: jwtService },
        { provide: Reflector, useValue: reflector },
        { provide: SessionRepository, useValue: sessionRepository },
        { provide: RlsGucService, useValue: rlsGucService },
      ],
    }).compile();

    guard = module.get(AuthGuard);
  });

  describe('de dónde toma el token', () => {
    it('lo toma de la cookie', async () => {
      await expect(guard.canActivate(conCookie())).resolves.toBe(true);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('token');
    });

    it('lo toma de la cabecera Bearer cuando no hay cookie', async () => {
      await expect(
        guard.canActivate(contexto({ authorization: 'Bearer desde-cabecera' })),
      ).resolves.toBe(true);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('desde-cabecera');
    });

    it('la cookie tiene prioridad sobre la cabecera', async () => {
      await guard.canActivate(
        contexto({ cookies: { accessToken: 'de-cookie' }, authorization: 'Bearer de-cabecera' }),
      );
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('de-cookie');
    });

    it('sin token no deja pasar', async () => {
      await expect(guard.canActivate(contexto({}))).rejects.toThrow(UnauthorizedException);
    });

    it('un esquema que no es Bearer no cuenta como token', async () => {
      await expect(guard.canActivate(contexto({ authorization: 'Basic abc' }))).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validez del token y de la sesión', () => {
    it('un token que no verifica no deja pasar', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('firma inválida') as never);

      await expect(guard.canActivate(conCookie())).rejects.toThrow('Token inválido o expirado');
    });

    /**
     * Un token con firma válida no alcanza: si la sesión se cerró —logout,
     * cambio de contraseña, expulsión— el token sigue siendo criptográficamente
     * correcto y hay que rechazarlo igual.
     */
    it('un token de una sesión ya cerrada no deja pasar', async () => {
      sessionRepository.isSessionActive.mockResolvedValue(false as never);

      await expect(guard.canActivate(conCookie())).rejects.toThrow('Sesión invalidada o cerrada');
    });

    it('comprueba la sesión que el token declara', async () => {
      await guard.canActivate(conCookie());
      expect(sessionRepository.isSessionActive).toHaveBeenCalledWith('sesion-1');
    });
  });

  describe('primer ingreso', () => {
    const primerIngreso = () =>
      jwtService.verifyAsync.mockResolvedValue({ ...PAYLOAD, firstLogin: true } as never);

    /**
     * Con la contraseña temporal sin cambiar sólo se llega a los endpoints
     * marcados con `@AllowFirstLogin()`; el resto queda cerrado.
     */
    it('con contraseña temporal no se accede a un recurso cualquiera', async () => {
      primerIngreso();

      await expect(guard.canActivate(conCookie())).rejects.toThrow(ForbiddenException);
    });

    it('sí se accede a lo que permite el primer ingreso', async () => {
      primerIngreso();
      reflector.getAllAndOverride.mockReturnValue(true);

      await expect(guard.canActivate(conCookie())).resolves.toBe(true);
    });
  });

  describe('contexto de seguridad a nivel de fila', () => {
    it('lo establece con el usuario, su rol y su institución', async () => {
      await guard.canActivate(conCookie());

      expect(rlsGucService.setSessionGucs).toHaveBeenCalledWith(
        'u-1',
        RoleCode.ESPECIALISTA,
        'ie-1',
      );
    });

    /**
     * El personal de UGEL no pertenece a una institución. Se pasa cadena vacía
     * y no `undefined`, que es lo que `set_config` puede recibir.
     */
    it('sin institución pasa cadena vacía', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        ...PAYLOAD,
        institucion_id: undefined,
      } as never);

      await guard.canActivate(conCookie());
      expect(rlsGucService.setSessionGucs).toHaveBeenCalledWith('u-1', RoleCode.ESPECIALISTA, '');
    });

    it('no lo establece cuando la sesión ya estaba cerrada', async () => {
      sessionRepository.isSessionActive.mockResolvedValue(false as never);

      await expect(guard.canActivate(conCookie())).rejects.toThrow();
      expect(rlsGucService.setSessionGucs).not.toHaveBeenCalled();
    });
  });

  it('deja la carga útil del token al alcance del controlador', async () => {
    const ctx = conCookie();
    await guard.canActivate(ctx);

    expect((ctx as unknown as { __request: { user: unknown } }).__request.user).toMatchObject({
      sub: 'u-1',
      jti: 'sesion-1',
    });
  });
});
