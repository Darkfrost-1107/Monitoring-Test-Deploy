import type {
  ICarpetaPedagogica,
  ICarpetaPedagogicaResponse,
  IGuardarCarpetaPedagogicaRequest,
} from '@sistema-monitoreo/shared-contracts';
import { request } from '../config/api.js';

/**
 * Carpeta pedagógica — enlace al portafolio del docente en Google Drive.
 *
 * Las rutas de escritura son `/mia`: no existe forma de escribir sobre la
 * carpeta de otra persona desde el cliente porque tampoco existe en el
 * servidor. El docente lo resuelve la sesión.
 */
export const carpetaPedagogicaApi = {
  /** Enlace propio del año indicado. `carpeta` es `null` si aún no registró ninguno. */
  mia: (anio: number): Promise<ICarpetaPedagogicaResponse> =>
    request<ICarpetaPedagogicaResponse>(`/api/carpeta-pedagogica/mia?anio=${anio}`),

  /** Registra o reemplaza el enlace propio. */
  guardar: (dto: IGuardarCarpetaPedagogicaRequest): Promise<ICarpetaPedagogica> =>
    request<ICarpetaPedagogica>('/api/carpeta-pedagogica/mia', {
      method: 'PUT',
      body: JSON.stringify(dto),
    }),

  /** Retira el enlace propio del año indicado. */
  eliminar: (anio: number): Promise<{ success: true }> =>
    request<{ success: true }>(`/api/carpeta-pedagogica/mia?anio=${anio}`, {
      method: 'DELETE',
    }),

  /** Enlace de un docente, para quien lo monitorea. */
  deDocente: (docenteId: string, anio: number): Promise<ICarpetaPedagogicaResponse> =>
    request<ICarpetaPedagogicaResponse>(
      `/api/carpeta-pedagogica/docente/${docenteId}?anio=${anio}`,
    ),

};
