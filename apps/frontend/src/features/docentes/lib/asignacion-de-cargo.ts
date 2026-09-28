import { CARGA_HORARIA } from '@shared/config/constants';

/**
 * A quién se le puede asignar un cargo de institución, y con qué condiciones.
 *
 * Vivía dentro de `DocenteAssignPage`, entre el efecto de carga y el armado del
 * DTO de actualización.
 */

/** Cargos que esta pantalla asigna promoviendo a un docente de aula. */
export const CARGOS_ASIGNABLES = ['Coordinador Pedagógico', 'Jefe de Taller'] as const;

export type CargoAsignable = (typeof CARGOS_ASIGNABLES)[number];

/** Condiciones laborales que habilitan estos cargos. */
export const CONDICIONES_DEL_CARGO = ['Nombrado', 'Destacado'] as const;

export type CondicionDelCargo = (typeof CONDICIONES_DEL_CARGO)[number];

/** Cargo desde el que se promueve. */
const DOCENTE_DE_AULA = 'Docente de Aula';

/**
 * Normaliza una cadena removiendo tildes, signos diacríticos, mayúsculas y espacios extremos.
 */
export const normalizarTexto = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

/**
 * Patrón canónico de Educación para el Trabajo:
 * Coincide con la sigla «EPT» o la denominación «Educación para el Trabajo» respetando
 * límites de palabra (\b) para no colisionar con términos como «Aceptación» o «Recepción»,
 * pero admitiendo menciones técnicas complementarias («EPT - Computación», «EPT: Mecánica»).
 */
const EPT_REGEX = /\b(ept|educacion para el trabajo)\b/;

/** Carga horaria propia de cada cargo cuando no hay una previa que respetar. */
const CARGA_DEL_CARGO: Record<CargoAsignable, number> = {
  'Coordinador Pedagógico': CARGA_HORARIA.ESPECIALISTA,
  'Jefe de Taller': CARGA_HORARIA.DOCENTE,
};

/** Lo que la asignación necesita de un docente. */
export interface DocenteCandidato {
  id: string;
  activo: boolean;
  cargo: string;
  especialidad?: string | null;
  condicion?: string | null;
  cargaHoraria?: number | null;
}

/**
 * ¿El docente enseña Educación para el Trabajo?
 *
 * La especialidad puede registrarse como sigla («EPT»), nombre oficial («Educación para el Trabajo»),
 * variante con mención de especialidad técnica o lista separada por comas.
 */
export function esDeEPT(especialidad: string | null | undefined): boolean {
  if (!especialidad) return false;
  return especialidad
    .split(',')
    .map(normalizarTexto)
    .some((item) => EPT_REGEX.test(item));
}

/**
 * Comprueba si la especialidad de un docente coincide con una especialidad de filtro u objetivo.
 * Maneja transparentemente la equivalencia semántica de EPT y listas separadas por comas.
 */
export function coincideEspecialidad(
  especialidadDocente: string | null | undefined,
  especialidadFiltro: string | null | undefined,
): boolean {
  if (!especialidadFiltro) return true;
  if (esDeEPT(especialidadFiltro)) {
    return esDeEPT(especialidadDocente);
  }
  const filtro = normalizarTexto(especialidadFiltro);
  return (especialidadDocente ?? '')
    .split(',')
    .map(normalizarTexto)
    .includes(filtro);
}

/**
 * Docentes que pueden ocupar el cargo.
 *
 * El Jefe de Taller dirige el taller de Educación para el Trabajo, así que sólo
 * un docente de esa especialidad puede ocuparlo.
 */
export function candidatosParaCargo<T extends DocenteCandidato>(
  docentes: readonly T[],
  cargo: CargoAsignable,
): T[] {
  return docentes.filter((d) => {
    if (!d.activo || d.cargo !== DOCENTE_DE_AULA) return false;

    // Los dos cargos se reparten el aula por especialidad: EPT es del Jefe de
    // Taller y el resto del Coordinador Pedagógico. La regla exigía EPT para el
    // primero pero no lo descartaba del segundo, de modo que un docente de EPT
    // figuraba en las dos listas.
    if (cargo === 'Jefe de Taller') return esDeEPT(d.especialidad);
    if (cargo === 'Coordinador Pedagógico') return !esDeEPT(d.especialidad);

    return true;
  });
}

/**
 * Carga horaria con la que se abre el formulario.
 *
 * El Coordinador Pedagógico la tiene fija en 40 horas por definición del cargo;
 * el Jefe de Taller conserva la que ya tenía el docente, porque sigue dictando.
 */
export function cargaHorariaDelCargo(
  cargo: CargoAsignable,
  docente: DocenteCandidato | null | undefined,
): number {
  if (cargo === 'Coordinador Pedagógico') return CARGA_DEL_CARGO[cargo];
  return docente?.cargaHoraria || CARGA_DEL_CARGO[cargo];
}

/**
 * Condición laboral con la que se abre el formulario.
 *
 * El cargo exige Nombrado o Destacado. Si el docente ya tiene una de las dos se
 * conserva; si no, se propone Nombrado para que el usuario lo confirme o lo
 * corrija antes de guardar.
 */
export function condicionInicial(
  docente: DocenteCandidato | null | undefined,
): CondicionDelCargo {
  const actual = docente?.condicion;
  return CONDICIONES_DEL_CARGO.includes(actual as CondicionDelCargo)
    ? (actual as CondicionDelCargo)
    : 'Nombrado';
}
