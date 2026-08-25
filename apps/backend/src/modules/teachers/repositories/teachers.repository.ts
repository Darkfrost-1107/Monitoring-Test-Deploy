import { CreateDocenteDto } from '../dto/create-docente.dto.js';
import { UpdateDocenteDto } from '../dto/update-docente.dto.js';
import type { Prisma } from '../../../generated/prisma/client.js';

/** Asignación evaluador↔evaluado con las personas de ambos, para reportar conflictos. */
export type AsignacionConflicto = Prisma.AsignacionEvaluadorGetPayload<{
  include: {
    evaluador: { include: { persona: true } };
    evaluado: { include: { persona: true } };
  };
}>;

export interface DocenteEntity {
  id: string;
  personaId: string;
  institucionId: string | null;
  gradoAcademico: string | null;
  nivelEducativo: string;
  modalidad?: string | null;
  especialidad?: string | null;
  especialidadesExtras?: string[];
  cursoAsignado: string | null;
  condicionLaboral?: string | null;
  escalaMagisterial?: number | null;
  estado: string;
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
  docenteCargos: Array<{
    id: string;
    cargoId: string;
    fechaInicio: Date;
    fechaFin: Date | null;
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
}

export interface DocenteFilter {
  institucionId?: string;
  especialistaNivel?: string;
}

export abstract class TeachersRepository {
  abstract findDocenteById(id: string): Promise<DocenteEntity | null>;
  abstract findDocentes(filter?: DocenteFilter): Promise<DocenteEntity[]>;
  abstract findPersonaByDni(dni: string): Promise<any>;
  abstract updateDocenteEstado(id: string, estado: string): Promise<DocenteEntity>;
  abstract bajaDirector(id: string): Promise<DocenteEntity>;
  abstract createDocenteWithTransaction(dto: CreateDocenteDto): Promise<DocenteEntity>;
  abstract updateDocenteWithTransaction(
    id: string,
    dto: UpdateDocenteDto,
    activeCargo: any,
    personaId: string,
  ): Promise<DocenteEntity>;
  abstract transicionEspecialistaADocente(
    personaId: string,
    dto: CreateDocenteDto,
    rolDocenteId: string,
  ): Promise<DocenteEntity>;
  abstract getAsignacionesActivas(evaluadorId: string): Promise<any[]>;
  abstract syncAsignaciones(evaluadorId: string, evaluadoIds: string[]): Promise<void>;
  abstract checkAsignacionesConflict(
    evaluadorId: string,
    evaluadoIds: string[],
  ): Promise<AsignacionConflicto[]>;
}
