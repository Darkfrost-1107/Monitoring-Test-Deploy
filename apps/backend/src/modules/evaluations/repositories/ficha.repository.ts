import type {
  IFichaMonitoreo,
  IFichaContexto,
  IFichaRespuestaDesempeno,
  IFichaRespuestaAspecto,
  IFichaRespuestaEjeItem,
  NivelLogro,
  IHistorialPedagogicoResponse,
  TramoDeEscala,
  ModoDeBaremo,
} from '@sistema-monitoreo/shared-contracts';

export interface CreateFichaData {
  cronogramaId: string;
  plantillaId: string;
  anioAcademico: number;
  contexto: Omit<IFichaContexto, 'id'>;
  creadoPorId: string;
}

export interface SaveRespuestaData {
  fichaId: string;
  desempenoId: string;
  nivel: number;
  observaciones?: string;
  preguntaExtraRespuesta?: boolean;
}

export interface SaveRespuestaEjeItemData {
  fichaId: string;
  ejeItemId: string;
  nivel: number;
  evidenciaUrl?: string | null;
  observacion?: string | null;
}

export interface SaveRespuestaAspectoData {
  fichaId: string;
  aspectoId: string;
  marcado: boolean;
}

export interface FinalizarFichaData {
  fichaId: string;
  finalizadoPorId: string;
  observaciones?: string;
  sugerencias?: string;
  compromisos?: string;
}

export interface CronogramaBasic {
  id: string;
  estado: string;
  tipoMonitoreo: string;
  fechaProgramada: Date;
  evaluadoId: string;
  /** Especialista asignado como monitor de la visita. Decide quién puede
   * registrar o modificar su ficha (se compara con `session.especialistaId`). */
  monitorId: string;
}

/** Los cortes de una plantilla y cómo se leen. */
export interface EscalaDePlantilla {
  modo: ModoDeBaremo;
  tramos: TramoDeEscala[];
  /** Tipo del instrumento; el EIB (DOCENTE_EIB) es informativo y no se baremiza. */
  tipoMonitoreo: string;
}

export interface PlantillaBasic {
  id: string;
  estado: string;
  tipoMonitoreo: string;
  anioAcademico: number;
  descripcion: string | null;
  /** Institución dueña. `null` en las del catálogo de la UGEL. */
  institucionId: string | null;
  /** Quien la creó. Decide quién puede aplicarla si es de una institución. */
  autorId: string;
}

export abstract class FichaRepository {
  abstract findByVisitaId(cronogramaId: string): Promise<IFichaMonitoreo | null>;
  abstract findByVisitaYPlantilla(
    cronogramaId: string,
    plantillaId: string,
  ): Promise<IFichaMonitoreo | null>;
  abstract findAllByVisitaId(cronogramaId: string): Promise<IFichaMonitoreo[]>;
  abstract findById(id: string): Promise<IFichaMonitoreo | null>;
  abstract create(data: CreateFichaData): Promise<IFichaMonitoreo>;
  abstract saveRespuestaDesempeno(data: SaveRespuestaData): Promise<IFichaRespuestaDesempeno>;
  abstract saveRespuestaAspecto(data: SaveRespuestaAspectoData): Promise<IFichaRespuestaAspecto>;
  abstract saveRespuestaEjeItem(data: SaveRespuestaEjeItemData): Promise<IFichaRespuestaEjeItem>;
  abstract finalizar(
    fichaId: string,
    puntajeTotal: number | null,
    promedio: number | null,
    nivelLogro: NivelLogro | null,
    finalizadaPorId: string,
    observaciones?: string,
    sugerencias?: string,
    compromisos?: string,
    evidenciaGeneral?: string,
  ): Promise<IFichaMonitoreo>;
  abstract plantillaEstaHistorica(plantillaId: string): Promise<boolean>;

  abstract findPlantillaVigente(tipo: string, anio: number): Promise<PlantillaBasic | null>;
  abstract findCronogramaBasicById(id: string): Promise<CronogramaBasic | null>;
  abstract findCursoBasicById(id: string): Promise<{ id: string } | null>;
  abstract findDocenteCursoByDocenteId(docenteId: string): Promise<{ cursoId: string } | null>;
  abstract findFirstCursoBasic(): Promise<{ id: string } | null>;
  abstract findPlantillaBasicById(id: string): Promise<PlantillaBasic | null>;

  /**
   * Escala de calificación que la plantilla declara, con su modo de lectura.
   *
   * Es lo que decide el nivel de logro. La rúbrica docente corta sobre el
   * puntaje (5·8·13·18) y la directiva sobre el porcentaje de avance
   * (25·50·75·100), de modo que los cortes no significan lo mismo sin el modo.
   *
   * Una plantilla sin niveles cargados devuelve la lista vacía y el cálculo cae
   * a los umbrales sobre el promedio.
   */
  abstract findEscalaDePlantilla(plantillaId: string): Promise<EscalaDePlantilla>;
  abstract updateCronogramaEstado(id: string, estado: string): Promise<void>;
  abstract findRespuestaEjeItemByFichaAndEje(
    fichaId: string,
    ejeItemId: string,
  ): Promise<{ nivel: number } | null>;
  abstract migrarPlantilla(
    fichaId: string,
    nuevaPlantillaId: string,
    oldDesempenos: Array<{ id: string; nivel: number }>,
    oldAspectos: Array<{ id: string; marcado: boolean }>,
  ): Promise<IFichaMonitoreo>;
  abstract existsWithScope(id: string, scopeWhere: Record<string, unknown>): Promise<boolean>;
  abstract getHistorial(
    evaluadoId: string,
    tipoMonitoreo?: string,
  ): Promise<IHistorialPedagogicoResponse>;
}
