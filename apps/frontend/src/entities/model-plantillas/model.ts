// Plantilla de Monitoreo (la registra el Jefe de Gestión).

// Baremo de calificación: Vigente = escala 0-20; Porcentual = %.
export type Baremo = 'Vigente' | 'Porcentual';

export type NivelRomano = 'I' | 'II' | 'III' | 'IV';

// Un nivel de la escala de calificación (cabecera de la plantilla).
export interface NivelCalificacion {
  nivel: NivelRomano;
  /** Nombre de la marca individual, el que ve el evaluador al calificar. */
  denominacion: string;
  /**
   * Nombre del resultado global cuando el instrumento lo llama distinto.
   *
   * La rúbrica directiva nombra «Logro Esperado» la marca de cada rúbrica y
   * «Logrado» el resultado consolidado de ese mismo tramo. Vacío cuando las dos
   * capas coinciden, que es el caso de la rúbrica docente.
   */
  denominacionConsolidado?: string;
  rangoMin: number; // corte mínimo del nivel
  color: string; // hex
}

// Un aspecto evaluado dentro de un desempeño (checklist).
export interface AspectoEvaluado {
  id: string;
  descripcion: string;
}

// Descripción de la rúbrica para un nivel dado.
export interface RubricaNivel {
  nivel: NivelRomano;
  descripcion: string;
}

// Un Eje/Item evaluado dentro de la plantilla (Solo Docente).
export interface EjeItem {
  id: string;
  numero: number;
  descripcion: string;
}

// Un desempeño de la plantilla.
export interface Desempeno {
  id: string;
  nombre: string;
  descripcionCorta: string;
  preguntaExtra?: string;
  aspectos: AspectoEvaluado[];
  rubrica: RubricaNivel[]; // una entrada por nivel (I-IV)
}

// La plantilla de monitoreo completa.
export interface Plantilla {
  id: string;
  tipoMonitoreo: string; // Ej. "Monitoreo Docente"
  anioAcademico: number;
  /**
   * Lema oficial del `anioAcademico`, resuelto por el servidor.
   *
   * Viaja con la plantilla para que la ficha impresa no necesite una consulta
   * aparte. Nulo mientras el año no tenga lema cargado.
   */
  lema: string | null;
  baremo: Baremo;
  niveles: NivelCalificacion[]; // los 4 niveles de la escala
  desempenos: Desempeno[];
  ejesItems?: EjeItem[];
  fechaCreacion: string;
  estado: 'Vigente' | 'Borrador' | 'Historico';
  descripcion: string;
  creadoPorRole?: 'jefe_gestion' | 'director_ie';
  creadoPorId?: string;
  ieId?: string;
  institucionNombre?: string;
}
