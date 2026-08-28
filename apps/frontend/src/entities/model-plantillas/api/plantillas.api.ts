import type {
  IPlantilla,
  IUpdatePlantillaResponse,
  EstadoPlantilla,
  TipoPlantilla,
} from '@sistema-monitoreo/shared-contracts';
import { request } from '@shared/config/api';

export interface CreatePlantillaInput {
  tipoMonitoreo: TipoPlantilla;
  anioAcademico: number;
  baremo: 'Vigente' | 'Porcentual';
  descripcion?: string;
  niveles: {
    nivelRomano: 'I' | 'II' | 'III' | 'IV';
    denominacion: string;
    rangoMin: number;
    color: string;
    orden: number;
  }[];
  desempenos: {
    id: string;
    nombre: string;
    descripcionCorta?: string;
    preguntaExtra?: string;
    orden: number;
    aspectos: { id: string; descripcion: string; orden: number }[];
    rubrica: { nivelRomano: 'I' | 'II' | 'III' | 'IV'; descripcion: string }[];
  }[];
  ejeItems?: { numero: number; descripcion: string }[];
}

export interface UpdatePlantillaInput {
  baremo?: 'Vigente' | 'Porcentual';
  descripcion?: string;
  niveles?: {
    nivelRomano: 'I' | 'II' | 'III' | 'IV';
    denominacion: string;
    rangoMin: number;
    color: string;
    orden: number;
  }[];
  desempenos?: {
    id: string;
    nombre: string;
    descripcionCorta?: string;
    preguntaExtra?: string;
    orden: number;
    aspectos: { id: string; descripcion: string; orden: number }[];
    rubrica: { nivelRomano: 'I' | 'II' | 'III' | 'IV'; descripcion: string }[];
  }[];
  ejeItems?: { numero: number; descripcion: string }[];
}

export const plantillasApi = {
  /**
   * `incluirVersionadas` trae además las plantillas relevadas por una versión
   * nueva que todavía conservan fichas. El catálogo no las quiere; el análisis
   * sí, porque sus fichas son las que mide.
   */
  findAll: (query?: { anioAcademico?: number; tipoMonitoreo?: TipoPlantilla; estado?: EstadoPlantilla; institucionId?: string; incluirVersionadas?: boolean }) => {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params.append(k, String(v));
      });
    }
    const qs = params.toString();
    return request<IPlantilla[]>(`/api/plantillas${qs ? '?' + qs : ''}`);
  },

  findById: (id: string) => request<IPlantilla>(`/api/plantillas/${id}`),

  create: (data: CreatePlantillaInput) =>
    request<IPlantilla>('/api/plantillas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdatePlantillaInput) =>
    request<IUpdatePlantillaResponse>(`/api/plantillas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  cambiarEstado: (id: string, estado: EstadoPlantilla) =>
    request<IPlantilla>(`/api/plantillas/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado }),
    }),

  duplicar: (id: string, descripcion?: string, anioAcademico?: number) =>
    request<IPlantilla>(`/api/plantillas/${id}/duplicar`, {
      method: 'POST',
      body: JSON.stringify({ descripcion, anioAcademico }),
    }),

  delete: (id: string) =>
    request<{ id: string; deletedFichas: number; deletedEvidencias: number }>(`/api/plantillas/${id}`, {
      method: 'DELETE',
    }),

  countFichas: (id: string) =>
    request<{ count: number; estado: 'Borrador' | 'Vigente' | 'Historico' }>(`/api/plantillas/${id}/fichas-count`),
};
