/**
 * Los filtros del catálogo de plantillas.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Estaban dentro de un `useMemo` de
 * `PlantillasCatalog`, como una cadena de `if` con retornos negados que hacía
 * difícil ver qué campos participan de la búsqueda.
 */

export interface PlantillaFiltrable {
  tipoMonitoreo: string;
  /** Ausente en las plantillas anteriores a que se registrara el autor. */
  autorNombre?: string;
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

/**
 * La búsqueda mira el tipo de monitoreo, el autor y la institución.
 *
 * Antes miraba la descripción, que el formulario fabricaba con la fecha y la
 * cantidad de desempeños y que la tarjeta dejó de mostrar: era buscar sobre
 * texto invisible. El autor sí distingue, que es de lo que se trata cuando una
 * institución tiene tres plantillas del mismo tipo y del mismo año.
 */
const coincideElTexto = (p: PlantillaFiltrable, texto: string): boolean => {
  if (!texto) return true;

  const buscado = texto.toLowerCase();
  return [p.tipoMonitoreo, p.autorNombre ?? '', p.institucionNombre ?? ''].some((campo) =>
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
