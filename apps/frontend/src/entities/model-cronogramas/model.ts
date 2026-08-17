import type { EstadoVisita } from '@sistema-monitoreo/shared-contracts';

export interface Cronograma {
  id: string;
  fechaHora: string; // ISO datetime
  especialista: string;
  especialistaInitials: string;
  institucion: string;
  docenteDirectivo: string;
  tipo: import('@sistema-monitoreo/shared-contracts').TipoMonitoreo;
  nroVisita: string;
  /** Declarado en el contrato compartido; no se redeclara acá. */
  estado: EstadoVisita;
  modalidad: string;
  nivel: string;
  observaciones?: string;
  especialistaCargo?: string;
  monitorId: string;
  evaluadoId?: string;
  institucionId: string;
  monitorEspecialidades?: string[];
}
