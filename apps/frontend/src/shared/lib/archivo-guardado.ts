/**
 * De la ruta guardada de un archivo a la ruta que hay que pedir.
 *
 * El backend guarda rutas relativas al cajón: `/evidencias/evidencias-abc.jpeg`,
 * `/reprogramaciones/reprogramaciones-abc.pdf`. Antes esas rutas se ponían tal
 * cual en un `<img src>` o un `<a href>`, y el navegador las resolvía contra el
 * FRONTEND: ni nginx ni Vite reenvían `/uploads` al backend, así que la imagen
 * salía rota y el enlace abría la aplicación en lugar del documento.
 *
 * Ahora los archivos se piden por `/api/archivos/:cajon/:nombre`, que valida la
 * sesión. Esta función traduce lo guardado a esa ruta, y descarta lo que no
 * corresponde a un cajón conocido.
 */

/** Cajones que el endpoint sabe entregar. Deben coincidir con los del backend. */
const CAJONES = ['evidencias', 'planes', 'reprogramaciones'] as const;

/** Prefijo histórico de las rutas guardadas antes de que existieran los cajones. */
const PREFIJO_VIEJO = '/uploads';

/**
 * Ruta de descarga de un archivo guardado, o `null` si no se reconoce.
 *
 * `null` no es un error a reportar: hay filas viejas con rutas que no siguen
 * este formato, y la pantalla debe poder mostrar «sin archivo» en vez de
 * romperse.
 */
export function rutaDeDescarga(guardada: string | null | undefined): string | null {
  if (!guardada) return null;

  // Una URL absoluta ya apunta a donde tiene que apuntar (un bucket externo, en
  // un despliegue futuro): se respeta sin tocarla.
  if (/^https?:\/\//i.test(guardada)) return guardada;

  const sinPrefijo = guardada.startsWith(PREFIJO_VIEJO)
    ? guardada.slice(PREFIJO_VIEJO.length)
    : guardada;

  const partes = sinPrefijo.split('/').filter((p) => p !== '');
  if (partes.length !== 2) return null;

  const [cajon, nombre] = partes;
  if (!(CAJONES as readonly string[]).includes(cajon)) return null;

  return `/api/archivos/${cajon}/${encodeURIComponent(nombre)}`;
}
