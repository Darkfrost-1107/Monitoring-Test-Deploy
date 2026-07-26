export interface SolicitudReprogramacion {
  id: string;
  fechaOriginal: string;
  fechaNueva: string;
  motivo: string;
  archivoNombre: string;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  fechaRegistro: string;
  aprobador?: string;
  aprobadorComentario?: string;
  fechaAprobacion?: string;
  solicitanteRolAlCrear?: string;
}
