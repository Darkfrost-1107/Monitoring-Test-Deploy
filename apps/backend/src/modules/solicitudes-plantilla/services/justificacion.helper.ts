/**
 * Si un nombre de archivo corresponde a la justificación de una solicitud.
 *
 * `main.ts` lo usa para dejar de publicarlos: `uploads/` se sirve estático y no
 * exige sesión, de modo que el PDF sería descargable por cualquiera que
 * conociera la URL. Se entregan por `GET /api/solicitudes-plantilla/:id/
 * justificacion`, que valida la sesión y acota por institución.
 *
 * Mismo criterio y misma forma que `esArchivoDeFirma`.
 */
export function esJustificacionDeSolicitud(ruta: string): boolean {
  return /(^|\/)solicitud-plantilla-[0-9a-fA-F-]+\.pdf$/.test(ruta);
}
