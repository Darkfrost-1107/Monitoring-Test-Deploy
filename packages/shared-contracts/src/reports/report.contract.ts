import type { EstadoFicha, NivelLogro } from '../evaluations/ficha.contract.js';
import type { TipoMonitoreo } from '../scheduling/visit.contract.js';

export interface IReporteFicha {
  id: string;
  cronogramaId: string;
  institucionId: string;
  institucionNombre: string;
  institucionCodigoModular: string;
  evaluadoId: string;
  evaluadoNombre: string;
  especialistaId: string;
  especialistaNombre: string;
  tipoMonitoreo: TipoMonitoreo;
  anioAcademico: number;
  nivelLogro: NivelLogro;
  promedio: number;
  puntajeTotal: number;
  estado: EstadoFicha;
  correoEnviado?: boolean;
  fechaEjecucion: string;
  modalidad: string;
  nivel: string;
  firmas?: {
    rolFirmante: string;
    firmanteNombre: string;
    imagenUrl: string;
    fechaFirma: string;
  }[];
}

export interface IReporteResumenIE {
  institucionId: string;
  institucionNombre: string;
  institucionCodigoModular: string;
  totalFichas: number;
  totalDocentes: number;
  totalDirectivos: number;
  promedioInstitucional: number;
  distribucionNivelLogro: Record<NivelLogro, number>;
  porcentajeSatisfaccion: number;
}

export interface IQueryReportesFichas {
  anioAcademico?: number;
  institucionId?: string;
  tipoMonitoreo?: TipoMonitoreo;
  nivelLogro?: NivelLogro;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  limit?: number;
}

export interface IPaginatedReportesFichas {
  data: IReporteFicha[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
