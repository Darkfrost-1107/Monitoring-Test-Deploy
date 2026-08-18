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
  /** Instrumento: el repositorio lo aplica sobre `plantilla.tipoMonitoreo`. */
  tipoMonitoreo?: TipoPlantilla;
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
