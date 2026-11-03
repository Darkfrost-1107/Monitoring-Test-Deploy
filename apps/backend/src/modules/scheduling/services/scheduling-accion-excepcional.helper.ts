import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { IOperacionExcepcional } from '@sistema-monitoreo/shared-contracts';
import { Capability } from '@sistema-monitoreo/shared-contracts';
import { RoleCode } from '../../../common/enums/role.enum.js';
import type { SessionUser } from '../../../shared/types/session-user.js';
import type { StorageService } from '../../../shared/storage/storage.constants.js';
import type { CronogramaRepository } from '../repositories/cronograma.repository.js';
import type { AccionExcepcionalDto } from '../dto/accion-excepcional.dto.js';

export async function ejecutarAccionExcepcional(
  cronogramaRepo: CronogramaRepository,
  storage: StorageService,
  cronogramaId: string,
  dto: AccionExcepcionalDto,
  session: SessionUser,
): Promise<IOperacionExcepcional> {
  const esAutorizado =
    session.role === RoleCode.JEFE_GESTION ||
    session.role === RoleCode.SUPERUSUARIO ||
    session.capabilities?.includes(Capability.MONITOREO_ACCION_EXCEPCIONAL);

  if (!esAutorizado) {
    throw new ForbiddenException(
      'Solo el Jefe de Gestión Pedagógica o el Superusuario pueden ejecutar acciones excepcionales sobre monitoreos.',
    );
  }

  const cronograma = await cronogramaRepo.findById(cronogramaId);
  if (!cronograma) {
    throw new NotFoundException(`Visita ${cronogramaId} no encontrada.`);
  }

  if (dto.tipoAccion === 'ANULACION_TOTAL' && cronograma.estado === 'ANULADO') {
    throw new BadRequestException('La visita ya se encuentra en estado ANULADO.');
  }

  if (dto.tipoAccion === 'REAPERTURA_FICHA' && cronograma.estado === 'PROGRAMADO') {
    throw new BadRequestException('La visita ya se encuentra en estado PROGRAMADO.');
  }

  let archivoSustentoUrl = '';
  if (dto.archivoSustentoBase64) {
    const buffer = Buffer.from(dto.archivoSustentoBase64, 'base64');
    const filename = dto.archivoSustentoNombre ?? `sustento-${cronogramaId}-${Date.now()}.pdf`;
    const stored = await storage.savePdf('sustentos-excepcionales', filename, buffer);
    archivoSustentoUrl = stored.url;
  }

  return cronogramaRepo.ejecutarAccionExcepcional({
    cronogramaId,
    tipoAccion: dto.tipoAccion,
    numeroExpediente: dto.numeroExpediente.trim(),
    motivo: dto.motivo.trim(),
    archivoSustentoUrl,
    ejecutadoPorId: session.id,
  });
}

export async function findOperacionExcepcionalByCronograma(
  cronogramaRepo: CronogramaRepository,
  cronogramaId: string,
  _session: SessionUser,
): Promise<IOperacionExcepcional | null> {
  const cronograma = await cronogramaRepo.findById(cronogramaId);
  if (!cronograma) {
    throw new NotFoundException(`Visita ${cronogramaId} no encontrada.`);
  }
  return cronogramaRepo.findOperacionExcepcionalByCronograma(cronogramaId);
}
