export interface SolicitudReprogramacion {
  id: string;
  fechaOriginal: string;
  fechaNueva: string;
  motivo: string;
  /** Sustento adjunto, con su nombre y la URL para abrirlo. */
  adjunto: { nombre: string; url: string } | null;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  fechaRegistro: string;
  aprobador?: string;
  aprobadorComentario?: string;
  fechaAprobacion?: string;
  solicitanteRolAlCrear?: string;
}
