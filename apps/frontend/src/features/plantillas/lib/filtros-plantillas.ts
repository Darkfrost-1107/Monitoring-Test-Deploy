/**
 * Los filtros del catálogo de plantillas.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Estaban dentro de un `useMemo` de
 * `PlantillasCatalog`, como una cadena de `if` con retornos negados que hacía
 * difícil ver qué campos participan de la búsqueda.
 */

export interface PlantillaFiltrable {
  tipoMonitoreo: string;
  descripcion: string;
  institucionNombre?: string;
  estado: string;
  anioAcademico: number;
}

/** Valor de un filtro que no acota nada. */
export const TODOS = 'Todos';

export interface FiltrosDePlantillas {
  texto: string;
  tipo: string;
  estado: string;
  anio: string;
}

export const FILTROS_VACIOS: FiltrosDePlantillas = {
  texto: '',
  tipo: TODOS,
  estado: TODOS,
  anio: TODOS,
};

/** ¿Hay algún filtro puesto? Decide si se ofrece el botón de limpiar. */
export const hayFiltroActivo = (filtros: FiltrosDePlantillas): boolean =>
  filtros.texto !== '' ||
  filtros.tipo !== TODOS ||
  filtros.estado !== TODOS ||
  filtros.anio !== TODOS;

/** La búsqueda mira el tipo de monitoreo, la descripción y la institución. */
const coincideElTexto = (p: PlantillaFiltrable, texto: string): boolean => {
  if (!texto) return true;

  const buscado = texto.toLowerCase();
  return [p.tipoMonitoreo, p.descripcion, p.institucionNombre ?? ''].some((campo) =>
    campo.toLowerCase().includes(buscado),
  );
};

export function filtrarPlantillas<T extends PlantillaFiltrable>(
  plantillas: readonly T[],
  filtros: FiltrosDePlantillas,
): T[] {
  return plantillas.filter(
    (p) =>
      coincideElTexto(p, filtros.texto) &&
      (filtros.tipo === TODOS || p.tipoMonitoreo === filtros.tipo) &&
      (filtros.estado === TODOS || p.estado === filtros.estado) &&
      (filtros.anio === TODOS || p.anioAcademico === Number(filtros.anio)),
  );
}

/** Los años presentes en el listado, del más reciente al más antiguo. */
export function aniosDisponibles(plantillas: readonly PlantillaFiltrable[]): number[] {
  return Array.from(new Set(plantillas.map((p) => p.anioAcademico))).sort((a, b) => b - a);
}
