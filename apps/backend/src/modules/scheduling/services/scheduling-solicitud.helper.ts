import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { ISolicitudReprogramacion } from '@sistema-monitoreo/shared-contracts';
import type { StorageService } from '../../../shared/storage/storage.constants.js';
import type {
  CronogramaRepository,
  SolicitudReprogramacionRepository,
  CreateSolicitudData,
  ResolverSolicitudData,
} from '../repositories/cronograma.repository.js';
import type {
  CreateSolicitudReprogramacionDto,
  ResolverSolicitudDto,
} from '../dto/solicitud-reprogramacion.dto.js';
import { RoleCode } from '../../../common/enums/role.enum.js';
import { ScopeFilter } from '../../../shared/auth/scope-filter.js';
import type { SessionUser } from '../../../shared/types/session-user.js';

export async function findAllSolicitudes(
  solicitudRepo: SolicitudReprogramacionRepository,
  filters?: any,
): Promise<ISolicitudReprogramacion[]> {
  return solicitudRepo.findAll(filters);
}

export async function findSolicitudById(
  solicitudRepo: SolicitudReprogramacionRepository,
  id: string,
): Promise<ISolicitudReprogramacion> {
  const s = await solicitudRepo.findById(id);
  if (!s) throw new NotFoundException(`Solicitud ${id} no encontrada.`);
  return s;
}

export async function crearSolicitud(
  cronogramaRepo: CronogramaRepository,
  solicitudRepo: SolicitudReprogramacionRepository,
  storage: StorageService,
  dto: CreateSolicitudReprogramacionDto,
  session: SessionUser,
): Promise<ISolicitudReprogramacion> {
  const cronograma = await cronogramaRepo.findById(dto.cronogramaId);
  if (!cronograma) throw new NotFoundException(`Visita ${dto.cronogramaId} no encontrada.`);

  const esEspecialista = (session.role as string) === (RoleCode.ESPECIALISTA as string);
  const esSolicitanteIE =
    (session.role as string) === (RoleCode.COORDINADOR_PEDAGOGICO as string) ||
    (session.role as string) === (RoleCode.JEFE_TALLER as string);

  if (!esEspecialista && !esSolicitanteIE) {
    throw new ForbiddenException(
      'Solo los Especialistas (a nivel UGEL) o los Coordinadores Pedagógicos y Jefes de Taller (a nivel IE Secundaria) pueden solicitar reprogramaciones.',
    );
  }

  if (esSolicitanteIE) {
    if (cronograma.nivelEducativo !== 'Secundaria') {
      throw new ForbiddenException(
        'A nivel institucional (IE), solo existe reprogramación en nivel Secundaria.',
      );
    }
    if (session.institucionId && cronograma.institucionId !== session.institucionId) {
      throw new ForbiddenException(
        'Solo puede solicitar reprogramación para visitas de su propia institución.',
      );
    }
  }

  const pendiente = await solicitudRepo.findPendienteByCronograma(dto.cronogramaId);
  if (pendiente) {
    throw new BadRequestException(
      `Ya existe una solicitud PENDIENTE para esta visita. Id: ${pendiente.id}.`,
    );
  }

  let archivoSustentoUrl = '';
  if (dto.archivoSustentoBase64) {
    const buffer = Buffer.from(dto.archivoSustentoBase64, 'base64');
    const stored = await storage.savePdf(
      'reprogramaciones',
      dto.archivoSustentoNombre ?? 'oficio.pdf',
      buffer,
    );
    archivoSustentoUrl = stored.url;
  }

  const data: CreateSolicitudData = {
    cronogramaId: dto.cronogramaId,
    solicitanteId: session.id,
    solicitanteRolAlCrear: session.role,
    fechaOriginal: new Date(cronograma.fechaProgramada),
    horaOriginal: cronograma.horaInicio,
    fechaPropuesta: new Date(dto.fechaPropuesta),
    horaPropuesta: dto.horaPropuesta,
    justificacion: dto.justificacion,
    archivoSustentoUrl,
  };
  return solicitudRepo.create(data);
}

export async function aprobarSolicitud(
  cronogramaRepo: CronogramaRepository,
  solicitudRepo: SolicitudReprogramacionRepository,
  scopeFilter: ScopeFilter,
  id: string,
  dto: ResolverSolicitudDto,
  session: SessionUser,
): Promise<ISolicitudReprogramacion> {
  return resolverSolicitud(
    cronogramaRepo,
    solicitudRepo,
    scopeFilter,
    id,
    'APROBADO',
    dto,
    session,
  );
}

export async function rechazarSolicitud(
  cronogramaRepo: CronogramaRepository,
  solicitudRepo: SolicitudReprogramacionRepository,
  scopeFilter: ScopeFilter,
  id: string,
  dto: ResolverSolicitudDto,
  session: SessionUser,
): Promise<ISolicitudReprogramacion> {
  return resolverSolicitud(
    cronogramaRepo,
    solicitudRepo,
    scopeFilter,
    id,
    'RECHAZADO',
    dto,
    session,
  );
}

async function resolverSolicitud(
  cronogramaRepo: CronogramaRepository,
  solicitudRepo: SolicitudReprogramacionRepository,
  scopeFilter: ScopeFilter,
  id: string,
  estado: 'APROBADO' | 'RECHAZADO',
  dto: ResolverSolicitudDto,
  session: SessionUser,
): Promise<ISolicitudReprogramacion> {
  const solicitud = await solicitudRepo.findById(id);
  if (!solicitud) throw new NotFoundException(`Solicitud ${id} no encontrada.`);

  const cronograma = await cronogramaRepo.findById(solicitud.cronogramaId);
  if (!cronograma) throw new NotFoundException(`Cronograma asociado no encontrado.`);

  const esSolicitudIE =
    solicitud.solicitanteRolAlCrear === (RoleCode.COORDINADOR_PEDAGOGICO as string) ||
    solicitud.solicitanteRolAlCrear === (RoleCode.JEFE_TALLER as string);

  if (esSolicitudIE) {
    // 2do: Nivel IE (Secundaria) -> Dirigida única y exclusivamente a su Director de IE
    if ((session.role as string) !== (RoleCode.DIRECTOR_INSTITUCION as string)) {
      throw new ForbiddenException(
        'Las solicitudes de reprogramación a nivel institucional (IE) están dirigidas única y exclusivamente a su Director de IE.',
      );
    }
    if (cronograma.nivelEducativo !== 'Secundaria') {
      throw new ForbiddenException(
        'A nivel institucional (IE), solo existe reprogramación en nivel Secundaria.',
      );
    }
    if (session.institucionId && cronograma.institucionId !== session.institucionId) {
      throw new ForbiddenException(
        'El Director de IE solo puede resolver solicitudes de su propia institución.',
      );
    }
  } else {
    // 1ro: Nivel UGEL (Especialistas) -> Acepta el Jefe de Gestión o el Jefe de Área de su nivel correspondiente
    if ((session.role as string) === (RoleCode.DIRECTOR_INSTITUCION as string)) {
      throw new ForbiddenException(
        'El Director de IE no puede resolver solicitudes de reprogramación a nivel UGEL.',
      );
    }

    const isAll = scopeFilter.isAllScope(session.role); // Jefe de Gestión
    const isJefeArea = scopeFilter.isJefeAreaScope(session.role); // Jefe de Área

    if (!isAll && !isJefeArea) {
      throw new ForbiddenException(
        'Solo el Jefe de Gestión o el Jefe de Área de su nivel correspondiente pueden resolver reprogramaciones a nivel UGEL.',
      );
    }

    if (isJefeArea) {
      if (cronograma.nivelEducativo !== session.especialistaNivel) {
        throw new ForbiddenException(
          'El Jefe de Área solo puede resolver solicitudes de su propio nivel educativo.',
        );
      }
    }
  }

  if (solicitud.estado !== 'PENDIENTE') {
    throw new BadRequestException(
      `La solicitud ya esta ${solicitud.estado}, no se puede ${estado.toLowerCase()}.`,
    );
  }

  const data: ResolverSolicitudData = {
    estado,
    resueltoPorId: session.id,
    comentarioResolucion: dto.comentario,
  };
  const resuelta = await solicitudRepo.resolver(id, data);

  if (estado === 'APROBADO') {
    await cronogramaRepo.applyReprogramacion(
      solicitud.cronogramaId,
      new Date(solicitud.fechaPropuesta),
      solicitud.horaPropuesta,
    );
  }
  return resuelta;
}
