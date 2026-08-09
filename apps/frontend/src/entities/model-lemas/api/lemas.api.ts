import type { ILemaAnual } from '@sistema-monitoreo/shared-contracts';
import { request } from '@shared/config/api';

export const lemasApi = {
  /** Devuelve nulo —no un error— cuando el año todavía no tiene lema. */
  findByAnio: (anio: number) => request<ILemaAnual | null>(`/lemas-anuales/${anio}`),

  upsert: (anio: number, lema: string) =>
    request<ILemaAnual>(`/lemas-anuales/${anio}`, {
      method: 'PUT',
      body: JSON.stringify({ lema }),
    }),
};
