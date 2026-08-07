import { MODALIDAD_NIVEL_MAP } from '@sistema-monitoreo/shared-contracts';
import { ESCALAS_MAGISTERIALES } from '@entities/model-docentes/escala';

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

interface ResultadoDeAgregar {
  ok: boolean;
  extras?: string[];
  motivo?: string;
}

/**
 * Suma una especialidad extra, o explica por qué no.
 *
 * La comprobación de duplicados era sensible a mayúsculas: «Física» y «física»
 * entraban las dos y quedaban guardadas como menciones distintas.
 */
export function agregarEspecialidadExtra(
  previas: readonly string[],
  nueva: string,
  principal: string | null | undefined,
): ResultadoDeAgregar {
  const limpia = nueva.trim();
  if (!limpia) return { ok: false };

  if (limpia.toLowerCase() === principal?.trim().toLowerCase()) {
    return { ok: false, motivo: 'Esa ya es la especialidad principal.' };
  }

  if (previas.some((e) => e.toLowerCase() === limpia.toLowerCase())) {
    return { ok: false, motivo: `«${limpia}» ya está en la lista.` };
  }

  return { ok: true, extras: [...previas, limpia] };
}
