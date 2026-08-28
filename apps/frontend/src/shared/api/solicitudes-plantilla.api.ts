import type {
  ICrearSolicitudPlantillaRequest,
  IDestinatarioDeVale,
  IResolverSolicitudPlantillaRequest,
  ISolicitudPlantilla,
  ISolicitudesPlantillaResponse,
  IValeDisponible,
} from '@sistema-monitoreo/shared-contracts';
import { request, requestBlob } from '../config/api.js';

/**
 * Solicitudes de plantilla de las instituciones.
 *
 * El alta va como `FormData` porque lleva el PDF de justificación adjunto. El
 * resto del pedido viaja en el mismo envío para que no queden solicitudes sin
 * documento si la segunda petición falla.
 */
export const solicitudesPlantillaApi = {
  crear: (dto: ICrearSolicitudPlantillaRequest, pdf: File): Promise<ISolicitudPlantilla> => {
    const cuerpo = new FormData();
    cuerpo.append('file', pdf);
    cuerpo.append('anioEscolar', String(dto.anioEscolar));
    // `FormData` no transporta objetos: los ítems viajan como JSON y el
    // `ValidationPipe` del backend los vuelve a tipar.
    cuerpo.append('items', JSON.stringify(dto.items));
    return request<ISolicitudPlantilla>('/api/solicitudes-plantilla', {
      method: 'POST',
      body: cuerpo,
    });
  },

  /** Seguimiento de los pedidos de la propia institución. */
  mias: (estado?: string): Promise<ISolicitudesPlantillaResponse> =>
    request<ISolicitudesPlantillaResponse>(
      `/api/solicitudes-plantilla/mias${estado ? `?estado=${estado}` : ''}`,
    ),

  /** Cupos aprobados y sin usar, para la pantalla de creación de plantillas. */
  cupos: (anio: number): Promise<IValeDisponible[]> =>
    request<IValeDisponible[]>(`/api/solicitudes-plantilla/mias/cupos?anio=${anio}`),

  /**
   * Personal de la I.E. al que el director puede destinar una plantilla.
   *
   * Sale del padrón de usuarios activos: quien no está registrado no aparece y
   * no puede recibir un cupo.
   */
  destinatarios: (): Promise<IDestinatarioDeVale[]> =>
    request<IDestinatarioDeVale[]>('/api/solicitudes-plantilla/mias/destinatarios'),

  /** Bandeja del Jefe de Gestión. */
  listar: (estado?: string): Promise<ISolicitudesPlantillaResponse> =>
    request<ISolicitudesPlantillaResponse>(
      `/api/solicitudes-plantilla${estado ? `?estado=${estado}` : ''}`,
    ),

  aprobar: (id: string, body?: IResolverSolicitudPlantillaRequest): Promise<ISolicitudPlantilla> =>
    request<ISolicitudPlantilla>(`/api/solicitudes-plantilla/${id}/aprobar`, {
      method: 'PATCH',
      body: JSON.stringify(body ?? {}),
    }),

  rechazar: (id: string, body: IResolverSolicitudPlantillaRequest): Promise<ISolicitudPlantilla> =>
    request<ISolicitudPlantilla>(`/api/solicitudes-plantilla/${id}/rechazar`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  /**
   * PDF de justificación.
   *
   * Se pide por el endpoint con sesión y no por la ruta del archivo: `uploads/`
   * se sirve estático y sin sesión, de modo que un enlace directo dejaría el
   * documento al alcance de cualquiera que conociera la URL.
   */
  justificacion: (id: string): Promise<Blob> =>
    requestBlob(`/api/solicitudes-plantilla/${id}/justificacion`),
};
