/**
 * Estado de la vista del repositorio de planes.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Vive acá y no junto a los componentes porque
 * son valores, no componentes, y mezclarlos rompe la recarga en caliente.
 */

export type ModoDeVista = 'grid' | 'list';

export interface FiltrosDePlanes {
  busqueda: string;
  anio: string;
  estado: string;
}

export const FILTROS_DE_PLANES_VACIOS: FiltrosDePlanes = {
  busqueda: '',
  anio: 'Todos',
  estado: 'Todos',
};

/** El plan inactivo se atenúa en las dos vistas del listado. */
export const claseSegunEstado = (estado: string): string =>
  estado === 'Inactivo' ? 'opacity-70 bg-surface/50 grayscale-[20%]' : 'bg-surface';

/** Lo que cada vista necesita para dibujar los botones de un plan. */
export interface AccionesSobrePlan {
  puedeGestionar: boolean;
  ocupado: boolean;
  onVer: () => void;
  onCambiarEstado: () => void;
  onEliminar: () => void;
}
