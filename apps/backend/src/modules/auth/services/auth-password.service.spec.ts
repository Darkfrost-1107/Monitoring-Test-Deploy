import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import { AuthPasswordService } from './auth-password.service.js';
import { UserRepository } from '../repositories/user.repository.js';
import { PasswordTokenRepository } from '../repositories/password-token.repository.js';
import { AuditRepository } from '../repositories/audit.repository.js';
import { SessionRepository } from '../repositories/session.repository.js';
import { MailerService } from '../../../shared/mailer/mailer.service.js';

/**
 * Pruebas de caracterización del restablecimiento y cambio de contraseña.
 *
 * Son los tres caminos por los que una credencial cambia de manos, y ninguno
 * tenía cobertura.
 */

const CLAVE_ACTUAL = 'Clave-actual-1';
const CLAVE_NUEVA = 'Clave-nueva-2';

/** Hash real: en ESM no se puede espiar `bcrypt.compare`, y así se prueba el de verdad. */
const HASH_ACTUAL = bcrypt.hashSync(CLAVE_ACTUAL, 4);

const usuario = (over: Record<string, unknown> = {}) =>
  ({
    id: 'u-1',
    isActive: true,
    passwordHash: HASH_ACTUAL,
    persona: { nombres: 'Ana', correo: 'ana@ugel.pe' },
    ...over,
  }) as never;

const enQuinceMinutos = () => new Date(Date.now() + 15 * 60 * 1000);
const haceUnRato = () => new Date(Date.now() - 60 * 1000);

describe('AuthPasswordService', () => {
  let service: AuthPasswordService;
  let userRepository: {
    findUserByDniAndEmail: jest.Mock;
    findUserById: jest.Mock;
    updatePassword: jest.Mock;
  };
  let passwordTokenRepository: {
    createPasswordResetToken: jest.Mock;
    findResetToken: jest.Mock;
    useResetToken: jest.Mock;
  };
  let auditRepository: { logAuthEvent: jest.Mock };
  let sessionRepository: { hasActiveSession: jest.Mock; invalidateAllUserSessions: jest.Mock };
  let mailerService: { sendPasswordResetEmail: jest.Mock };

  beforeEach(async () => {
    userRepository = {
      findUserByDniAndEmail: jest.fn(),
      findUserById: jest.fn(),
      updatePassword: jest.fn(),
    };
    passwordTokenRepository = {
      createPasswordResetToken: jest.fn(),
      findResetToken: jest.fn(),
      useResetToken: jest.fn(),
    };
    auditRepository = { logAuthEvent: jest.fn() };
    sessionRepository = {
      hasActiveSession: jest.fn(() => Promise.resolve(false)),
      invalidateAllUserSessions: jest.fn(),
    };
    mailerService = { sendPasswordResetEmail: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthPasswordService,
        { provide: UserRepository, useValue: userRepository },
        { provide: PasswordTokenRepository, useValue: passwordTokenRepository },
        { provide: AuditRepository, useValue: auditRepository },
        { provide: SessionRepository, useValue: sessionRepository },
        { provide: MailerService, useValue: mailerService },
      ],
    }).compile();

    service = module.get(AuthPasswordService);
  });

  describe('forgotPassword', () => {
    const pedirEnlace = () => service.forgotPassword({ dni: '12345678', email: 'ana@ugel.pe' });

    /**
     * La respuesta es la misma exista o no la persona: distinguirlas permitiría
     * averiguar qué DNI están registrados.
     */
    it('responde lo mismo cuando los datos no coinciden con nadie', async () => {
      userRepository.findUserByDniAndEmail.mockResolvedValue(null as never);

      const respuesta = await pedirEnlace();
      expect(respuesta.success).toBe(true);
      expect(mailerService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('responde lo mismo cuando la cuenta está inactiva', async () => {
      userRepository.findUserByDniAndEmail.mockResolvedValue(usuario({ isActive: false }));

      const respuesta = await pedirEnlace();
      expect(respuesta.success).toBe(true);
      expect(mailerService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('deja registro del intento contra un DNI que no coincide', async () => {
      userRepository.findUserByDniAndEmail.mockResolvedValue(null as never);

      await pedirEnlace();
      expect(auditRepository.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'FORGOT_PASSWORD_FAILURE_NOT_FOUND' }),
      );
    });

    it('envía el enlace cuando los datos coinciden', async () => {
      userRepository.findUserByDniAndEmail.mockResolvedValue(usuario());

      await pedirEnlace();
      expect(mailerService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'ana@ugel.pe',
        'Ana',
        expect.any(String),
      );
    });

    /**
     * Se guarda el hash del token, no el token: quien lea la tabla no puede
     * usarlo para restablecer la contraseña de nadie.
     */
    it('guarda el token cifrado, no en claro', async () => {
      userRepository.findUserByDniAndEmail.mockResolvedValue(usuario());

      await pedirEnlace();

      const [[guardado]] = passwordTokenRepository.createPasswordResetToken.mock.calls as [
        [{ tokenHash: string }],
      ];
      const [[, , enviado]] = mailerService.sendPasswordResetEmail.mock.calls as [
        [string, string, string],
      ];

      expect(guardado.tokenHash).not.toBe(enviado);
      expect(guardado.tokenHash).toBe(createHash('sha256').update(enviado).digest('hex'));
    });

    /**
     * DEFECTO CONOCIDO, fijado a propósito.
     *
     * Los tres caminos responden igual salvo éste: con sesión activa se
     * devuelve un 409 con un mensaje propio. Quien acierte DNI y correo puede
     * distinguir «existe y está conectado» de «no existe», que es justamente lo
     * que los otros dos caminos evitan revelar.
     *
     * Se fija acá porque corregirlo es una decisión de producto: la alternativa
     * es responder el mensaje genérico y no enviar el correo, con lo que quien
     * de verdad olvidó su contraseña y dejó una sesión abierta no entendería
     * por qué no llega nada.
     */
    it('DEFECTO: con sesión activa responde distinto y revela que la cuenta existe', async () => {
      userRepository.findUserByDniAndEmail.mockResolvedValue(usuario());
      sessionRepository.hasActiveSession.mockResolvedValue(true as never);

      await expect(pedirEnlace()).rejects.toThrow(ConflictException);
    });
  });

  describe('resetPassword', () => {
    const tokenValido = (over: Record<string, unknown> = {}) => ({
      id: 't-1',
      usuarioId: 'u-1',
      isUsed: false,
      expiresAt: enQuinceMinutos(),
      usuario: { isActive: true, passwordHash: HASH_ACTUAL },
      ...over,
    });

    const restablecer = (nueva = CLAVE_NUEVA) =>
      service.resetPassword({ token: 'token-en-claro', newPassword: nueva });

    it('restablece con un token vigente', async () => {
      passwordTokenRepository.findResetToken.mockResolvedValue(tokenValido() as never);

      await expect(restablecer()).resolves.toMatchObject({ success: true });
      expect(passwordTokenRepository.useResetToken).toHaveBeenCalledWith(
        't-1',
        'u-1',
        expect.any(String),
      );
    });

    it('busca el token por su hash y no por el valor del enlace', async () => {
      passwordTokenRepository.findResetToken.mockResolvedValue(tokenValido() as never);

      await restablecer();
      expect(passwordTokenRepository.findResetToken).toHaveBeenCalledWith(
        createHash('sha256').update('token-en-claro').digest('hex'),
      );
    });

    it.each([
      ['inexistente', null],
      ['ya usado', tokenValido({ isUsed: true })],
      ['expirado', tokenValido({ expiresAt: haceUnRato() })],
    ])('rechaza un token %s', async (_caso, token) => {
      passwordTokenRepository.findResetToken.mockResolvedValue(token as never);

      await expect(restablecer()).rejects.toThrow(BadRequestException);
      expect(passwordTokenRepository.useResetToken).not.toHaveBeenCalled();
    });

    it('rechaza si la cuenta quedó inactiva desde que se pidió el enlace', async () => {
      passwordTokenRepository.findResetToken.mockResolvedValue(
        tokenValido({ usuario: { isActive: false, passwordHash: HASH_ACTUAL } }) as never,
      );

      await expect(restablecer()).rejects.toThrow('La cuenta de usuario está inactiva.');
    });

    /** Restablecer con la misma clave no restablece nada. */
    it('rechaza repetir la contraseña actual', async () => {
      passwordTokenRepository.findResetToken.mockResolvedValue(tokenValido() as never);

      await expect(restablecer(CLAVE_ACTUAL)).rejects.toThrow(
        'La nueva contraseña no puede ser igual a la contraseña actual.',
      );
    });

    it('guarda la contraseña cifrada, no en claro', async () => {
      passwordTokenRepository.findResetToken.mockResolvedValue(tokenValido() as never);

      await restablecer();

      const [[, , hash]] = passwordTokenRepository.useResetToken.mock.calls as [
        [string, string, string],
      ];
      expect(hash).not.toBe(CLAVE_NUEVA);
      expect(await bcrypt.compare(CLAVE_NUEVA, hash)).toBe(true);
    });
  });

  describe('changePassword', () => {
    const cambiar = (nueva = CLAVE_NUEVA) =>
      service.changePassword('u-1', 'sesion-1', { newPassword: nueva });

    it('cambia la contraseña de quien tiene sesión', async () => {
      userRepository.findUserById.mockResolvedValue(usuario());

      await expect(cambiar()).resolves.toMatchObject({ success: true });
      expect(userRepository.updatePassword).toHaveBeenCalledWith('u-1', expect.any(String));
    });

    it('no cambia nada si el usuario no existe', async () => {
      userRepository.findUserById.mockResolvedValue(null as never);

      await expect(cambiar()).rejects.toThrow(UnauthorizedException);
      expect(userRepository.updatePassword).not.toHaveBeenCalled();
    });

    it('rechaza repetir la contraseña actual', async () => {
      userRepository.findUserById.mockResolvedValue(usuario());

      await expect(cambiar(CLAVE_ACTUAL)).rejects.toThrow(
        'La nueva contraseña no puede ser igual a la contraseña actual.',
      );
    });

    it('guarda la contraseña cifrada, no en claro', async () => {
      userRepository.findUserById.mockResolvedValue(usuario());

      await cambiar();

      const [[, hash]] = userRepository.updatePassword.mock.calls as [[string, string]];
      expect(await bcrypt.compare(CLAVE_NUEVA, hash)).toBe(true);
    });

    /**
     * El mensaje que se devuelve dice que se cerró la sesión en todos los
     * dispositivos, y hasta ahora no se cerraba ninguna: el método recibía
     * `sessionJti` y no lo usaba. El controlador sólo borra las cookies del
     * navegador que hizo la petición, de modo que cualquier otra sesión
     * —otro dispositivo, o un token robado— seguía sirviendo.
     *
     * `resetPassword` sí las cierra, dentro de la misma transacción que cambia
     * la contraseña. Los dos caminos ahora coinciden.
     */
    it('cierra todas las sesiones, que es lo que su mensaje promete', async () => {
      userRepository.findUserById.mockResolvedValue(usuario());

      const respuesta = await cambiar();

      expect(sessionRepository.invalidateAllUserSessions).toHaveBeenCalledWith(
        'u-1',
        'PASSWORD_CHANGED',
      );
      expect(respuesta.message).toContain('todos los dispositivos');
    });

    it('no cierra sesiones si la contraseña no llegó a cambiar', async () => {
      userRepository.findUserById.mockResolvedValue(usuario());

      await expect(cambiar(CLAVE_ACTUAL)).rejects.toThrow();
      expect(sessionRepository.invalidateAllUserSessions).not.toHaveBeenCalled();
    });
  });
});
