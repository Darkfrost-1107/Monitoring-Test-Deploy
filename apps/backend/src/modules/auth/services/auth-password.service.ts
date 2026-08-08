import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'node:crypto';
import { UserRepository } from '../repositories/user.repository.js';
import { PasswordTokenRepository } from '../repositories/password-token.repository.js';
import { AuditRepository } from '../repositories/audit.repository.js';
import { SessionRepository } from '../repositories/session.repository.js';
import { MailerService } from '../../../shared/mailer/mailer.service.js';
import { ForgotPasswordDto } from '../dto/forgot-password.dto.js';
import { ResetPasswordDto } from '../dto/reset-password.dto.js';
import { ChangePasswordDto } from '../dto/change-password.dto.js';
import {
  IForgotPasswordResponse,
  IResetPasswordResponse,
  IChangePasswordResponse,
} from '@sistema-monitoreo/shared-contracts';

@Injectable()
export class AuthPasswordService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordTokenRepository: PasswordTokenRepository,
    private readonly auditRepository: AuditRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly mailerService: MailerService,
  ) {}

  async forgotPassword(
    dto: ForgotPasswordDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<IForgotPasswordResponse> {
    const user = await this.userRepository.findUserByDniAndEmail(dto.dni, dto.email);
    if (!user) {
      await this.auditRepository.logAuthEvent({
        eventType: 'FORGOT_PASSWORD_FAILURE_NOT_FOUND',
        eventDetail: `DNI o email no coincide: ${dto.dni}`,
        ...meta,
      });
      return { success: true, message: 'Si los datos son correctos, recibirá un correo.' };
    }

    if (!user.isActive) {
      await this.auditRepository.logAuthEvent({
        userId: user.id,
        eventType: 'FORGOT_PASSWORD_FAILURE_INACTIVE',
        ...meta,
      });
      return { success: true, message: 'Si los datos son correctos, recibirá un correo.' };
    }

    const hasActiveSession = await this.sessionRepository.hasActiveSession(user.id);
    if (hasActiveSession) {
      await this.auditRepository.logAuthEvent({
        userId: user.id,
        eventType: 'FORGOT_PASSWORD_FAILURE_ACTIVE_SESSION',
        ...meta,
      });
      throw new ConflictException(
        'El usuario tiene una sesión activa. Debe cerrar sesión o cambiar su contraseña desde su perfil.',
      );
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.passwordTokenRepository.createPasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt,
      requestedIp: meta?.ipAddress,
    });

    await this.mailerService.sendPasswordResetEmail(
      user.persona.correo!,
      user.persona.nombres,
      rawToken,
    );
    await this.auditRepository.logAuthEvent({
      userId: user.id,
      eventType: 'PASSWORD_RESET_REQUESTED',
      ...meta,
    });

    return {
      success: true,
      message: 'Si los datos son correctos, recibirá un correo electrónico con instrucciones.',
    };
  }

  async resetPassword(
    dto: ResetPasswordDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<IResetPasswordResponse> {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const resetToken = await this.passwordTokenRepository.findResetToken(tokenHash);

    if (!resetToken || resetToken.isUsed || resetToken.expiresAt < new Date()) {
      await this.auditRepository.logAuthEvent({
        eventType: 'PASSWORD_RESET_FAILURE_INVALID_TOKEN',
        ...meta,
      });
      throw new BadRequestException('El enlace de recuperación es inválido o ha expirado.');
    }

    if (!resetToken.usuario!.isActive) {
      throw new BadRequestException('La cuenta de usuario está inactiva.');
    }

    const isSamePassword = await bcrypt.compare(dto.newPassword, resetToken.usuario!.passwordHash);
    if (isSamePassword) {
      throw new BadRequestException(
        'La nueva contraseña no puede ser igual a la contraseña actual.',
      );
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.passwordTokenRepository.useResetToken(
      resetToken.id,
      resetToken.usuarioId,
      newPasswordHash,
    );
    await this.auditRepository.logAuthEvent({
      userId: resetToken.usuarioId,
      eventType: 'PASSWORD_RESET_SUCCESS',
      ...meta,
    });

    return {
      success: true,
      message: 'Contraseña restablecida exitosamente. Ya puede iniciar sesión.',
    };
  }

  async changePassword(
    userId: string,
    sessionJti: string,
    dto: ChangePasswordDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<IChangePasswordResponse> {
    const user = await this.userRepository.findUserById(userId);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const isSamePassword = await bcrypt.compare(dto.newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new BadRequestException(
        'La nueva contraseña no puede ser igual a la contraseña actual.',
      );
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.updatePassword(userId, newPasswordHash);

    // El mensaje de abajo promete que se cerró la sesión en todos los
    // dispositivos, y hasta acá no se cerraba ninguna: el método recibía
    // `sessionJti` y no lo usaba. El controlador sólo borra las cookies del
    // navegador que hizo la petición, de modo que cualquier otra sesión —otro
    // dispositivo, o un token robado— seguía sirviendo. Quien cambia su
    // contraseña porque sospecha que le robaron la cuenta necesita justamente
    // lo contrario.
    //
    // `resetPassword` ya las cerraba, dentro de la transacción de
    // `useResetToken`. Los dos caminos ahora coinciden.
    await this.sessionRepository.invalidateAllUserSessions(userId, 'PASSWORD_CHANGED');

    await this.auditRepository.logAuthEvent({ userId, eventType: 'PASSWORD_CHANGED', ...meta });

    return {
      success: true,
      message:
        'Contraseña cambiada exitosamente. Se ha cerrado la sesión en todos los dispositivos.',
    };
  }
}
