/**
 * El ciclo de estados de una plantilla.
 *
 * Fase 7 de PLAN_REMEDIACION.md. El cálculo del estado siguiente estaba escrito
 * dos veces en `PlantillasCatalog`: una en el manejador que ejecuta el cambio y
 * otra dentro del texto del modal que lo anuncia. Dos copias de la misma regla
 * en la misma pantalla: si una cambia sin la otra, el modal promete un estado y
 * la acción aplica otro.
 */

export type EstadoDePlantilla = 'Borrador' | 'Vigente' | 'Historico';

const CICLO: Record<EstadoDePlantilla, EstadoDePlantilla> = {
  Borrador: 'Vigente',
  Vigente: 'Historico',
  // Sólo por completitud del ciclo: el botón de cambiar estado no se muestra
  // para una plantilla histórica, y el propio modal advierte que de ahí no se
  // vuelve. Ninguna ruta de la interfaz llega a esta transición.
  Historico: 'Borrador',
};

/** El estado al que pasa la plantilla si se confirma el cambio. */
export const siguienteEstado = (estado: EstadoDePlantilla): EstadoDePlantilla => CICLO[estado];

/** Pasar a histórico no tiene vuelta atrás; conviene avisarlo antes. */
export const esCambioIrreversible = (estado: EstadoDePlantilla): boolean => estado === 'Vigente';
