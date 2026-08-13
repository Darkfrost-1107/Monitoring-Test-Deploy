import { request } from '../config/api';
import type { ISignFichaRequest, ISignFichaResponse } from '@sistema-monitoreo/shared-contracts';

export interface FichaFirmaResponse {
  rolFirmante: string;
  imagenUrl: string | null;
  createdAt: string;
}

export const firmasApi = {
  /**
   * Sube una imagen de firma para el perfil del usuario autenticado.
   * La imagen será capturada del canvas o de un archivo.
   * Retorna la URL de la firma guardada.
   */
  uploadFirmaMaster: async (fileBlob: Blob): Promise<{ success: boolean; message: string; firmaUrl: string }> => {
    const formData = new FormData();
    formData.append('firma', fileBlob, 'firma.png');

    return request<{ success: boolean; message: string; firmaUrl: string }>('/api/fichas/me/firma', {
      method: 'PUT',
      body: formData,
    });
  },

  getCurrentFirma: async (): Promise<{ firmaUrl: string | null }> => {
    return request<{ firmaUrl: string | null }>('/api/fichas/me/firma', {
      method: 'GET',
    });
  },

  /**
   * Obtiene las firmas estampadas en una ficha específica.
   */
  getFirmasDeFicha: async (fichaId: string): Promise<{ firmas: FichaFirmaResponse[] }> => {
    return request<{ firmas: FichaFirmaResponse[] }>(`/api/fichas/${fichaId}/firmas`, {
      method: 'GET',
    });
  },

  /**
   * Estampa la firma guardada del usuario en una ficha específica.
   */
  signFicha: async (fichaId: string, data: ISignFichaRequest): Promise<ISignFichaResponse> => {
    return request<ISignFichaResponse>(`/api/fichas/${fichaId}/firmas`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
