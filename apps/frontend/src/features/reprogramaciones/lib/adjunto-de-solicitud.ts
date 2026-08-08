/**
 * El sustento adjunto a una solicitud de reprogramación, y quién la resolvió.
 *
 * Los dos se armaban dentro del mapeo de `use-cronogramas-data` y se mostraban
 * en el panel de trazabilidad, que existe justamente para consultar qué se
 * adjuntó y quién decidió. Los dos rellenaban lo que faltaba: el nombre del
 * archivo con «oficio.pdf» y el aprobador con su identificador.
 */

export interface AdjuntoDeSolicitud {
  /** Nombre para mostrar, tomado del final de la URL. */
  nombre: string;
  /** URL con la que se abre el documento. */
  url: string;
}

/** Lo que se muestra cuando la URL no permite deducir un nombre. */
const SIN_NOMBRE = 'Documento adjunto';

/**
 * El adjunto de la solicitud, o nulo si no hay ninguno.
 *
 * El nombre sale del último segmento de la ruta, sin los parámetros de la URL y
 * con los caracteres decodificados. Antes se caía a «oficio.pdf», un documento
 * que nadie adjuntó con ese nombre.
 */
export function adjuntoDeSolicitud(url: string | null | undefined): AdjuntoDeSolicitud | null {
  const limpia = url?.trim();
  if (!limpia) return null;

  return { nombre: nombreLegible(ultimoSegmentoDeLaRuta(limpia)), url: limpia };
}

/**
 * El último tramo de la ruta, sin esquema ni dominio.
 *
 * Se descarta el dominio a propósito: `https://archivos.ugel.pe/` no trae
 * nombre de archivo, y quedarse con el host mostraría «archivos.ugel.pe» como
 * si fuera el documento.
 */
function ultimoSegmentoDeLaRuta(url: string): string | undefined {
  const ruta = /^[a-z][a-z0-9+.-]*:\/\//i.test(url)
    ? url.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, '')
    : url;

  return ruta.split(/[?#]/)[0].split('/').filter(Boolean).pop();
}

/** Un nombre con espacios o tildes viaja codificado en la URL. */
function nombreLegible(segmento: string | undefined): string {
  if (!segmento) return SIN_NOMBRE;

  try {
    return decodeURIComponent(segmento) || SIN_NOMBRE;
  } catch {
    // Una codificación mal formada no debe romper el panel.
    return segmento;
  }
}

/**
 * Quién resolvió la solicitud, con su cargo por delante.
 *
 * Devuelve nulo cuando no hay nombre: el respaldo era el identificador de la
 * persona, de modo que el panel de trazabilidad mostraba un UUID donde debía ir
 * un nombre.
 */
export function nombreDelAprobador(
  cargo: string | null | undefined,
  nombre: string | null | undefined,
): string | null {
  if (!nombre?.trim()) return null;

  return `${cargo?.trim() ?? ''} ${nombre.trim()}`.trim();
}
