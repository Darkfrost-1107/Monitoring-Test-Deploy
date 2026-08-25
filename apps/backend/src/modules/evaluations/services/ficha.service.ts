import { Inject, Injectable } from '@nestjs/common';
import type {
  IFichaMonitoreo,
  IHistorialPedagogicoResponse,
} from '@sistema-monitoreo/shared-contracts';
import { FichaRepository } from '../repositories/ficha.repository.js';
import { STORAGE_SERVICE, type StorageService } from '../../../shared/storage/storage.constants.js';
import { BaremoCalculatorService } from '../motor/baremo-calculator.service.js';
import { ScopeFilter } from '../../../shared/auth/scope-filter.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { SessionUser } from '../../../shared/types/session-user.js';
import type {
  CreateFichaDto,
  SaveRespuestaDesempenoDto,
  SaveRespuestaEjeItemDto,
  FinalizarFichaDto,
} from '../dto/ficha.dto.js';
import {
  findByVisitaId,
  findByVisitaYPlantilla,
  findAllByVisitaId,
  findById,
} from './ficha-read.helper.js';
import { crear } from './ficha-create.helper.js';
import {
  guardarRespuesta,
  guardarRespuestaAspecto,
  guardarRespuestaEjeItem,
  subirEvidencia,
} from './ficha-respuesta.helper.js';
import { finalizar, migrarPlantilla } from './ficha-finalizar.helper.js';

@Injectable()
export class FichaService {
  constructor(
    private readonly repository: FichaRepository,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    private readonly baremoService: BaremoCalculatorService,
    private readonly scopeFilter: ScopeFilter,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findByVisitaId(
    cronogramaId: string,
    session: SessionUser,
  ): Promise<IFichaMonitoreo | null> {
    return findByVisitaId(this.repository, cronogramaId, session);
  }

  async findByVisitaYPlantilla(
    cronogramaId: string,
    plantillaId: string,
    session: SessionUser,
  ): Promise<IFichaMonitoreo | null> {
    return findByVisitaYPlantilla(this.repository, cronogramaId, plantillaId, session);
  }

  async findAllByVisitaId(cronogramaId: string, session: SessionUser): Promise<IFichaMonitoreo[]> {
    return findAllByVisitaId(this.repository, cronogramaId, session);
  }

  async findById(id: string, session: SessionUser): Promise<IFichaMonitoreo> {
    return findById(this.repository, this.scopeFilter, id, session);
  }

  async crear(dto: CreateFichaDto, session: SessionUser): Promise<IFichaMonitoreo> {
    return crear(this.repository, dto, session);
  }

  async guardarRespuesta(
    fichaId: string,
    dto: SaveRespuestaDesempenoDto,
    session: SessionUser,
  ): Promise<IFichaMonitoreo> {
    return guardarRespuesta(this.repository, fichaId, dto, session);
  }

  async guardarRespuestaAspecto(
    fichaId: string,
    aspectoId: string,
    marcado: boolean,
    session: SessionUser,
  ): Promise<IFichaMonitoreo> {
    return guardarRespuestaAspecto(this.repository, fichaId, aspectoId, marcado, session);
  }

  async guardarRespuestaEjeItem(
    fichaId: string,
    dto: SaveRespuestaEjeItemDto,
    session: SessionUser,
  ): Promise<IFichaMonitoreo> {
    return guardarRespuestaEjeItem(this.repository, fichaId, dto, session);
  }

  async subirEvidencia(
    fichaId: string,
    ejeItemId: string,
    file: Express.Multer.File,
    session: SessionUser,
  ): Promise<string> {
    return subirEvidencia(this.repository, this.storage, fichaId, ejeItemId, file, session);
  }

  async finalizar(
    fichaId: string,
    dto: FinalizarFichaDto,
    session: SessionUser,
  ): Promise<IFichaMonitoreo> {
    const result = await finalizar(this.repository, this.baremoService, fichaId, dto, session);

    // Emitir evento de forma asíncrona
    this.eventEmitter.emit('ficha.finalizada', {
      fichaId: result.id,
      session,
    });

    return result;
  }

  async migrarPlantilla(
    fichaId: string,
    nuevaPlantillaId: string,
    session: SessionUser,
  ): Promise<IFichaMonitoreo> {
    return migrarPlantilla(this.repository, fichaId, nuevaPlantillaId, session);
  }

  async getHistorial(
    evaluadoId: string,
    session: SessionUser,
    tipoMonitoreo?: string,
  ): Promise<IHistorialPedagogicoResponse> {
    // Aquí se podrían agregar validaciones extra si se requiere que
    // un especialista solo vea el historial de docentes a su cargo.
    // Por el momento se asume que si tiene acceso al módulo (verificado en Controller)
    // puede consultar el historial del docente evaluado en cuestión.
    void session;
    return this.repository.getHistorial(evaluadoId, tipoMonitoreo);
  }
}
