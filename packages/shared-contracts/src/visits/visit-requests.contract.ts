/**
 * Solicitudes de visita: el Director UGEL solicita/prioriza una visita de
 * monitoreo a una IE; el Jefe de Gestión la atiende (agenda) o la rechaza.
 */

export type PrioridadVisita = 'ALTA' | 'NORMAL';
export type EstadoSolicitudVisita = 'PENDIENTE' | 'ATENDIDA' | 'RECHAZADA';

export interface ICrearSolicitudVisitaRequest {
  institucionId: string;
  /** Docente/directivo específico al que hay que visitar (opcional). */
  docenteId?: string;
  motivo?: string;
  prioridad?: PrioridadVisita;
}

export interface IResolverSolicitudVisitaRequest {
  comentario?: string;
  cronogramaId?: string;
}

export interface ISolicitudVisita {
  id: string;
  institucionId: string;
  institucionNombre: string;
  distrito: string;
  docenteId: string | null;
  docenteNombre: string | null;
  motivo: string | null;
  prioridad: PrioridadVisita | string;
  estado: EstadoSolicitudVisita | string;
  solicitanteNombre: string;
  createdAt: string;
  resueltaAt: string | null;
}

export interface ISolicitudesVisitaResponse {
  items: ISolicitudVisita[];
  pendientes: number;
}

/**
 * Detalle de trazabilidad de una solicitud de visita: quién la pidió y su
 * motivo, quién la resolvió y cuándo, y —si fue atendida— el cronograma
 * agendado con el especialista designado.
 */
export interface ISolicitudVisitaDetalle extends ISolicitudVisita {
  /** Comentario del resolutor al atender/rechazar (p. ej. motivo del rechazo). */
  comentario: string | null;
  /** Nombre de quien resolvió (atendió o rechazó) la solicitud. */
  atendidaPorNombre: string | null;
  /** Cronograma agendado al atender la solicitud (si aplica). */
  cronograma: {
    id: string;
    /** Fecha programada de la visita (ISO 8601). */
    fechaProgramada: string;
    /** Hora de inicio (HH:mm:ss). */
    horaInicio: string | null;
    /** Especialista designado (monitor) para la visita. */
    especialistaNombre: string | null;
  } | null;
}
