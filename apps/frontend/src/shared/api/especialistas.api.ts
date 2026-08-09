import type {
  ICreateEspecialistaRequest,
  IEspecialistaResponse,
  IQueryEspecialistaRequest,
  IUpdateEspecialistaRequest,
} from '@sistema-monitoreo/shared-contracts';
import { request } from '../config/api.js';

function buildUrl(base: string, query?: Record<string, unknown>): string {
  if (!query) return base;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      params.append(key, String(val));
    }
  });
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export const especialistasApi = {
  findAll: async (
    query?: IQueryEspecialistaRequest,
  ): Promise<{ ok: boolean; data?: IEspecialistaResponse[]; error?: unknown }> => {
    try {
      const data = await request<IEspecialistaResponse[]>(
        buildUrl('/api/especialistas', query as Record<string, unknown>),
      );
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err };
    }
  },

  findById: async (
    id: string,
  ): Promise<{ ok: boolean; data?: IEspecialistaResponse; error?: unknown }> => {
    try {
      const data = await request<IEspecialistaResponse>(`/api/especialistas/${id}`);
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err };
    }
  },

  create: async (
    dto: ICreateEspecialistaRequest,
  ): Promise<{ ok: boolean; data?: IEspecialistaResponse; error?: unknown }> => {
    try {
      const data = await request<IEspecialistaResponse>('/api/especialistas', {
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
    dto: IUpdateEspecialistaRequest,
  ): Promise<{ ok: boolean; data?: IEspecialistaResponse; error?: unknown }> => {
    try {
      const data = await request<IEspecialistaResponse>(`/api/especialistas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(dto),
      });
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err };
    }
  },

  delete: async (
    id: string,
  ): Promise<{ ok: boolean; data?: IEspecialistaResponse; error?: unknown }> => {
    try {
      const data = await request<IEspecialistaResponse>(`/api/especialistas/${id}`, {
        method: 'DELETE',
      });
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err };
    }
  },

  /** Retira los cargos vigentes y deja a la persona activa como Especialista. */
  retirarCargo: async (
    id: string,
  ): Promise<{ ok: boolean; data?: IEspecialistaResponse; error?: unknown }> => {
    try {
      const data = await request<IEspecialistaResponse>(
        `/api/especialistas/${id}/retirar-cargo`,
        { method: 'PATCH' },
      );
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err };
    }
  },

  deactivate: async (
    id: string,
  ): Promise<{ ok: boolean; data?: IEspecialistaResponse; error?: unknown }> => {
    try {
      const data = await request<IEspecialistaResponse>(`/api/especialistas/${id}/baja`, {
        method: 'PATCH',
      });
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err };
    }
  },

  activate: async (
    id: string,
  ): Promise<{ ok: boolean; data?: IEspecialistaResponse; error?: unknown }> => {
    try {
      const data = await request<IEspecialistaResponse>(`/api/especialistas/${id}/alta`, {
        method: 'PATCH',
      });
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err };
    }
  },
};
