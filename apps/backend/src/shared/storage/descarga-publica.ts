/**
 * Qué se puede descargar de `uploads/` sin sesión.
 *
 * ── Por qué esto es una lista de lo PERMITIDO y no de lo prohibido ──
 * `express.static` no pide sesión: todo lo que quede bajo `uploads/` es
 * descargable por cualquiera que conozca la URL. La versión anterior era una
 * lista de exclusiones —primero las firmas, después los justificantes de
 * solicitud—, de modo que cada archivo nuevo nacía público hasta que alguien se
 * acordara de agregarlo. Así fue exactamente como el PDF de las solicitudes
 * terminó al alcance de cualquiera.
 *
 * Invertida, la regla se sostiene sola: lo que no esté declarado acá no se
 * publica, y agregar una función nueva no abre nada por olvido.
 *
 * Hoy la lista está VACÍA a propósito. Todo lo que vive en `uploads/` —firmas,
 * justificaciones, planes, sustentos de reprogramación y evidencias de ficha—
 * pertenece a una persona o a una institución, y cada uno se entrega por un
 * endpoint que valida la sesión y acota el alcance.
 */

/**
 * Patrones de archivo que sí pueden servirse sin sesión.
 *
 * Vacío significa que nada bajo `uploads/` es público. Si algún día hiciera
 * falta publicar algo —un logotipo, una plantilla en blanco—, se agrega su
 * patrón acá y queda a la vista de quien lea este archivo.
 */
const PATRONES_PUBLICOS: readonly RegExp[] = [];

/** Si una ruta bajo `uploads/` puede entregarse sin validar la sesión. */
export function esDescargaPublica(ruta: string): boolean {
  return PATRONES_PUBLICOS.some((patron) => patron.test(ruta));
}
