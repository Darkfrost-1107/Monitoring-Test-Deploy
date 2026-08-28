/**
 * Cómo se nombra y de quién es una plantilla.
 *
 * Dos preguntas que la pantalla hace en todos lados y que estaban resueltas a
 * mano en cada sitio: el catálogo componía el título con `descripcion || tipo +
 * año` dentro del JSX, y el modal del aula ni siquiera miraba la descripción, de
 * modo que dos fichas del mismo instrumento y año se veían idénticas —una de la
 * UGEL y una de la institución, con el mismo rótulo y el mismo color.
 */

/** Lo que hace falta para nombrar una plantilla e identificar a su dueño. */
export interface PlantillaIdentificable {
  /** Nombre que le puso quien la creó. Vacío en las que nacieron sin nombre. */
  descripcion?: string;
  /** Rótulo del instrumento: «Monitoreo Docente». */
  tipoMonitoreo: string;
  anioAcademico: number;
  /** Institución dueña. Ausente en las de la UGEL. */
  ieId?: string;
}

/**
 * Una plantilla sin institución dueña es de la UGEL.
 *
 * Se mira el DUEÑO y no el sello del autor: el sello es histórico y puede faltar
 * en plantillas anteriores a que existiera, mientras que `ieId` sale de la
 * columna que decide el ámbito. Es el mismo criterio que usa
 * `plantillasAplicables` para elegir qué se ofrece en el aula.
 */
export const esDeLaUgel = (plantilla: { ieId?: string }): boolean =>
  plantilla.ieId === undefined;

/** Cómo se llama esta plantilla en pantalla. */
export function nombreDePlantilla(plantilla: PlantillaIdentificable): string {
  const propio = plantilla.descripcion?.trim();
  if (propio) return propio;

  // Sin nombre propio queda el instrumento y el año, que es lo que la distingue
  // de las demás cuando no hay nada mejor. El formulario pide el nombre, pero
  // las plantillas viejas se crearon sin él.
  return `${plantilla.tipoMonitoreo} (${plantilla.anioAcademico})`;
}

/** De quién es la plantilla, para mostrarlo junto al año. */
export const origenDePlantilla = (plantilla: PlantillaIdentificable): 'UGEL' | 'Institucional' =>
  esDeLaUgel(plantilla) ? 'UGEL' : 'Institucional';
