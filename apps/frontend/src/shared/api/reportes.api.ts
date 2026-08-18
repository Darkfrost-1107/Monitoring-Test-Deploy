import type {
  IPaginatedReportesFichas,
  IReporteResumenIE,
  NivelLogro,
  TipoPlantilla,
} from '@sistema-monitoreo/shared-contracts';
import { request, API_BASE_URL } from '../config/api.js';

export const reportesApi = {
  fichasCompletadas: (query?: {
    anioAcademico?: number;
    institucionId?: string;
    tipoMonitoreo?: TipoPlantilla;
    nivelLogro?: NivelLogro;
    fechaDesde?: string;
    fechaHasta?: string;
    page?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
      });
    }
    const qs = params.toString();
    return request<IPaginatedReportesFichas>(`/api/reportes/fichas-completadas${qs ? '?' + qs : ''}`);
  },

  resumenIE: (anio: number) =>
    request<IReporteResumenIE[]>(`/api/reportes/resumen-ie?anio=${anio}`),

  analisisDesempenos: (query?: {
    anioAcademico?: number;
    institucionId?: string;
    tipoMonitoreo?: TipoPlantilla;
    fechaDesde?: string;
    fechaHasta?: string;
  }) => {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
      });
    }
    const qs = params.toString();
    return request<import('@sistema-monitoreo/shared-contracts').IAnalisisDesempenoCriterio[]>(
      `/api/reportes/analisis-desempenos${qs ? '?' + qs : ''}`,
    );
  },

  fichaHTMLUrl: (id: string) => `${API_BASE_URL}/api/reportes/ficha/${id}/export-html`,
  
  enviarFichaCorreo: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/reportes/ficha/${id}/enviar-correo`, {
      method: 'POST',
    }),
};
