/**
 * Contrato de notificaciones.
 *
 * Canal confiable: in-app (tabla `notificaciones`). El correo es best-effort:
 * se intenta con el MailerService, pero su fallo no rompe la notificación in-app.
 */

export type NotificacionTipo = 'ALERTA_INSTITUCION';

/**
 * Destinatarios posibles de una alerta de institución.
 * - `director_ie`: el Director de la propia IE.
 * - `jefe_area`: el/los Jefe(s) de Área del nivel educativo de la IE.
 */
export type DestinatarioAlerta = 'director_ie' | 'jefe_area';

export interface INotificacion {
  id: string;
  tipo: NotificacionTipo | string;
  titulo: string;
  mensaje: string;
  institucionId: string | null;
  leida: boolean;
  /** ISO 8601. */
  createdAt: string;
  emisorNombre: string | null;
}

export interface INotificacionesResponse {
  items: INotificacion[];
  noLeidas: number;
}

export interface ICrearAlertaInstitucionRequest {
  institucionId: string;
  /** Docente/directivo específico sobre el que se alerta (opcional). */
  docenteId?: string;
  docenteNombre?: string;
  destinatarios: DestinatarioAlerta[];
  mensaje?: string;
}

/** Resultado de un destinatario notificado (o por qué se omitió). */
export interface IResultadoNotificacion {
  rol: DestinatarioAlerta;
  nombre: string | null;
  /** true si se creó la notificación in-app. */
  inApp: boolean;
  /** true si se intentó/envió el correo. */
  email: boolean;
  /** Motivo si no se pudo notificar por algún canal. */
  motivo?: string;
}

export interface ICrearAlertaInstitucionResponse {
  resultados: IResultadoNotificacion[];
}

/**
 * Alerta a nivel DISTRITO dirigida al Jefe de Gestión: se usa cuando un distrito
 * presenta un promedio institucional crítico y requiere intervención general.
 */
export interface ICrearAlertaDistritoRequest {
  distrito: string;
  /** Promedio del distrito (para componer el mensaje); opcional. */
  promedio?: number;
  mensaje?: string;
}

export interface ICrearAlertaDistritoResponse {
  /** Cantidad de Jefes de Gestión notificados (in-app). */
  notificados: number;
}
