/**
 * Estado de filtros del calendario.
 *
 * Fase 5 de PLAN_REMEDIACION.md, hallazgo H-14. Los seis filtros viajaban como
 * doce props valor/setter desde `CalendarioPage` hasta `CalendarioGrid`. Eso no
 * es una interfaz de componente: es estado de formulario transportado a mano a
 * través de la jerarquía, y su consecuencia es que cualquier cambio de filtro
 * vuelve a renderizar el árbol completo del calendario.
 *
 * Las dos reglas que gobiernan estos filtros vivían sueltas en el padre, sin
 * cobertura: el encadenado modalidad → nivel y qué cuenta como «hay filtros
 * activos», que depende del perfil.
 */

/** Valor que representa «sin filtrar» en todos los campos. */
export const SIN_FILTRAR = 'Todos';

export interface FiltrosCalendario {
  modalidad: string;
  nivel: string;
  especialista: string;
  tipo: string;
  nroVisita: string;
  estado: string;
}

export type CampoDeFiltro = keyof FiltrosCalendario;

export const FILTROS_INICIALES: FiltrosCalendario = {
  modalidad: SIN_FILTRAR,
  nivel: SIN_FILTRAR,
  especialista: SIN_FILTRAR,
  tipo: SIN_FILTRAR,
  nroVisita: SIN_FILTRAR,
  estado: SIN_FILTRAR,
};

/** Perfiles con juegos de filtros distintos en el calendario. */
export type PerfilDeFiltrado = 'director' | 'ugel';

/**
 * Qué filtros ve cada perfil.
 *
 * El director de institución trabaja dentro de un solo colegio, de modo que
 * modalidad y nivel no le discriminan nada; en cambio necesita número de visita
 * y estado para seguir el avance de su propio personal. La UGEL es al revés:
 * cruza instituciones, y ahí modalidad y nivel son la separación principal.
 */
export const FILTROS_VISIBLES_POR_PERFIL: Record<PerfilDeFiltrado, readonly CampoDeFiltro[]> = {
  director: ['tipo', 'especialista', 'nroVisita', 'estado'],
  ugel: ['modalidad', 'nivel', 'especialista', 'tipo'],
};

/**
 * Aplica un cambio de filtro, respetando el encadenado entre campos.
 *
 * Los niveles disponibles dependen de la modalidad elegida, así que conservar
 * el nivel al cambiar de modalidad deja seleccionado uno que puede no existir
 * en la nueva, y la lista aparece vacía sin explicación.
 */
export function aplicarCambioDeFiltro(
  filtros: FiltrosCalendario,
  campo: CampoDeFiltro,
  valor: string,
): FiltrosCalendario {
  const siguiente = { ...filtros, [campo]: valor };
  if (campo === 'modalidad') siguiente.nivel = SIN_FILTRAR;
  return siguiente;
}

/**
 * ¿Hay algún filtro puesto entre los que este perfil puede ver?
 *
 * Se restringe a los visibles porque un filtro que no se muestra no pudo
 * ponerlo el usuario, y contarlo encendería el botón de limpiar sin que haya
 * nada visible que limpiar.
 */
export function hayFiltroActivo(filtros: FiltrosCalendario, perfil: PerfilDeFiltrado): boolean {
  return FILTROS_VISIBLES_POR_PERFIL[perfil].some((campo) => filtros[campo] !== SIN_FILTRAR);
}
