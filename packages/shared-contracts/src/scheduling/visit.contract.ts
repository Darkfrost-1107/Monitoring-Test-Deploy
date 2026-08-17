/**
 * Tipo de una VISITA programada: a quién se monitorea.
 *
 * ── Por qué no incluye DOCENTE_EIB ──
 * EIB no es una clase de visita, es un INSTRUMENTO. Un monitoreo docente puede
 * llevar la ficha regular y/o la Ficha Docente EIB, de modo que el instrumento
 * lo declara la plantilla de cada ficha —`TipoPlantilla`— y no el cronograma.
 * El esquema ya lo dice así (`// DOCENTE | DIRECTIVO` en `cronogramas`) y la
 * pantalla de programación sólo ofrece estos dos.
 *
 * Mientras este tipo admitía el tercer valor, nada distinguía «tipo de visita»
 * de «instrumento»: el mismo campo significaba una cosa u otra según de dónde
 * viniera el dato, y el código lo resolvía olfateando cadenas —`includes('EIB')`
 * en catorce archivos, incluido el NOMBRE de la plantilla—. Quitarlo hace que el
 * compilador marque cada sitio que confundía las dos cosas.
 */
export type TipoMonitoreo = 'DOCENTE' | 'DIRECTIVO';

/**
 * Estados por los que pasa una visita de monitoreo.
 *
 * Fase 6 de PLAN_REMEDIACION.md, H-16. Se declara como arreglo además del tipo
 * para poder recorrerlos, y para que las tablas que asignan presentación a cada
 * estado se tipen con `Record<EstadoVisita, …>`: así, agregar un estado nuevo
 * rompe la compilación en cada tabla que lo omita en lugar de caer en silencio
 * a un valor por defecto.
 */
export const ESTADOS_VISITA = [
  'PROGRAMADO',
  'EN_PROCESO',
  'COMPLETADO',
  'REPROGRAMADO',
  'CANCELADO',
  'ANULADO',
] as const;

export type EstadoVisita = (typeof ESTADOS_VISITA)[number];

/**
 * Cómo se nombra cada estado al usuario.
 *
 * `ANULADO` es una baja lógica: la visita se retira del cronograma pero su
 * número queda disponible para reemitirse. No es lo mismo que `CANCELADO`, que
 * conserva el registro de que estaba prevista y no se hizo.
 */
export const ETIQUETAS_ESTADO_VISITA: Record<EstadoVisita, string> = {
  PROGRAMADO: 'Programado',
  EN_PROCESO: 'En Proceso',
  COMPLETADO: 'Realizado',
  REPROGRAMADO: 'Reprogramado',
  CANCELADO: 'Cancelado',
  ANULADO: 'Anulado',
};

export type EstadoSolicitudReprogramacion = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

export type Modalidad = 'EBR' | 'EBA' | 'EBE' | 'CEPTRO';

export interface IVisita {
  id: string;
  monitorId: string;
  institucionId: string;
  evaluadoId: string;
  planId: string | null;
  tipoMonitoreo: TipoMonitoreo;
  numeroVisita: number;
  fechaProgramada: string;
  horaInicio: string;
  detalles: string | null;
  estado: EstadoVisita;
  modalidad: Modalidad;
  nivelEducativo: string;
  creadoPorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateVisitaRequest {
  monitorId: string;
  institucionId: string;
  evaluadoId: string;
  tipoMonitoreo: TipoMonitoreo;
  numeroVisita: number;
  fechaProgramada: string;
  horaInicio: string;
  detalles?: string;
  modalidad: Modalidad;
  nivelEducativo: string;
}

export interface IUpdateVisitaRequest {
  fechaProgramada?: string;
  horaInicio?: string;
  detalles?: string;
  estado?: EstadoVisita;
}

export interface IPlanCobertura {
  id: string;
  planId: string;
  institucionId: string;
}

export interface ISolicitudReprogramacion {
  id: string;
  cronogramaId: string;
  solicitanteId: string;
  solicitanteRolAlCrear: string;
  fechaOriginal: string;
  horaOriginal: string;
  fechaPropuesta: string;
  horaPropuesta: string;
  justificacion: string;
  archivoSustentoUrl: string;
  estado: EstadoSolicitudReprogramacion;
  resueltoPorId: string | null;
  resueltoPorNombre?: string | null;
  resueltoPorRol?: string | null;
  comentarioResolucion: string | null;
  fechaResolucion: string | null;
  createdAt: string;
}

export interface ICreateSolicitudReprogramacionRequest {
  cronogramaId: string;
  fechaPropuesta: string;
  horaPropuesta: string;
  justificacion: string;
  archivoSustentoBase64?: string;
  archivoSustentoNombre?: string;
}

export interface IResolverSolicitudRequest {
  comentario: string;
}

export interface IQueryVisitas {
  monitorId?: string;
  institucionId?: string;
  estado?: EstadoVisita;
  fechaDesde?: string;
  fechaHasta?: string;
  tipoMonitoreo?: TipoMonitoreo;
}
