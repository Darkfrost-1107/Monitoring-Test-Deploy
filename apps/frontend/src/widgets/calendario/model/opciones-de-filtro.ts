/**
 * Las opciones que ofrecen los selectores del calendario.
 *
 * Se calculan sobre las visitas que el usuario ya puede ver y no sobre la lista
 * completa: ofrecer un especialista o un nivel que su ámbito no alcanza es
 * ofrecer un filtro que deja el calendario vacío. Antes la lista de
 * especialistas se armaba con todos los cronogramas, de modo que un monitor de
 * campo veía en el desplegable a colegas cuyas visitas nunca iba a ver.
 */

/** Valor con el que un filtro se declara inactivo. */
export const TODOS = 'Todos';

interface VisitaFiltrable {
  especialista?: string;
  modalidad?: string;
  nivel: string;
}

/** Valores distintos y no vacíos de un campo, en el orden en que aparecen. */
const distintos = <T>(elementos: readonly T[], campo: (e: T) => string | undefined): string[] => {
  const vistos = new Set<string>();
  for (const elemento of elementos) {
    const valor = campo(elemento);
    if (valor) vistos.add(valor);
  }
  return [...vistos];
};

export interface OpcionesDeFiltro {
  especialistas: string[];
  modalidades: string[];
  niveles: string[];
}

/**
 * Los niveles se encadenan a la modalidad elegida: con una modalidad puesta,
 * sólo se ofrecen los niveles que existen dentro de ella.
 */
export function opcionesDeFiltro<T extends VisitaFiltrable>(
  visitas: readonly T[],
  modalidad: string,
): OpcionesDeFiltro {
  const delAlcance = modalidad === TODOS ? visitas : visitas.filter((v) => v.modalidad === modalidad);

  return {
    especialistas: distintos(visitas, (v) => v.especialista),
    modalidades: distintos(visitas, (v) => v.modalidad),
    niveles: distintos(delAlcance, (v) => v.nivel),
  };
}
