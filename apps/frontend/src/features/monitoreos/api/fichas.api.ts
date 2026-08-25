import type { IFichaMonitoreo, IHistorialPedagogicoResponse } from '@sistema-monitoreo/shared-contracts';
import { request, requestBlob } from '@shared/config/api';

export interface CreateFichaInput {
  cronogramaId: string;
  plantillaId?: string;
  areaCurricular?: string;
  grado?: string;
  seccion?: string;
  cantidadEstudiantes?: number;
  cantidadEstudiantesNee?: number;
  cursoId?: string;
}

export interface SaveRespuestaDesempenoInput {
  desempenoId: string;
  nivel: number;
}

export const fichasApi = {
  findByVisita: (cronogramaId: string) =>
    request<IFichaMonitoreo | null>(`/api/fichas/visita/${cronogramaId}`),

  findAllByVisita: (cronogramaId: string) =>
    request<IFichaMonitoreo[]>(`/api/fichas/visita/${cronogramaId}/todas`),

  findByVisitaYPlantilla: (cronogramaId: string, plantillaId: string) =>
    request<IFichaMonitoreo | null>(`/api/fichas/visita/${cronogramaId}/plantilla/${plantillaId}`),

  findById: (id: string) => request<IFichaMonitoreo>(`/api/fichas/${id}`),

  create: (data: CreateFichaInput) =>
    request<IFichaMonitoreo>('/api/fichas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  saveRespuestaDesempeno: (fichaId: string, desempenoId: string, nivel: number, observaciones?: string, preguntaExtraRespuesta?: boolean) =>
    request<IFichaMonitoreo>(`/api/fichas/${fichaId}/respuestas-desempeno`, {
      method: 'PATCH',
      body: JSON.stringify({ desempenoId, nivel, observaciones, preguntaExtraRespuesta }),
    }),

  saveRespuestaAspecto: (fichaId: string, aspectoId: string, marcado: boolean) =>
    request<IFichaMonitoreo>(`/api/fichas/${fichaId}/respuestas-aspecto/${aspectoId}`, {
      method: 'PATCH',
      body: JSON.stringify({ marcado }),
    }),

  saveRespuestaEjeItem: (
    fichaId: string,
    ejeItemId: string,
    nivel: number,
    evidenciaUrl?: string,
    observacion?: string,
  ) =>
    request<IFichaMonitoreo>(`/api/fichas/${fichaId}/respuestas-eje-item`, {
      method: 'PATCH',
      body: JSON.stringify({ ejeItemId, nivel, evidenciaUrl, observacion }),
    }),

  subirEvidenciaEjeItem: (fichaId: string, ejeItemId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<{ evidenciaUrl: string }>(`/api/fichas/${fichaId}/eje-item/${ejeItemId}/evidencia`, {
      method: 'POST',
      body: formData,
      headers: {},
    });
  },

  finalizar: (fichaId: string, observaciones?: string, sugerencias?: string, compromisos?: string, evidenciaGeneral?: string) =>
    request<IFichaMonitoreo>(`/api/fichas/${fichaId}/finalizar`, {
      method: 'PATCH',
      body: JSON.stringify({ observaciones, sugerencias, compromisos, evidenciaGeneral }),
    }),

  migrarPlantilla: (fichaId: string, plantillaId: string) =>
    request<IFichaMonitoreo>(`/api/fichas/${fichaId}/migrar-plantilla`, {
      method: 'POST',
      body: JSON.stringify({ plantillaId }),
    }),

  getHistorial: (evaluadoId: string, tipoMonitoreo?: string) =>
    request<IHistorialPedagogicoResponse>(
      `/api/fichas/historial/${evaluadoId}${
        tipoMonitoreo ? `?tipoMonitoreo=${encodeURIComponent(tipoMonitoreo)}` : ''
      }`,
    ),

  descargarPdf: (fichaId: string) =>
    requestBlob(`/api/reportes/ficha/${fichaId}/pdf`),
};
