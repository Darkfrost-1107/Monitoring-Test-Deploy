export type TipoAccionExcepcional = 'ANULACION_TOTAL' | 'REAPERTURA_FICHA';

export interface IAccionExcepcionalInput {
  tipoAccion: TipoAccionExcepcional;
  numeroExpediente: string;
  motivo: string;
  archivoSustentoBase64: string;
  archivoSustentoNombre?: string;
}

export interface IOperacionExcepcional {
  id: string;
  cronogramaId: string;
  fichaId?: string | null;
  tipoAccion: TipoAccionExcepcional;
  numeroExpediente: string;
  motivo: string;
  archivoSustentoUrl: string;
  ejecutadoPorId: string;
  createdAt: string;
}
