import type { EstadoFicha, NivelLogro } from '../evaluations/ficha.contract.js';
import type { TipoPlantilla } from '../plantillas/plantilla.contract.js';

export interface IReporteFicha {
  id: string;
  cronogramaId: string;
  plantillaId?: string;
  plantillaNombre?: string;
  institucionId: string;
  institucionNombre: string;
  institucionCodigoModular: string;
  evaluadoId: string;
  evaluadoNombre: string;
  evaluadoDni?: string;
  evaluadoTelefono?: string;
  especialistaId: string;
  especialistaNombre: string;
  /**
   * Instrumento con el que se llenó esta ficha.
   *
   * Sale de la plantilla, que es donde vive esa información, y NO del tipo de la
   * visita. Se llamaba `tipoMonitoreo` y el mapeador lo llenaba con
   * `f.plantilla?.tipoMonitoreo || f.cronograma.tipoMonitoreo`: el mismo campo
   * traía el instrumento o el tipo de visita según los datos, así que ningún
   * consumidor podía confiar en él y todos terminaban olfateando cadenas.
   */
  instrumento: TipoPlantilla;
  anioAcademico: number;
  nivelLogro: NivelLogro;
  promedio: number;
  puntajeTotal: number;
  estado: EstadoFicha;
  observaciones?: string | null;
  compromisos?: string | null;
  sugerencias?: string | null;
  correoEnviado?: boolean;
  fechaEjecucion: string;
  fechaProgramada?: string;
  horaInicio?: string;
  horaFin?: string;
  modalidad: string;
  nivel: string;
  respuestas?: {
    nombre: string;
    orden?: number;
    nivel: number;
    observaciones?: string | null;
  }[];
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
  /** Filtra por instrumento: el backend lo aplica sobre `plantilla.tipoMonitoreo`. */
  instrumento?: TipoPlantilla;
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

export interface IAnalisisDesempenoCriterio {
  desempenoId: string;
  nombre: string;
  orden: number;
  descripcionCorta: string | null;
  totalEvaluados: number;
  conteoNivelI: number;
  conteoNivelII: number;
  conteoNivelIII: number;
  conteoNivelIV: number;
  porcentajeNivelI: number;
  porcentajeNivelII: number;
  porcentajeNivelIII: number;
  porcentajeNivelIV: number;
  promedio: number;
  tasaLogro: number;
  tasaRefuerzo: number;
}
