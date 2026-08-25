import type { NivelLogro } from '../evaluations/ficha.contract.js';

/**
 * Contrato del Dashboard del Director UGEL (vista provincial).
 *
 * Agrega, a nivel de toda la UGEL (o del scope del rol que consulte):
 *   - KPIs institucionales (total de II.EE., monitoreadas, pendientes, nivel promedio).
 *   - Semáforo institucional (II.EE. clasificadas por su promedio institucional).
 *   - Monitoreos recientes (últimas fichas finalizadas de la provincia).
 *
 * El mapa georreferencial se incorpora en una fase posterior, cuando las
 * II.EE. tengan coordenadas (latitud/longitud) en el modelo.
 */

export interface IUgelDashboardKpis {
  /** Total de II.EE. activas en el scope. */
  totalInstituciones: number;
  /** II.EE. con al menos un monitoreo COMPLETADO en el año. */
  monitoreadas: number;
  /** II.EE. sin monitoreo completado en el año. */
  pendientes: number;
  /** Promedio provincial de la rúbrica (0.00 a 4.00). */
  nivelPromedio: number;
  /** Porcentaje de cobertura de monitoreo (monitoreadas / total * 100). */
  porcentajeCobertura: number;
}

export interface IUgelDashboardSemaforo {
  /** II.EE. con promedio institucional en INICIO (crítico / rojo). */
  critico: number;
  /** II.EE. en EN_PROCESO (en seguimiento / naranja). */
  enProceso: number;
  /** II.EE. en LOGRO_ESPERADO o LOGRO_DESTACADO (logro previsto / verde). */
  logroPrevisto: number;
  /** II.EE. sin ficha finalizada (sin registro). */
  sinRegistro: number;
}

export interface IUgelDashboardMonitoreoReciente {
  fichaId: string;
  institucionNombre: string;
  institucionCodigoModular: string;
  nivelEducativo: string;
  distrito: string;
  especialistaNombre: string;
  /** Fecha de finalización de la ficha (ISO 8601). */
  fecha: string;
  /** El monitoreo EIB es informativo: no lleva nota ni nivel, por eso no se rotula. */
  esInformativo: boolean;
  /** Nulos cuando el instrumento es informativo (EIB). */
  nivelLogro: NivelLogro | null;
  promedio: number | null;
}

/** Docente/directivo con desempeño crítico (última ficha en INICIO). */
export interface IDocenteCritico {
  docenteId: string;
  nombre: string;
  /** 'Docente' | 'Directivo' (según el tipo de monitoreo). */
  cargo: string;
  /**
   * Especialidad(es) del docente (ej. "CTA", "Matematica"), separadas por coma.
   * Null si el docente no tiene especialidad registrada (ej. muchos directivos).
   */
  especialidad: string | null;
  promedio: number;
  nivelLogro: NivelLogro;
  /** Cantidad de monitoreos finalizados que recibió el docente en el año. */
  monitoreosCompletados: number;
}

/**
 * IE con docentes/directivos que requieren atención (versión detallada por
 * institución), usada por el módulo "Focos de Atención" (Jefe de Gestión, Jefe
 * de Área y Especialistas).
 */
export interface IUgelDashboardCriticaIe {
  institucionId: string;
  nombre: string;
  distrito: string;
  nivelEducativo: string;
  docentes: IDocenteCritico[];
}

/** IE crítica (promedio institucional en INICIO) dentro de un distrito. */
export interface IUgelDashboardIeCriticaDistrito {
  institucionId: string;
  nombre: string;
  nivelEducativo: string;
  promedio: number;
}

/**
 * Distrito con promedio institucional crítico (INICIO), para "Requieren atención".
 * El foco pasa de la IE individual al distrito: se notifica al Jefe de Gestión
 * sobre los distritos con menor desempeño, con el desglose de sus II.EE. críticas.
 */
export interface IUgelDashboardDistritoCritico {
  distrito: string;
  /** Promedio del distrito (media de los promedios institucionales monitoreados). */
  promedio: number;
  /** II.EE. del distrito con monitoreo (para el denominador del promedio). */
  totalInstituciones: number;
  /** II.EE. del distrito en nivel crítico, para el desglose expandible. */
  institucionesCriticas: IUgelDashboardIeCriticaDistrito[];
}

/** Cobertura de monitoreo agregada por distrito. */
export interface IUgelDashboardDistrito {
  distrito: string;
  totalInstituciones: number;
  monitoreadas: number;
  porcentajeCobertura: number;
  /** Promedio de la rúbrica de las II.EE. monitoreadas del distrito (0 si ninguna). */
  nivelPromedio: number;
}

/** Punto de la evolución mensual de monitoreos finalizados en el año. */
export interface IUgelDashboardEvolucionMes {
  /** Mes 1–12. */
  mes: number;
  /** Monitoreos (fichas) finalizados ese mes. */
  monitoreos: number;
}

/** Fila del ranking de especialistas por actividad de monitoreo. */
export interface IUgelDashboardEspecialistaRanking {
  especialistaId: string;
  nombre: string;
  /** Monitoreos (fichas) finalizados por el especialista en el año. */
  monitoreos: number;
  /** Promedio de la rúbrica de sus monitoreos (0.00 a 4.00). */
  promedio: number;
}

/** Distrito cuyo promedio empeoró respecto al año anterior (alerta de deterioro). */
export interface IUgelDashboardDistritoDeterioro {
  distrito: string;
  promedioActual: number;
  promedioPrevio: number;
  /** promedioActual - promedioPrevio (negativo = deterioro). */
  delta: number;
}

/** Docente/directivo monitoreado en una IE (su última ficha finalizada del año). */
export interface IInstitucionDetalleDocente {
  docenteId: string;
  nombre: string;
  /** 'Docente' | 'Directivo' (según el tipo de monitoreo). */
  cargo: string;
  /** Especialidad(es) del docente, separadas por coma. Null si no tiene. */
  especialidad: string | null;
  nivelLogro: NivelLogro;
  promedio: number;
}

/** Detalle de una IE, mostrado al hacer clic en su punto del mapa. */
export interface IUgelDashboardInstitucionDetalle {
  institucionId: string;
  nombre: string;
  codigoModular: string;
  distrito: string;
  nivelEducativo: string;
  /** Nombre del director de la IE, o null si no tiene director registrado. */
  director: string | null;
  /** Total de docentes activos de la IE (dato institucional, sin escopar). */
  totalDocentes: number;
  /** Monitoreos completados en el año, escopados por el rol de quien consulta. */
  monitoreosRealizados: number;
  /** Monitoreos programados en el año, escopados por el rol de quien consulta. */
  monitoreosProgramados: number;
  /** Cobertura = realizados / programados * 100 (sobre el scope del consultante). */
  porcentajeCobertura: number;
  /**
   * Docentes/directivos monitoreados en esta IE (última ficha finalizada del
   * año), escopados por el rol de quien consulta: el especialista ve solo los
   * que él monitoreó. Incluye la especialidad para validar el foco por área.
   */
  docentesMonitoreados: IInstitucionDetalleDocente[];
}

export type EstadoSemaforoIe = 'critico' | 'enProceso' | 'logroPrevisto' | 'sinRegistro';

/** IE geolocalizada para el mapa (marcador por su estado de monitoreo). */
export interface IUgelDashboardIeMapa {
  institucionId: string;
  nombre: string;
  distrito: string;
  nivelEducativo: string;
  latitud: number;
  longitud: number;
  estado: EstadoSemaforoIe;
}

export interface IUgelDashboardResponse {
  anio: number;
  kpis: IUgelDashboardKpis;
  semaforo: IUgelDashboardSemaforo;
  /** Distritos con promedio crítico, ordenados por menor promedio (Director UGEL). */
  distritosCriticos: IUgelDashboardDistritoCritico[];
  /** II.EE. críticas con sus docentes/directivos en INICIO (módulo Focos de Atención). */
  requierenAtencion: IUgelDashboardCriticaIe[];
  /** Ranking de cobertura por distrito (incluye nivel promedio del distrito). */
  coberturaPorDistrito: IUgelDashboardDistrito[];
  /** II.EE. geolocalizadas para el mapa (marcadores). */
  institucionesMapa: IUgelDashboardIeMapa[];
  /** % de cobertura del año anterior (para la tendencia del héroe); 0 si no hay datos. */
  coberturaAnioPrevio: number;
  monitoreosRecientes: IUgelDashboardMonitoreoReciente[];
  /** Evolución mensual de monitoreos finalizados en el año (12 meses). */
  evolucionMensual: IUgelDashboardEvolucionMes[];
  /** Ranking de especialistas por número de monitoreos (top). */
  rankingEspecialistas: IUgelDashboardEspecialistaRanking[];
  /** Distritos que empeoraron su promedio respecto al año anterior. */
  distritosDeterioro: IUgelDashboardDistritoDeterioro[];
  /** Años con datos de monitoreo (para el selector de año). Descendente. */
  aniosDisponibles: number[];
}
