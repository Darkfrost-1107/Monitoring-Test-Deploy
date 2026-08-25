export type NivelLogro =
  | 'INICIO'
  | 'EN_PROCESO'
  | 'LOGRO_ESPERADO'
  | 'LOGRO_DESTACADO';

export type EstadoFicha = 'BORRADOR' | 'FINALIZADO' | 'MIGRADA';

export interface IFichaContexto {
  id: string;
  areaCurricular: string | null;
  grado: string | null;
  seccion: string | null;
  cantidadEstudiantes: number | null;
  cantidadEstudiantesNee: number | null;
  cursoId: string | null;
}

export interface IFichaRespuestaDesempeno {
  id: string;
  fichaId: string;
  desempenoId: string;
  nivel: number;
  observaciones: string | null;
  preguntaExtraRespuesta: boolean | null;
}

export interface IFichaRespuestaAspecto {
  id: string;
  fichaId: string;
  aspectoId: string;
  marcado: boolean;
}

export interface IFichaRespuestaEjeItem {
  id: string;
  fichaId: string;
  ejeItemId: string;
  nivel: number;
  evidenciaUrl: string | null;
  observacion: string | null;
}

export interface IFichaMonitoreo {
  id: string;
  cronogramaId: string;
  plantillaId: string;
  plantillaVersion: number;
  fichaContextoId: string;
  anioAcademico: number;
  /** Nulos cuando el instrumento es informativo (EIB): no produce puntaje ni nivel. */
  puntajeTotal: number | null;
  promedio: number | null;
  nivelLogro: NivelLogro | null;
  estado: EstadoFicha;
  contexto: IFichaContexto;
  respuestasDesempeno: IFichaRespuestaDesempeno[];
  respuestasAspecto: IFichaRespuestaAspecto[];
  respuestasEjeItem: IFichaRespuestaEjeItem[];
  creadoPorId: string | null;
  finalizadaPorId: string | null;
  observaciones: string | null;
  sugerencias: string | null;
  compromisos: string | null;
  evidenciaGeneral: string | null;
  requiereMigracion: boolean;
  plantillaHistoricaId: string | null;
  createdAt: string;
  finalizadaAt: string | null;
}

export interface ICreateFichaRequest {
  cronogramaId: string;
  contexto: {
    areaCurricular?: string;
    grado?: string;
    seccion?: string;
    cantidadEstudiantes?: number;
    cantidadEstudiantesNee?: number;
    cursoId?: string;
  };
}

export interface ISaveBorradorRequest {
  desempenoId: string;
  nivel: number;
}

export interface ISaveRespuestasAspectoRequest {
  aspectoId: string;
  marcado: boolean;
}

export interface IFinalizarFichaRequest {
  observaciones?: string;
}

export interface IMigrarPlantillaRequest {
  plantillaId: string;
}

export interface IHistorialItem {
  id: string; // ID de la ficha
  fecha: string; // Fecha de la visita (cronograma)
  promedio: number;
  nivelLogro: string; // INICIO | EN_PROCESO | LOGRO_ESPERADO | LOGRO_DESTACADO
  observaciones: string | null;
}

export type IHistorialPedagogicoResponse = IHistorialItem[];
