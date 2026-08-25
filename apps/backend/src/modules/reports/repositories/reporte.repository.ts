import type {
  IReporteFicha,
  IReporteResumenIE,
  IAnalisisDesempenoCriterio,
  NivelLogro,
  TipoPlantilla,
} from '@sistema-monitoreo/shared-contracts';
import type { SessionUser } from '../../../shared/types/session-user.js';

export interface QueryFichasCompletadas {
  anioAcademico?: number;
  institucionId?: string;
  /** Modalidad de la visita (EBR, EBA, …); se aplica sobre `cronograma.modalidad`. */
  modalidad?: string;
  /** Nivel educativo de la visita; se aplica sobre `cronograma.nivelEducativo`. */
  nivelEducativo?: string;
  /** Docente evaluado; se aplica sobre `cronograma.evaluadoId`. */
  docenteId?: string;
  /** Número de visita (1er monitoreo, 2do, …); sobre `cronograma.numeroVisita`. */
  numeroVisita?: number;
  /** Instrumento: el repositorio lo aplica sobre `plantilla.tipoMonitoreo`. */
  tipoMonitoreo?: TipoPlantilla;
  /**
   * Plantilla concreta. El análisis por criterio sólo es coherente dentro de una
   * misma rúbrica: al mezclar plantillas (la oficial UGEL con los clones que las
   * IE editan) los criterios se fragmentan. Acotar a una plantilla lo evita.
   */
  plantillaId?: string;
  nivelLogro?: NivelLogro;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedFichas {
  data: IReporteFicha[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export abstract class ReporteRepository {
  abstract findFichasCompletadas(
    filters: QueryFichasCompletadas,
    session: SessionScope,
  ): Promise<PaginatedFichas>;
  abstract findResumenPorIE(
    anioAcademico: number,
    session: SessionScope,
  ): Promise<IReporteResumenIE[]>;
  abstract findFichaByIdParaExport(
    id: string,
    session: SessionScope,
  ): Promise<IReporteFicha | null>;
  abstract findAnalisisDesempenos(
    filters: QueryFichasCompletadas,
    session: SessionScope,
  ): Promise<IAnalisisDesempenoCriterio[]>;
}

export type SessionScope = SessionUser;
