import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Capability } from '@sistema-monitoreo/shared-contracts';
import { RoleCode } from '../../../common/enums/role.enum.js';
import { TeachersRepository } from '../repositories/teachers.repository.js';
import type { CurrentUser } from './teachers.service.js';
import {
  getDirectorInstitucionId,
  requirePermission,
  validateInstitucionOwnership,
} from './docente-service.validator.js';

/** Roles del personal de una I.E. cuya clave puede restablecer su director. */
const ROLES_RESTABLECIBLES: readonly string[] = [
  RoleCode.DOCENTE,
  RoleCode.COORDINADOR_PEDAGOGICO,
  RoleCode.JEFE_TALLER,
];

export const EVENTO_RESTABLECIMIENTO_POR_DIRECTOR = 'PASSWORD_RESET_BY_DIRECTOR';

export interface RestablecerContrasenaResponse {
  success: true;
  message: string;
}

@Injectable()
export class RestablecerContrasenaService {
  constructor(
    private readonly teachersRepository: TeachersRepository,
    private readonly configService: ConfigService,
  ) {}

  async restablecer(
    docenteId: string,
    currentUser: CurrentUser,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<RestablecerContrasenaResponse> {
    requirePermission(currentUser, Capability.PERSONAL_RESTABLECER_CONTRASENA);
    if (currentUser.role !== RoleCode.DIRECTOR_INSTITUCION) {
      throw new ForbiddenException('No tiene permisos para realizar esta acción.');
    }
    const institucionId = getDirectorInstitucionId(currentUser);

    const docente = await this.teachersRepository.findDocenteById(docenteId);
    if (!docente) throw new NotFoundException('El personal especificado no existe.');
    validateInstitucionOwnership(currentUser, docente.institucionId);

    const usuario = await this.teachersRepository.findUsuarioPorPersonaId(docente.personaId);
    if (!usuario) throw new NotFoundException('El personal no tiene una cuenta de usuario.');

    if (usuario.id === currentUser.sub) {
      throw new ForbiddenException('No puede restablecer su propia contraseña desde aquí.');
    }
    if (!ROLES_RESTABLECIBLES.includes(usuario.rolCodigo)) {
      throw new ForbiddenException('No puede restablecer la contraseña de este usuario.');
    }

    const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS') ?? 12;
    const passwordHash = await bcrypt.hash(docente.persona.dni, saltRounds);

    await this.teachersRepository.restablecerContrasena({
      usuarioId: usuario.id,
      passwordHash,
      auditoria: {
        actorUsuarioId: currentUser.sub,
        eventType: EVENTO_RESTABLECIMIENTO_POR_DIRECTOR,
        eventDetail: `Restablecida la contraseña del usuario ${usuario.id} (institución ${institucionId})`,
        ...meta,
      },
    });

    return { success: true, message: 'Contraseña restablecida.' };
  }
}
