import type {
  IVisita,
  ISolicitudReprogramacion,
  TipoMonitoreo,
  EstadoVisita,
} from '@sistema-monitoreo/shared-contracts';

export interface CreateVisitaData {
  monitorId: string;
  institucionId: string;
  evaluadoId: string;
  tipoMonitoreo: TipoMonitoreo;
  numeroVisita: number;
  fechaProgramada: Date;
  horaInicio: string;
  modalidad: 'EBR' | 'EBA' | 'EBE' | 'CEPTRO';
  nivelEducativo: string;
  detalles?: string;
  creadoPorId: string | null;
}

export interface UpdateVisitaData {
  fechaProgramada?: Date;
  horaInicio?: string;
  detalles?: string;
  estado?: EstadoVisita;
}

export interface CreateSolicitudData {
  cronogramaId: string;
  solicitanteId: string;
  solicitanteRolAlCrear: string;
  fechaOriginal: Date;
  horaOriginal: string;
  fechaPropuesta: Date;
  horaPropuesta: string;
  justificacion: string;
  archivoSustentoUrl: string;
}

export interface ResolverSolicitudData {
  estado: 'APROBADO' | 'RECHAZADO';
  resueltoPorId: string;
  comentarioResolucion: string;
}

/**
 * Filtros admitidos al listar visitas.
 *
 * Se declaran explícitamente porque el parámetro era `any`: con él, un filtro
 * mal escrito compilaba y la consulta devolvía todo sin acotar, sin aviso.
 */
export interface QueryVisitasFilters {
  estado?: string;
  monitorId?: string;
  institucionId?: string;
  tipoMonitoreo?: string;
  fechaDesde?: string | Date;
  fechaHasta?: string | Date;
  monitorEspecialidades?: string[];
}

/** Filtros admitidos al listar solicitudes de reprogramación. */
export interface QuerySolicitudesFilters {
  cronogramaId?: string;
  solicitanteId?: string;
  estado?: string;
}

export abstract class CronogramaRepository {
  abstract findAll(filters?: QueryVisitasFilters): Promise<IVisita[]>;
  abstract findById(id: string): Promise<IVisita | null>;
  abstract findPlanVigentePara(institucionId: string, anio: number): Promise<string | null>;
  /**
   * La plantilla vigente con la que monitorea ese monitor.
   *
   * Se resuelve por quién ejecuta la visita y no por quién la programa: el
   * director puede programarle visitas al Jefe de Taller, y esa visita usa la
   * plantilla del Jefe de Taller.
   */
  abstract findPlantillaVigentePara(
    tipoMonitoreo: TipoMonitoreo,
    anio: number,
    monitorId: string,
  ): Promise<string | null>;
  /**
   * El estado de las tres entidades que intervienen en una visita.
   *
   * Devuelve además si el evaluado dirige hoy la institución: a un director se
   * lo monitorea sólo con la ficha directiva, y eso hay que saberlo al
   * programar. Va acá y no en una consulta aparte porque al evaluado ya se lo
   * está leyendo.
   */
  abstract validateEntidadesActivas(
    institucionId: string,
    monitorId: string,
    evaluadoId: string,
  ): Promise<{
    institucion: boolean;
    monitor: boolean;
    evaluado: boolean;
    monitorCargo?: string;
    monitorEsDirectorUgel: boolean;
    monitorEspecialidades: string[];
    evaluadoEsDirector: boolean;
    evaluadoEspecialidades: string[];
  }>;
  abstract countPendientesByMonitor(monitorId: string): Promise<number>;
  abstract findVisitaExistente(
    evaluadoId: string,
    anio: number,
    numeroVisita: number,
  ): Promise<IVisita | null>;
  abstract findVisitasMonitorPorFecha(monitorId: string, fechaProgramada: Date): Promise<IVisita[]>;
  abstract create(data: CreateVisitaData): Promise<IVisita>;
  abstract update(id: string, data: UpdateVisitaData): Promise<IVisita>;
  abstract remove(id: string): Promise<void>;
  abstract findMonitorEspecialidades(
    monitorId: string,
  ): Promise<Array<{ especialidad: { nombre: string } }>>;
  abstract applyReprogramacion(
    cronogramaId: string,
    fechaProgramada: Date,
    horaInicio: string,
  ): Promise<void>;
}

export abstract class SolicitudReprogramacionRepository {
  abstract findAll(filters?: QuerySolicitudesFilters): Promise<ISolicitudReprogramacion[]>;
  abstract findById(id: string): Promise<ISolicitudReprogramacion | null>;
  abstract findPendienteByCronograma(
    cronogramaId: string,
  ): Promise<ISolicitudReprogramacion | null>;
  abstract create(data: CreateSolicitudData): Promise<ISolicitudReprogramacion>;
  abstract resolver(id: string, data: ResolverSolicitudData): Promise<ISolicitudReprogramacion>;
}
