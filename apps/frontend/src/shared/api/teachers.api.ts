import type {
  ICreateDocenteRequest,
  IDocenteResponse,
  IUpdateDocenteRequest,
  IBajaDocenteResponse,
} from '@sistema-monitoreo/shared-contracts';
import { request } from '../config/api.js';

export const teachersApi = {
  findAll: async (): Promise<{ ok: boolean; data?: IDocenteResponse[]; error?: unknown }> => {
    try {
      const data = await request<IDocenteResponse[]>('/api/docentes');
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err };
    }
  },

  create: async (
    dto: ICreateDocenteRequest,
  ): Promise<{ ok: boolean; data?: IDocenteResponse; error?: unknown }> => {
    try {
      const data = await request<IDocenteResponse>('/api/docentes', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err };
    }
  },

  update: async (
    id: string,
    dto: IUpdateDocenteRequest,
  ): Promise<{ ok: boolean; data?: IDocenteResponse; error?: unknown }> => {
    try {
      const data = await request<IDocenteResponse>(`/api/docentes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(dto),
      });
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err };
    }
  },

  deactivate: async (
    id: string,
  ): Promise<{ ok: boolean; data?: IBajaDocenteResponse; error?: unknown }> => {
    try {
      const data = await request<IBajaDocenteResponse>(`/api/docentes/${id}/baja`, {
        method: 'PATCH',
      });
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err };
    }
  },

  activate: async (
    id: string,
  ): Promise<{ ok: boolean; data?: IBajaDocenteResponse; error?: unknown }> => {
    try {
      const data = await request<IBajaDocenteResponse>(`/api/docentes/${id}/alta`, {
        method: 'PATCH',
      });
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err };
    }
  },

  restablecerContrasena: async (
    id: string,
  ): Promise<{ ok: boolean; data?: { success: boolean; message: string }; error?: unknown }> => {
    try {
      const data = await request<{ success: boolean; message: string }>(
        `/api/docentes/${id}/restablecer-contrasena`,
        { method: 'POST' },
      );
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err };
    }
  },

  getCargos: async (): Promise<{
    ok: boolean;
    data?: Array<{ id: string; nombre: string }>;
    error?: unknown;
  }> => {
    try {
      const data = await request<Array<{ id: string; nombre: string }>>('/api/docentes/cargos');
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err };
    }
  },

  findByDni: async (
    dni: string,
  ): Promise<{ ok: boolean; data?: unknown; error?: unknown }> => {
    try {
      const data = await request<unknown>(`/api/docentes/buscar/${dni}`);
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err };
    }
  },

  findPersonaByDni: async (dni: string): Promise<{ ok: boolean; data?: unknown; error?: unknown }> => {
    try {
      const data = await request<unknown>(`/api/docentes/buscar/${dni}`);
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err };
    }
  },

  getAsignaciones: async (evaluadorId: string): Promise<{ ok: boolean; data?: { evaluadoId: string }[]; error?: unknown }> => {
    try {
      const data = await request<{ evaluadoId: string }[]>(`/api/docentes/${evaluadorId}/asignaciones`);
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err };
    }
  },

  saveAsignaciones: async (
    evaluadorId: string,
    evaluadoIds: string[],
  ): Promise<{ ok: boolean; data?: { success: boolean; message: string }; error?: unknown }> => {
    try {
      const data = await request<{ success: boolean; message: string }>(`/api/docentes/${evaluadorId}/asignaciones`, {
        method: 'POST',
        body: JSON.stringify({ evaluadoIds }),
      });
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err };
    }
  },

  finalizeCargo: async (
    docenteId: string,
    docenteCargoId: string,
  ): Promise<{ ok: boolean; data?: unknown; error?: unknown }> => {
    try {
      const data = await request<unknown>(
        `/api/docentes/${docenteId}/cargos/${docenteCargoId}/fin`,
        { method: 'PATCH', body: JSON.stringify({}) },
      );
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err };
    }
  },
};
