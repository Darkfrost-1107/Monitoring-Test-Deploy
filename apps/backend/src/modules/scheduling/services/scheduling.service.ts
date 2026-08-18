import { Inject, Injectable } from '@nestjs/common';
import { STORAGE_SERVICE, type StorageService } from '../../../shared/storage/storage.constants.js';
import type { IVisita, ISolicitudReprogramacion } from '@sistema-monitoreo/shared-contracts';
import {
  CronogramaRepository,
  SolicitudReprogramacionRepository,
} from '../repositories/cronograma.repository.js';
import type { CreateVisitaDto, UpdateVisitaDto } from '../dto/create-visita.dto.js';
import type {
  CreateSolicitudReprogramacionDto,
  ResolverSolicitudDto,
} from '../dto/solicitud-reprogramacion.dto.js';
import { ScopeFilter } from '../../../shared/auth/scope-filter.js';
import type { SessionUser } from '../../../shared/types/session-user.js';
import {
  findAllVisitas,
  findVisitaById,
  crearVisita,
  actualizarVisita,
  eliminarVisita,
} from './scheduling-cronograma.helper.js';
import {
  findAllSolicitudes,
  findSolicitudById,
  crearSolicitud,
  aprobarSolicitud,
  rechazarSolicitud,
} from './scheduling-solicitud.helper.js';

import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrerrequisitosDirectorService } from '../../monitoring/services/prerrequisitos-director.service.js';

@Injectable()
export class SchedulingService {
  constructor(
    private readonly cronogramaRepo: CronogramaRepository,
    private readonly solicitudRepo: SolicitudReprogramacionRepository,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    private readonly scopeFilter: ScopeFilter,
    private readonly eventEmitter: EventEmitter2,
    private readonly prerrequisitos: PrerrequisitosDirectorService,
  ) {}

  async findAllVisitas(
    filters?: Record<string, unknown>,
    session?: SessionUser,
  ): Promise<IVisita[]> {
    return findAllVisitas(this.cronogramaRepo, this.scopeFilter, filters, session);
  }

  async findVisitaById(id: string, session?: SessionUser): Promise<IVisita> {
    return findVisitaById(this.cronogramaRepo, this.scopeFilter, id, session);
  }

  async crearVisita(dto: CreateVisitaDto, session: SessionUser): Promise<IVisita> {
    // El coordinador y el jefe de taller no programan cronograma hasta que el
    // director de la I.E. subió su plan anual y definió su plantilla.
    await this.prerrequisitos.asegurar(session);
    return crearVisita(this.cronogramaRepo, this.scopeFilter, dto, session);
  }

  async actualizarVisita(id: string, dto: UpdateVisitaDto, session: SessionUser): Promise<IVisita> {
    const actualizada = await actualizarVisita(
      this.cronogramaRepo,
      this.scopeFilter,
      id,
      dto,
      session,
    );
    if (dto.estado === 'REPROGRAMADO' || dto.fechaProgramada || dto.horaInicio) {
      this.eventEmitter.emit('cronograma.reprogramado', { cronogramaId: id, emisorId: session.id });
    }
    return actualizada;
  }

  async eliminarVisita(id: string, session: SessionUser): Promise<void> {
    return eliminarVisita(this.cronogramaRepo, this.scopeFilter, id, session);
  }

  async findAllSolicitudes(filters?: any): Promise<ISolicitudReprogramacion[]> {
    return findAllSolicitudes(this.solicitudRepo, filters);
  }

  async findSolicitudById(id: string): Promise<ISolicitudReprogramacion> {
    return findSolicitudById(this.solicitudRepo, id);
  }

  async crearSolicitud(
    dto: CreateSolicitudReprogramacionDto,
    session: SessionUser,
  ): Promise<ISolicitudReprogramacion> {
    const res = await crearSolicitud(
      this.cronogramaRepo,
      this.solicitudRepo,
      this.storage,
      dto,
      session,
    );
    this.eventEmitter.emit('reprogramacion.solicitada', { solicitudId: res.id });
    return res;
  }

  async aprobarSolicitud(
    id: string,
    dto: ResolverSolicitudDto,
    session: SessionUser,
  ): Promise<ISolicitudReprogramacion> {
    const resuelta = await aprobarSolicitud(
      this.cronogramaRepo,
      this.solicitudRepo,
      this.scopeFilter,
      id,
      dto,
      session,
    );
    this.eventEmitter.emit('reprogramacion.resuelta', {
      solicitudId: id,
      resolutorId: session.id,
      estado: 'APROBADO',
      comentario: dto.comentario,
    });
    return resuelta;
  }

  async rechazarSolicitud(
    id: string,
    dto: ResolverSolicitudDto,
    session: SessionUser,
  ): Promise<ISolicitudReprogramacion> {
    const resuelta = await rechazarSolicitud(
      this.cronogramaRepo,
      this.solicitudRepo,
      this.scopeFilter,
      id,
      dto,
      session,
    );
    this.eventEmitter.emit('reprogramacion.resuelta', {
      solicitudId: id,
      resolutorId: session.id,
      estado: 'RECHAZADO',
      comentario: dto.comentario,
    });
    return resuelta;
  }
}
