import type { NivelLogro } from '../evaluations/ficha.contract.js';

/**
 * Contrato del Dashboard del Director de Institución.
 *
 * Agrega, para la IE del director autenticado:
 *   - KPIs de monitoreo (docentes monitoreados / pendientes / nivel promedio).
 *   - Semáforo institucional (distribución de docentes por nivel de logro).
 *   - Monitoreos recientes (últimas fichas finalizadas de la IE).
 *
 * El mapa (ubicación geográfica) se incorpora en una fase posterior, cuando
 * las II.EE. tengan coordenadas (latitud/longitud) en el modelo.
 */

export interface IDirectorDashboardInstitucion {
  id: string;
  nombre: string;
  codigoModular: string;
  nivelEducativo: string;
  distrito: string;
}

export interface IDirectorDashboardKpis {
  /** Total de docentes registrados en la IE. */
  totalDocentes: number;
  /** Docentes con al menos una ficha finalizada (monitoreados). */
  monitoreados: number;
  /** Docentes sin ficha finalizada (pendientes). */
  pendientes: number;
  /** Promedio institucional de la rúbrica (0.00 a 4.00). */
  nivelPromedio: number;
  /** Porcentaje de cobertura de monitoreo (monitoreados / totalDocentes * 100). */
  porcentajeCobertura: number;
}

export interface IDirectorDashboardSemaforo {
  /** Docentes en INICIO (situación crítica / rojo). */
  critico: number;
  /** Docentes en EN_PROCESO (en seguimiento / naranja). */
  enProceso: number;
  /** Docentes en LOGRO_ESPERADO o LOGRO_DESTACADO (logro previsto / verde). */
  logroPrevisto: number;
  /** Docentes sin ficha finalizada (sin registro). */
  sinRegistro: number;
}

export interface IDirectorDashboardMonitoreoReciente {
  fichaId: string;
  docenteNombre: string;
  especialistaNombre: string;
  nivelEducativo: string;
  /** Fecha de finalización de la ficha (ISO 8601). */
  fecha: string;
  /**
   * El monitoreo EIB es informativo: registra la práctica (No/Parcial/Sí) pero
   * no produce una nota ni un nivel de logro, de modo que no lleva insignia.
   */
  esInformativo: boolean;
  /** Nulos cuando el instrumento es informativo (EIB). */
  nivelLogro: NivelLogro | null;
  promedio: number | null;
}

/**
 * Un docente con el nivel de su última ficha de rúbrica. Se usa tanto para los
 * focos de atención (INICIO/EN_PROCESO, del promedio más bajo al más alto) como
 * para los destacados (LOGRO_ESPERADO/DESTACADO, del más alto al más bajo).
 */
export interface IDirectorDashboardFoco {
  docenteId: string;
  docenteNombre: string;
  nivelLogro: NivelLogro;
  promedio: number;
  /** Ficha que sustenta el nivel, para abrir su detalle. */
  fichaId: string;
}

export interface IDirectorDashboardResponse {
  institucion: IDirectorDashboardInstitucion | null;
  kpis: IDirectorDashboardKpis;
  semaforo: IDirectorDashboardSemaforo;
  monitoreosRecientes: IDirectorDashboardMonitoreoReciente[];
  /** Docentes en situación crítica o en seguimiento, para priorizar. */
  focosDeAtencion: IDirectorDashboardFoco[];
  /** Docentes con mejor nivel de logro, como contrapeso positivo a los focos. */
  docentesDestacados: IDirectorDashboardFoco[];
}
