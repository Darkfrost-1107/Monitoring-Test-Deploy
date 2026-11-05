import type {
  IVisita,
  ISolicitudReprogramacion,
  EstadoSolicitudReprogramacion,
  TipoMonitoreo,
  EstadoVisita,
  IAccionExcepcionalInput,
  IOperacionExcepcional,
} from '@sistema-monitoreo/shared-contracts';
import { request } from '@shared/config/api';

export interface CreateVisitaInput {
  monitorId: string;
  institucionId: string;
  evaluadoId: string;
  tipoMonitoreo: TipoMonitoreo;
  numeroVisita: number;
  fechaProgramada: string;
  horaInicio: string;
  modalidad: 'EBR' | 'EBA' | 'EBE' | 'CEPTRO';
  nivelEducativo: string;
  detalles?: string;
}

export interface CreateSolicitudInput {
  cronogramaId: string;
  fechaPropuesta: string;
  horaPropuesta: string;
  justificacion: string;
  archivoSustentoBase64?: string;
  archivoSustentoNombre?: string;
}

export const cronogramasApi = {
  findAll: (query?: { monitorId?: string; institucionId?: string; estado?: EstadoVisita; tipoMonitoreo?: TipoMonitoreo; fechaDesde?: string; fechaHasta?: string }) => {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
      });
    }
    const qs = params.toString();
    return request<IVisita[]>(`/api/cronogramas${qs ? '?' + qs : ''}`);
  },

  findById: (id: string) => request<IVisita>(`/api/cronogramas/${id}`),

  create: (data: CreateVisitaInput) =>
    request<IVisita>('/api/cronogramas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<CreateVisitaInput> & { estado?: EstadoVisita }) =>
    request<IVisita>(`/api/cronogramas/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  remove: (id: string) => request<void>(`/api/cronogramas/${id}`, { method: 'DELETE' }),

  // Solicitudes de reprogramacion
  findAllSolicitudes: (query?: { cronogramaId?: string; estado?: EstadoSolicitudReprogramacion }) => {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params.append(k, String(v));
      });
    }
    const qs = params.toString();
    return request<ISolicitudReprogramacion[]>(`/api/solicitudes-reprogramacion${qs ? '?' + qs : ''}`);
  },

  findSolicitudById: (id: string) => request<ISolicitudReprogramacion>(`/api/solicitudes-reprogramacion/${id}`),

  crearSolicitud: (data: CreateSolicitudInput) =>
    request<ISolicitudReprogramacion>('/api/solicitudes-reprogramacion', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  aprobarSolicitud: (id: string, comentario: string) =>
    request<ISolicitudReprogramacion>(`/api/solicitudes-reprogramacion/${id}/aprobar`, {
      method: 'POST',
      body: JSON.stringify({ comentario }),
    }),

  rechazarSolicitud: (id: string, comentario: string) =>
    request<ISolicitudReprogramacion>(`/api/solicitudes-reprogramacion/${id}/rechazar`, {
      method: 'POST',
      body: JSON.stringify({ comentario }),
    }),

  ejecutarAccionExcepcional: (id: string, data: IAccionExcepcionalInput) =>
    request<IOperacionExcepcional>(`/api/cronogramas/${id}/accion-excepcional`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  findOperacionExcepcional: (id: string) =>
    request<IOperacionExcepcional | null>(`/api/cronogramas/${id}/operacion-excepcional`),
};
