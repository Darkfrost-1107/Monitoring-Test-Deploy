export type CondicionLaboral = 'Nombrado' | 'Contratado';

// Condición laboral específica del Director : Designado, Encargado o Por Función.
export type CondicionDirectiva = 'Designado' | 'Encargado' | 'Por Función';

export type EscalaMagisterial = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII' | 'VIII';

export interface SeccionDocente {
  id?: string;
  grado: string;
  seccion: string;
}

export type NivelEducativo = 'INICIAL' | 'PRIMARIA' | 'SECUNDARIA';

export interface Docente {
  id: string;
  /**
   * Persona a la que pertenece este registro docente.
   *
   * Es el vínculo con su registro de especialista: quien dirige o coordina en
   * una I.E. figura en las dos tablas, unidas por `persona_id`. Sin esto, la
   * programación de visitas cruzaba ambas por nombre.
   */
  personaId: string;
  nombres: string;
  apellidos: string;
  dni: string;
  correo: string;
  celular: string;
  nivelEducativo: NivelEducativo;
  condicion: CondicionLaboral | CondicionDirectiva; // directivas solo cuando cargo = 'Director'
  especialidad: string;
  cargaHoraria: number; // horas por semana
  secciones: SeccionDocente[];
  /** Nula cuando el docente no tiene escala magisterial declarada. */
  escala: EscalaMagisterial | null;
  institucionId: string; // Relación con I.E.
  activo: boolean;
  fechaCreacion: string;
  cargo: 'Director' | 'Coordinador Pedagógico' | 'Jefe de Taller' | 'Docente de Aula';
  cargosList?: Array<{
    id: string;
    nombre: string;
    fechaInicio: string;
    fechaFin: string | null;
    esPrincipal: boolean;
  }>;
  evaluadorActual?: {
    id: string;
    evaluadorId: string;
    evaluadorNombres: string;
    evaluadorApellidos: string;
  } | null;
}
