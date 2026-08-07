/**
 * Traspaso de una persona ya registrada a un formulario.
 *
 * Fase 6 de PLAN_REMEDIACION.md, H-18. Estas conversiones estaban escritas en
 * los tres formularios de persona —docente, especialista y director—, dentro
 * de `setPersonaFields`. Se ejecutan al autocompletar por DNI y deciden con qué
 * datos queda cargada una persona que ya existe en el padrón.
 */

/** Escala magisterial, de I a VIII, indexada por su número. */
const ESCALA_EN_ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

/** Los cuatro campos que todo formulario de persona comparte. */
export interface DatosBasicosDePersona {
  nombres: string;
  apellidos: string;
  correo: string;
  celular: string;
}

/**
 * Vacío en lugar de ausente: estos valores alimentan campos controlados, y un
 * `undefined` convertiría el campo en no controlado a mitad de la edición.
 */
export const DATOS_BASICOS_VACIOS: DatosBasicosDePersona = {
  nombres: '',
  apellidos: '',
  correo: '',
  celular: '',
};

interface PersonaDelPadron {
  nombres: string;
  apellidos: string;
  correo?: string | null;
  telefono?: string | null;
}

/** Datos de contacto e identidad, con los nombres que usa el formulario. */
export const datosBasicosDePersona = (persona: PersonaDelPadron): DatosBasicosDePersona => ({
  nombres: persona.nombres,
  apellidos: persona.apellidos,
  correo: persona.correo ?? '',
  celular: persona.telefono ?? '',
});

/**
 * Escala magisterial en números romanos.
 *
 * El respaldo lo decide quien llama porque los dos formularios que tenían este
 * mapa no coincidían: el de docente caía a cadena vacía y el de director al
 * nivel I. Se conserva la diferencia en lugar de unificarla a ciegas, y queda
 * a la vista en la llamada.
 */
export const escalaMagisterialARomano = (escala: number | undefined, respaldo: string): string =>
  (escala ? ESCALA_EN_ROMANOS[escala - 1] : undefined) ?? respaldo;

/**
 * Descarta las claves sin valor.
 *
 * Al volcar una persona del padrón, cada campo opcional sólo debe pisar el
 * formulario si viene cargado. Sin esto, cada campo necesita su propio spread
 * condicional y el bloque se vuelve ilegible.
 */
export function soloDefinidos<T extends object>(
  campos: T,
): Partial<{ [K in keyof T]: NonNullable<T[K]> }> {
  return Object.fromEntries(
    Object.entries(campos).filter(
      ([, valor]) => valor !== undefined && valor !== null && valor !== '',
    ),
  ) as Partial<{ [K in keyof T]: NonNullable<T[K]> }>;
}

interface DocenteDelPadron {
  especialidad?: string | null;
  cursoAsignado?: string | null;
}

/**
 * Especialidad del docente.
 *
 * El curso asignado es el respaldo histórico de quienes fueron registrados
 * antes de que existiera el campo de especialidad.
 */
export const especialidadDeDocente = (
  docente: DocenteDelPadron | null | undefined,
): string | undefined => docente?.especialidad || docente?.cursoAsignado || undefined;
