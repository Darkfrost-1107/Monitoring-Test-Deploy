import { MODALIDAD_NIVEL_MAP } from '@sistema-monitoreo/shared-contracts';
import { ESCALAS_MAGISTERIALES } from '@entities/model-docentes/escala';
import {
  ESPECIALIDADES_DE_SECUNDARIA,
  normalizarArea,
  areaYaUsada,
} from '@shared/lib/especialidades-secundaria';

/**
 * Las reglas del perfil de un especialista de UGEL.
 *
 * Vivían dentro de `EspecialistaFormBase`: la validación propia del cargo en un
 * `useMemo`, el catálogo de escalas escrito dos veces en el mismo archivo, y el
 * manejo de las especialidades repartido entre tres manejadores.
 */

/** Valor con el que el selector de escala declara que no hay ninguna. */
export const SIN_ESCALA = 'none';

/**
 * Especialidades que puede tener un especialista de Primaria.
 *
 * Se aceptan también sin tildes: así llegan desde registros antiguos y desde
 * el `cursoAsignado` que el autocompletado por DNI trae del docente.
 */
export const ESPECIALIDADES_DE_PRIMARIA = ['PIP', 'Educación Física'] as const;

const ESPECIALIDADES_DE_PRIMARIA_ACEPTADAS = new Set([
  'pip',
  'educación física',
  'educacion fisica',
]);

/**
 * Especialidades que puede tener un especialista de Secundaria: las mismas
 * áreas curriculares oficiales que usa el formulario de docente, para que el
 * cruce entre ambos (asignación de evaluador por especialidad) coincida.
 */
const ESPECIALIDADES_DE_SECUNDARIA_ACEPTADAS = new Set(
  ESPECIALIDADES_DE_SECUNDARIA.map(normalizarArea),
);

/** Cargos cuya especialidad se rige por el nivel educativo. */
const CARGOS_CON_ESPECIALIDAD = ['Especialista', 'Jefe de Área'];

/** Opciones del selector de escala magisterial, derivadas de la escala misma. */
export const OPCIONES_DE_ESCALA: { value: string; label: string }[] = [
  { value: SIN_ESCALA, label: 'Ninguna / No aplica' },
  ...ESCALAS_MAGISTERIALES.map((romano, indice) => ({
    value: String(indice + 1),
    label: `Escala ${romano}`,
  })),
];

interface PerfilValidable {
  cargo: string;
  nivelEducativo: string;
  especialidad?: string | null;
}

/**
 * Errores propios del cargo, que el esquema de Zod no expresa.
 *
 * Se aplican encima de los del esquema dentro de `usePersonForm`.
 */
export function erroresDelPerfil(perfil: PerfilValidable): Record<string, string> {
  if (!CARGOS_CON_ESPECIALIDAD.includes(perfil.cargo)) return {};

  const especialidad = perfil.especialidad?.trim();

  if (perfil.nivelEducativo === 'Secundaria' && !especialidad) {
    return { especialidad: 'La especialidad principal es requerida para el nivel Secundaria' };
  }

  if (
    perfil.nivelEducativo === 'Secundaria' &&
    especialidad &&
    !ESPECIALIDADES_DE_SECUNDARIA_ACEPTADAS.has(normalizarArea(especialidad))
  ) {
    return { especialidad: 'Seleccione un área curricular del catálogo oficial de Secundaria' };
  }

  if (
    perfil.nivelEducativo === 'Primaria' &&
    perfil.cargo === 'Especialista' &&
    especialidad &&
    !ESPECIALIDADES_DE_PRIMARIA_ACEPTADAS.has(especialidad.toLowerCase())
  ) {
    return { especialidad: 'La especialidad debe ser PIP o Educación Física' };
  }

  return {};
}

/** La lista que se guarda: la principal primero y las extras a continuación. */
export function especialidadesReunidas(
  principal: string | null | undefined,
  extras: readonly string[] | null | undefined,
): string[] {
  const reunidas = principal?.trim() ? [principal.trim()] : [];

  for (const extra of extras ?? []) {
    if (!reunidas.some((e) => e.toLowerCase() === extra.toLowerCase())) reunidas.push(extra);
  }

  return reunidas;
}

/**
 * Cómo queda el perfil al cambiar de modalidad.
 *
 * Las especialidades pertenecen al nivel: conservarlas dejaría guardada una
 * mención que el nivel nuevo no contempla.
 */
export function perfilAlCambiarModalidad(modalidad: string) {
  const niveles = MODALIDAD_NIVEL_MAP[modalidad] ?? [];

  return {
    nivelEducativo: niveles[0] ?? '',
    especialidad: '',
    especialidades: [] as string[],
    especialidadesExtras: [] as string[],
  };
}

/**
 * El valor guardado, resuelto a su forma exacta del catálogo si es la misma
 * área sin tilde o con otra mayúscula.
 *
 * El `SelectField` compara `value` contra `options[].value` por igualdad
 * estricta: un registro guardado como «Matematica» (sin tilde, como lo sembró
 * una versión vieja del seed) no coincidía con la opción «Matemática» y el
 * selector se abría vacío pese a que el dato sí estaba.
 */
export function especialidadCanonica(catalogo: readonly string[], valor: string): string {
  const limpia = valor.trim();
  if (!limpia) return limpia;
  return catalogo.find((e) => normalizarArea(e) === normalizarArea(limpia)) ?? limpia;
}

/**
 * El catálogo con el valor actual sumado, si no figura en él.
 *
 * Un registro viejo puede traer una mención fuera del catálogo (p. ej. «CTA»
 * antes de esta migración): sin esto el selector se abre vacío y guardar el
 * formulario le borra al especialista un dato que sí tenía.
 */
export function opcionesConActual(catalogo: readonly string[], actual: string | null | undefined): string[] {
  const limpia = actual?.trim();
  if (limpia && !catalogo.some((e) => normalizarArea(e) === normalizarArea(limpia))) {
    return [...catalogo, limpia];
  }
  return [...catalogo];
}

/**
 * Áreas del catálogo de Secundaria que quedan para sumar como extra: todas
 * menos la principal y las ya agregadas (comparando sin tildes ni mayúsculas).
 */
export function especialidadesExtrasDeSecundariaDisponibles(
  principal: string | null | undefined,
  extras: readonly string[],
): string[] {
  return ESPECIALIDADES_DE_SECUNDARIA.filter((e) => !areaYaUsada(e, principal, extras));
}
