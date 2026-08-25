import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { IFichaMonitoreo } from '@sistema-monitoreo/shared-contracts';
import type { FichaRepository } from '../repositories/ficha.repository.js';
import type { StorageService } from '../../../shared/storage/storage.constants.js';
import type { SaveRespuestaDesempenoDto, SaveRespuestaEjeItemDto } from '../dto/ficha.dto.js';
import type { SessionUser } from '../../../shared/types/session-user.js';
import { assertEsMonitorAsignado } from './evaluador-guard.js';

async function ensurePlantillaVigente(
  repository: FichaRepository,
  ficha: IFichaMonitoreo,
): Promise<void> {
  const plantilla = await repository.findPlantillaBasicById(ficha.plantillaId);
  if (plantilla && plantilla.estado === 'Vigente') return;

  const vigente = plantilla
    ? await repository.findPlantillaVigente(plantilla.tipoMonitoreo, plantilla.anioAcademico)
    : null;

  throw new ConflictException({
    message:
      'La plantilla de esta ficha paso a Historico. Migre las respuestas a la version vigente.',
    code: 'PLANTILLA_VERSIONADA',
    plantillaVigenteId: vigente?.id ?? null,
    plantillaVigenteNombre: vigente?.descripcion ?? null,
  });
}

async function validateBorrador(
  repository: FichaRepository,
  fichaId: string,
  session: SessionUser,
): Promise<IFichaMonitoreo> {
  const ficha = await repository.findById(fichaId);
  if (!ficha) throw new NotFoundException(`Ficha ${fichaId} no encontrada.`);

  // Sólo el monitor asignado a la visita puede modificar su ficha.
  const cronograma = await repository.findCronogramaBasicById(ficha.cronogramaId);
  if (!cronograma) throw new NotFoundException(`Visita ${ficha.cronogramaId} no encontrada.`);
  assertEsMonitorAsignado(session, cronograma.monitorId);

  if (ficha.estado !== 'BORRADOR') {
    throw new BadRequestException(
      `Solo se pueden modificar fichas en BORRADOR. Estado actual: ${ficha.estado}.`,
    );
  }
  return ficha;
}

export async function guardarRespuesta(
  repository: FichaRepository,
  fichaId: string,
  dto: SaveRespuestaDesempenoDto,
  session: SessionUser,
): Promise<IFichaMonitoreo> {
  const ficha = await validateBorrador(repository, fichaId, session);
  await ensurePlantillaVigente(repository, ficha);
  await repository.saveRespuestaDesempeno({
    fichaId,
    desempenoId: dto.desempenoId,
    nivel: dto.nivel,
    observaciones: dto.observaciones,
    preguntaExtraRespuesta: dto.preguntaExtraRespuesta,
  });
  return repository.findById(fichaId) as Promise<IFichaMonitoreo>;
}

export async function guardarRespuestaAspecto(
  repository: FichaRepository,
  fichaId: string,
  aspectoId: string,
  marcado: boolean,
  session: SessionUser,
): Promise<IFichaMonitoreo> {
  const ficha = await validateBorrador(repository, fichaId, session);
  await ensurePlantillaVigente(repository, ficha);
  await repository.saveRespuestaAspecto({ fichaId, aspectoId, marcado });
  return repository.findById(fichaId) as Promise<IFichaMonitoreo>;
}

export async function guardarRespuestaEjeItem(
  repository: FichaRepository,
  fichaId: string,
  dto: SaveRespuestaEjeItemDto,
  session: SessionUser,
): Promise<IFichaMonitoreo> {
  const ficha = await validateBorrador(repository, fichaId, session);
  await ensurePlantillaVigente(repository, ficha);
  await repository.saveRespuestaEjeItem({
    fichaId,
    ejeItemId: dto.ejeItemId,
    nivel: dto.nivel,
    evidenciaUrl: dto.evidenciaUrl ?? null,
    observacion: dto.observacion ?? null,
  });
  return repository.findById(fichaId) as Promise<IFichaMonitoreo>;
}

export async function subirEvidencia(
  repository: FichaRepository,
  storage: StorageService,
  fichaId: string,
  ejeItemId: string,
  file: Express.Multer.File,
  session: SessionUser,
): Promise<string> {
  const ficha = await validateBorrador(repository, fichaId, session);
  await ensurePlantillaVigente(repository, ficha);

  const saved = await storage.savePdf('evidencias', file.originalname, file.buffer);

  const existing = await repository.findRespuestaEjeItemByFichaAndEje(fichaId, ejeItemId);
  const nivel = existing ? existing.nivel : 1;
  await repository.saveRespuestaEjeItem({
    fichaId,
    ejeItemId,
    nivel,
    evidenciaUrl: saved.url,
  });
  return saved.url;
}
