import type { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { RestablecerContrasenaData, UsuarioDePersona } from './teachers.repository.js';

export async function findUsuarioPorPersonaId(
  prisma: PrismaService,
  personaId: string,
): Promise<UsuarioDePersona | null> {
  const usuario = await prisma.usuario.findUnique({
    where: { personaId },
    select: { id: true, rol: { select: { codigo: true } } },
  });
  return usuario ? { id: usuario.id, rolCodigo: usuario.rol.codigo } : null;
}

/**
 * `passwordChangedAt` no se toca: la persona todavía no eligió una clave, la
 * dejó puesta otra. El `isFirstLogin` la obliga a cambiarla al ingresar.
 */
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
