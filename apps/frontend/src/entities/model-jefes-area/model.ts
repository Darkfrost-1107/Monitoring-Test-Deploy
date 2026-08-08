import type { NivelJefeArea } from '@features/jefes-area/lib/niveles-jefe-area';

export interface JefeArea {
  id: string;
  personaId: string;
  nombres: string;
  apellidos: string;
  dni: string;
  correo: string;
  celular: string;
  cargaHoraria: number;
  /**
   * Nulo cuando la base trae un nivel que no es de Educación Básica Regular.
   * Antes se forzaba a 'Secundaria', que es afirmar un nivel que nadie declaró.
   */
  nivelEducativo: NivelJefeArea | null;
  activo: boolean;
  fechaCreacion: string;
  cargo: string;
  especialidades?: string[] | null;
  especialidad?: string | null;
  especialidadesExtras?: string[] | null;
}
