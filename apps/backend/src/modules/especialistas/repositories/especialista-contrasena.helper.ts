import type { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { RestablecerContrasenaData } from './especialista.repository.js';

export async function restablecerContrasena(
  prisma: PrismaService,
  { usuarioId, passwordHash, auditoria }: RestablecerContrasenaData,
): Promise<void> {
  const ahora = new Date();
  await prisma.$transaction([
    prisma.usuario.update({
      where: { id: usuarioId },
      data: { passwordHash, isFirstLogin: true, failedLoginAttempts: 0, lockedUntil: null },
    }),
    prisma.sesionAuth.updateMany({
      where: { usuarioId, isActive: true },
      data: { isActive: false, loggedOutAt: ahora, terminatedReason: 'PASSWORD_RESET' },
    }),
    prisma.tokenRecuperacion.updateMany({
      where: { usuarioId, isUsed: false },
      data: { isUsed: true, usedAt: ahora },
    }),
    prisma.logAuditoria.create({
      data: {
        usuarioId: auditoria.actorUsuarioId,
        eventType: auditoria.eventType,
        eventDetail: auditoria.eventDetail,
        ipAddress: auditoria.ipAddress ?? null,
        userAgent: auditoria.userAgent ?? null,
      },
    }),
  ]);
}
