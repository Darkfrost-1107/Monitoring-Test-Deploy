export interface IEspecialistaResponse {
  id: string;
  personaId: string;
  especialidades?: string[] | null;
  especialidad?: string | null;
  especialidadesExtras?: string[] | null;
  nivelEducativo: string;
  modalidad?: string | null;
  estado: string;
  /** `true` mientras la cuenta conserva la clave inicial (DNI): aún no la cambió o se restableció. */
  contrasenaInicial?: boolean;
  cargaLaboral?: number | null;
  cargo: string;
  condicionLaboral?: string | null;
  escalaMagisterial?: number | null;
  createdAt: Date;
  updatedAt: Date;
  persona: {
    id: string;
    dni: string;
    nombres: string;
    apellidos: string;
    correo: string | null;
    telefono: string | null;
  };
  user?: {
    id: string;
    role: {
      code: string;
      name: string;
    };
  };
}

export interface IQueryEspecialistaRequest {
  estado?: string;
  especialidad?: string;
  nivelEducativo?: string;
  cargo?: string;
}

export interface ICreateEspecialistaRequest {
  dni: string;
  nombres: string;
  apellidos: string;
  correo?: string;
  telefono?: string;
  /** 'Especialista' | 'Jefe de Área' | 'Jefe de Gestión' */
  cargo: string;
  modalidad: string;
  especialidades?: string[];
  especialidad?: string;
  especialidadesExtras?: string[];
  nivelEducativo: string;
  rolCode: string;
  condicionLaboral?: string;
  cargaLaboral?: number;
  escalaMagisterial?: number | null;
}

export interface IUpdateEspecialistaRequest {
  nombres: string;
  apellidos: string;
  correo?: string;
  telefono?: string;
  /** 'Especialista' | 'Jefe de Área' | 'Jefe de Gestión' */
  cargo: string;
  modalidad: string;
  especialidades?: string[];
  especialidad?: string;
  especialidadesExtras?: string[];
  nivelEducativo: string;
  estado: string;
  rolCode: string;
  condicionLaboral?: string;
  cargaLaboral?: number;
  escalaMagisterial?: number | null;
}
