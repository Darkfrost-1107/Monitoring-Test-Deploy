export interface ICreateDocenteRequest {
  dni: string;
  nombres: string;
  apellidos: string;
  correo?: string;
  telefono?: string;
  institucionId: string;
  gradoAcademico?: string;
  nivelEducativo: string;
  modalidad?: string;
  /** Especialidad principal del docente (Secundaria). */
  especialidad?: string;
  /** Especialidades adicionales que el docente también dicta (plana corta). */
  especialidadesExtras?: string[];
  cursoAsignado?: string;
  cargoId: string;
  condicionLaboral?: string;
  cargaLaboral?: number;
  escalaMagisterial?: number;
  secciones?: { grado: string; seccion: string }[];
}

export interface IUpdateDocenteRequest {
  nombres: string;
  apellidos: string;
  correo?: string;
  telefono?: string;
  gradoAcademico?: string;
  nivelEducativo: string;
  modalidad?: string;
  /** Especialidad principal del docente (Secundaria). */
  especialidad?: string;
  /** Especialidades adicionales que el docente también dicta (plana corta). */
  especialidadesExtras?: string[];
  cursoAsignado?: string;
  cargoId: string;
  condicionLaboral?: string;
  cargaLaboral?: number;
  escalaMagisterial?: number;
  institucionId?: string;
  secciones?: { grado: string; seccion: string }[];
}

export interface IDocenteResponse {
  id: string;
  personaId: string;
  institucionId: string;
  gradoAcademico: string | null;
  nivelEducativo: string;
  modalidad?: string | null;
  /** Todas las especialidades unidas por coma, la principal primero. */
  especialidad?: string | null;
  /** Especialidades adicionales (sin la principal), para editarlas por separado. */
  especialidadesExtras?: string[];
  cursoAsignado: string | null;
  condicionLaboral?: string | null;
  escalaMagisterial?: number | null;
  estado: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  persona: {
    id: string;
    dni: string;
    nombres: string;
    apellidos: string;
    correo: string | null;
    telefono: string | null;
  };
  docenteCargos: Array<{
    id: string;
    cargoId: string;
    fechaInicio: Date | string;
    fechaFin: Date | string | null;
    esPrincipal: boolean;
    cargo: {
      id: string;
      nombre: string;
    };
  }>;
  docenteSecciones?: Array<{
    id: string;
    grado: string;
    seccion: string;
  }>;
  evaluadorActual?: {
    id: string;
    evaluadorId: string;
    evaluadorNombres: string;
    evaluadorApellidos: string;
  } | null;
  docenteAreas?: Array<{
    id: string;
    areaId: string;
    area: {
      id: string;
      nombre: string;
    };
  }>;
  evaluadoresAsignados?: Array<{
    id: string;
    evaluadorId: string;
    evaluador: {
      id: string;
      persona: { nombres: string; apellidos: string; };
    }
  }>;
  docentesAevaluar?: Array<{
    id: string;
    evaluadoId: string;
    evaluado: {
      id: string;
      persona: { nombres: string; apellidos: string; };
    }
  }>;
}

export interface IBajaDocenteResponse {
  success: boolean;
  message: string;
  docente: {
    id: string;
    estado: string;
    persona: {
      dni: string;
      nombres: string;
      apellidos: string;
    };
  };
}
