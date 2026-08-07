/**
 * Qué error se le muestra al usuario en cada campo de un formulario de persona.
 *
 * Fase 6 de PLAN_REMEDIACION.md, H-18. Estas dos reglas estaban escritas
 * palabra por palabra en los tres formularios —docente, especialista y
 * director—. Deciden si el usuario ve o no el motivo por el que su formulario
 * no se guardó, que es la diferencia entre corregir y volver a intentar a
 * ciegas.
 */

/**
 * Palabras con las que el backend nombra el número de contacto.
 *
 * El error del servidor llega como texto libre: la única forma de saber a qué
 * campo corresponde es buscar la palabra. Se busca en minúsculas y con tilde,
 * tal como estaba; un mensaje que diga «telefono» sin tilde no se reconoce, y
 * ese defecto está fijado en las pruebas.
 */
const NOMBRES_DEL_CELULAR = ['celular', 'teléfono'];

/** ¿El error que devolvió el servidor se refiere al número de contacto? */
export const esErrorDeCelular = (serverError: string | null | undefined): boolean => {
  if (!serverError) return false;
  const enMinusculas = serverError.toLowerCase();
  return NOMBRES_DEL_CELULAR.some((nombre) => enMinusculas.includes(nombre));
};

interface ContextoDeError {
  /** Errores de validación del esquema, indexados por campo. */
  errores: Record<string, string>;
  /** ¿Ya se intentó guardar al menos una vez? */
  enviado: boolean;
  /** Mensaje que devolvió el servidor en el último intento. */
  serverError?: string | null;
}

/**
 * Mensaje a mostrar en un campo, o cadena vacía si no hay nada que decir.
 *
 * Los errores de validación se callan hasta el primer intento de guardado:
 * marcar en rojo un campo que el usuario todavía no terminó de completar es
 * hostil. El error del servidor, en cambio, se muestra de inmediato, porque
 * llega justamente después de que el usuario pidió guardar.
 */
export function mensajeDeError(campo: string, contexto: ContextoDeError): string {
  if (campo === 'celular' && esErrorDeCelular(contexto.serverError)) {
    return contexto.serverError ?? '';
  }

  return contexto.enviado ? (contexto.errores[campo] ?? '') : '';
}
