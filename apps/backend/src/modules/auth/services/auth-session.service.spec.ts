import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthSessionService } from './auth-session.service.js';
import { AuthTokenService } from './auth-token.service.js';
import { UserRepository } from '../repositories/user.repository.js';
import { SessionRepository } from '../repositories/session.repository.js';
import { AuditRepository } from '../repositories/audit.repository.js';
import { RoleCode } from '../../../common/enums/role.enum.js';

/**
 * Pruebas de caracterización del ingreso.
 *
 * Fija dos cosas que no tenían cobertura y de las que depende todo lo demás: el
 * bloqueo de cuenta tras intentos fallidos, y qué identificadores llegan al
 * cliente. Desde que la autorización dejó de compararse por nombre, un claim
 * que no viaje deja al usuario sin ver sus propias visitas.
 */

const CLAVE = 'clave-correcta';

/**
 * Hash real y no un `bcrypt.compare` simulado: en ESM no se puede espiar el
 * export, y de paso la comparación que se prueba es la que corre en producción.
 * El coste de trabajo es el mínimo porque estas pruebas no miden fuerza bruta.
 */
const HASH_DE_LA_CLAVE = bcrypt.hashSync(CLAVE, 4);

/** Usuario tal como lo devuelve el repositorio. */
const usuarioActivo = (over: Record<string, unknown> = {}) =>
  ({
    id: 'u-1',
    isActive: true,
    isFirstLogin: false,
    passwordHash: HASH_DE_LA_CLAVE,
    lockedUntil: null,
    lastFailedLoginAt: null,
    rol: { codigo: RoleCode.ESPECIALISTA },
    persona: {
      dni: '12345678',
      nombres: 'Ana',
      apellidos: 'Torres',
      docente: null,
      especialista: { id: 'esp-1', nivelEducativo: 'Primaria', modalidad: 'EBR', cargos: [] },
    },
    ...over,
  }) as never;

describe('AuthSessionService.login', () => {
  let service: AuthSessionService;
  let userRepository: {
    findUserByDni: jest.Mock;
    findUserById: jest.Mock;
    updateLastLogin: jest.Mock;
    incrementFailedAttempts: jest.Mock;
    lockAccount: jest.Mock;
    resetFailedAttempts: jest.Mock;
  };
  let sessionRepository: { createSession: jest.Mock; invalidateSession: jest.Mock };
  let auditRepository: { logAuthEvent: jest.Mock };

  beforeEach(async () => {
    userRepository = {
      findUserByDni: jest.fn(),
      findUserById: jest.fn(),
      updateLastLogin: jest.fn(),
      incrementFailedAttempts: jest.fn(),
      lockAccount: jest.fn(),
      resetFailedAttempts: jest.fn(),
    };
    sessionRepository = { createSession: jest.fn(), invalidateSession: jest.fn() };
    auditRepository = { logAuthEvent: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthSessionService,
        { provide: UserRepository, useValue: userRepository },
        { provide: SessionRepository, useValue: sessionRepository },
        { provide: AuditRepository, useValue: auditRepository },
        // El armado de la carga útil es el real: lo que se quiere comprobar es
        // que sus claims lleguen enteros al cliente. Sólo se simula la firma.
        {
          provide: AuthTokenService,
          useValue: Object.assign(
            new AuthTokenService(
              { sign: jest.fn(), decode: jest.fn(), verify: jest.fn() } as never,
              { get: jest.fn() } as never,
            ),
            {
              generateTokens: jest.fn(() => ({
                accessToken: 'access',
                refreshTokenJWT: 'refresh',
                refreshExpiresAt: new Date('2026-12-31T00:00:00Z'),
              })),
            },
          ),
        },
      ],
    }).compile();

    service = module.get(AuthSessionService);
  });

  const ingresar = (clave = CLAVE) => service.login({ dni: '12345678', password: clave });

  describe('credenciales', () => {
    it('un DNI que no existe no revela que no existe', async () => {
      userRepository.findUserByDni.mockResolvedValue(null as never);

      await expect(ingresar()).rejects.toThrow(UnauthorizedException);
      await expect(ingresar()).rejects.toThrow('Credenciales inválidas');
    });

    it('deja registro del intento sobre un DNI no registrado', async () => {
      userRepository.findUserByDni.mockResolvedValue(null as never);

      await expect(ingresar()).rejects.toThrow();
      expect(auditRepository.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'LOGIN_FAILURE_UNREGISTERED' }),
      );
    });

    it('una cuenta inactiva no ingresa', async () => {
      userRepository.findUserByDni.mockResolvedValue(usuarioActivo({ isActive: false }));

      await expect(ingresar()).rejects.toThrow(ForbiddenException);
    });
  });

  describe('bloqueo por intentos fallidos', () => {
    it('a la tercera falla bloquea la cuenta', async () => {
      userRepository.findUserByDni.mockResolvedValue(usuarioActivo());
      userRepository.incrementFailedAttempts.mockResolvedValue(3 as never);

      await expect(ingresar('mala')).rejects.toThrow(UnauthorizedException);
      expect(userRepository.lockAccount).toHaveBeenCalled();
    });

    it('antes de la tercera no la bloquea', async () => {
      userRepository.findUserByDni.mockResolvedValue(usuarioActivo());
      userRepository.incrementFailedAttempts.mockResolvedValue(2 as never);

      await expect(ingresar('mala')).rejects.toThrow(UnauthorizedException);
      expect(userRepository.lockAccount).not.toHaveBeenCalled();
    });

    it('una cuenta bloqueada no ingresa ni con la clave correcta', async () => {
      const dentroDeUnRato = new Date(Date.now() + 10 * 60 * 1000);
      userRepository.findUserByDni.mockResolvedValue(
        usuarioActivo({ lockedUntil: dentroDeUnRato }),
      );

      await expect(ingresar()).rejects.toThrow(ForbiddenException);
    });

    it('vencido el bloqueo, la clave correcta vuelve a servir', async () => {
      const haceUnRato = new Date(Date.now() - 10 * 60 * 1000);
      userRepository.findUserByDni.mockResolvedValue(usuarioActivo({ lockedUntil: haceUnRato }));

      await expect(ingresar()).resolves.toBeDefined();
    });

    /**
     * Media hora sin fallar limpia la cuenta antes de contar el fallo nuevo: si
     * no, tres errores repartidos a lo largo de meses bloquearían a alguien que
     * sólo se confundió de tanto en tanto.
     *
     * La regla sólo se observa cuando la clave falla: si acierta, el ingreso
     * exitoso reinicia el contador de todas formas.
     */
    it('media hora sin fallar limpia el contador antes de sumar el fallo nuevo', async () => {
      const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000);
      userRepository.findUserByDni.mockResolvedValue(
        usuarioActivo({ lastFailedLoginAt: haceUnaHora }),
      );
      userRepository.incrementFailedAttempts.mockResolvedValue(1 as never);

      await expect(ingresar('mala')).rejects.toThrow();
      expect(userRepository.resetFailedAttempts).toHaveBeenCalledWith('u-1');
    });

    it('un fallo reciente conserva el contador', async () => {
      const haceCincoMinutos = new Date(Date.now() - 5 * 60 * 1000);
      userRepository.findUserByDni.mockResolvedValue(
        usuarioActivo({ lastFailedLoginAt: haceCincoMinutos }),
      );
      userRepository.incrementFailedAttempts.mockResolvedValue(2 as never);

      await expect(ingresar('mala')).rejects.toThrow();
      expect(userRepository.resetFailedAttempts).not.toHaveBeenCalled();
    });

    /**
     * Documentado a propósito: la comprobación de los treinta minutos que corre
     * antes de validar la clave es redundante cuando el ingreso sale bien,
     * porque el camino exitoso reinicia el contador igual.
     */
    it('un ingreso exitoso reinicia el contador, hubiera o no fallos recientes', async () => {
      const haceCincoMinutos = new Date(Date.now() - 5 * 60 * 1000);
      userRepository.findUserByDni.mockResolvedValue(
        usuarioActivo({ lastFailedLoginAt: haceCincoMinutos }),
      );

      await ingresar();
      expect(userRepository.resetFailedAttempts).toHaveBeenCalledWith('u-1');
    });
  });

  describe('lo que recibe el cliente', () => {
    it('lleva el identificador de especialista', async () => {
      userRepository.findUserByDni.mockResolvedValue(usuarioActivo());

      const { user } = await ingresar();
      expect(user.especialistaId).toBe('esp-1');
    });

    /**
     * El director de I.E. tiene los dos registros. Los dos identificadores
     * tienen que llegar: uno lo reconoce como evaluador y el otro como evaluado.
     */
    it('lleva los dos identificadores de quien dirige una I.E.', async () => {
      userRepository.findUserByDni.mockResolvedValue(
        usuarioActivo({
          rol: { codigo: RoleCode.DIRECTOR_INSTITUCION },
          persona: {
            dni: '22222222',
            nombres: 'Rosa',
            apellidos: 'Mamani',
            docente: {
              id: 'doc-dir',
              institucionId: 'ie-1',
              institucion: { nombre: 'IE 70001', nivelEducativo: 'Secundaria' },
              docenteCargos: [],
            },
            especialista: {
              id: 'esp-dir',
              nivelEducativo: 'Secundaria',
              modalidad: 'EBR',
              cargos: [],
            },
          },
        }),
      );

      const { user } = await ingresar();

      expect(user.docenteId).toBe('doc-dir');
      expect(user.especialistaId).toBe('esp-dir');
      expect(user.institucion).toBe('ie-1');
      expect(user.institucionNombre).toBe('IE 70001');
      expect(user.institucionNivel).toBe('Secundaria');
    });

    /**
     * Las capacidades ya viajaban en el token pero se descartaban al armar esta
     * respuesta, de modo que el cliente decidía comparando el rol literal.
     * Fase 2 de PLAN_REMEDIACION.md.
     */
    it('lleva las capacidades y no una lista vacía', async () => {
      userRepository.findUserByDni.mockResolvedValue(usuarioActivo());

      const { user } = await ingresar();
      expect(user.permissions.length).toBeGreaterThan(0);
    });

    it('el personal de UGEL llega sin institución', async () => {
      userRepository.findUserByDni.mockResolvedValue(usuarioActivo());

      const { user } = await ingresar();
      expect(user.institucion).toBeUndefined();
    });

    it('deja registro del ingreso exitoso', async () => {
      userRepository.findUserByDni.mockResolvedValue(usuarioActivo());

      await ingresar();
      expect(auditRepository.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u-1', eventType: 'LOGIN_SUCCESS' }),
      );
    });
  });
});
