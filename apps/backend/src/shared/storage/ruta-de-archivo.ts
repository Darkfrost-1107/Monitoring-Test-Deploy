import * as path from 'node:path';

/**
 * Resolución de la ruta de un archivo guardado en `uploads/`.
 *
 * El nombre y el cajón llegan desde la URL, es decir desde quien pide. Sin
 * comprobar nada, `uploads/../.env` o `uploads/../../etc/passwd` serían rutas
 * válidas para el sistema de archivos y el servidor las leería de buena gana.
 *
 * Se resuelve en dos pasos y no en uno: `basename` descarta cualquier separador
 * de ruta que venga en el nombre, y la comprobación posterior confirma que lo
 * resuelto siga dentro de la raíz. El segundo paso no sobra —cubre los casos
 * que `basename` no ve, como una raíz mal configurada— y es barato.
 */

/** Cajones conocidos. Un valor fuera de esta lista no se resuelve. */
export const CAJONES = ['evidencias', 'planes', 'reprogramaciones'] as const;
export type Cajon = (typeof CAJONES)[number];

export const esCajonConocido = (valor: string): valor is Cajon =>
  (CAJONES as readonly string[]).includes(valor);

/**
 * Ruta absoluta del archivo, o `null` si el pedido no es legítimo.
 *
 * Devuelve `null` en vez de lanzar para que quien llama decida qué responder.
 * En la práctica siempre es 404: distinguir «cajón inválido» de «archivo
 * inexistente» sólo le sirve a quien está probando rutas.
 */
export function rutaDeArchivo(raiz: string, cajon: string, nombre: string): string | null {
  if (!esCajonConocido(cajon)) return null;
  if (!nombre || nombre !== path.basename(nombre)) return null;

  const base = path.resolve(raiz, cajon);
  const absoluta = path.resolve(base, path.basename(nombre));

  return absoluta.startsWith(base + path.sep) ? absoluta : null;
}
