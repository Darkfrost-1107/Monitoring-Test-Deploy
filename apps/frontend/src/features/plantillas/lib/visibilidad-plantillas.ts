import { RoleCode } from '@sistema-monitoreo/shared-contracts';
import type { RolAutorPlantilla } from '@sistema-monitoreo/shared-contracts';

/**
 * Qué plantillas ve cada usuario en el catálogo.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Estas reglas vivían dentro de un `useMemo` de
 * `PlantillasCatalog`, encadenadas en un `if/else if` de cinco ramas donde el
 * orden importa y no se podía probar sin montar el widget entero.
 *
 * ── Qué NO es esto ──
 * No es control de acceso. El backend acota el listado según el alcance del
 * usuario; acá se decide qué mostrar dentro de lo que ya llegó.
 */

/** Quién creó la plantilla: la UGEL o el director de una institución. */
export type AutorDePlantilla = RolAutorPlantilla;

/**
 * Autores que pertenecen a una institución educativa.
 *
 * Los tres —Director, Coordinador Pedagógico y Jefe de Taller— tienen cada uno
 * su plantilla. `'director_ie'` se usaba como sinónimo de «de esta I.E.», que
 * dejaba afuera a los otros dos en cuanto pudieron tener la suya.
 */
const AUTORES_DE_INSTITUCION: readonly AutorDePlantilla[] = [
  'director_ie',
  'coordinador_pedagogico',
  'jefe_taller',
];

/** ¿La creó alguien de una institución educativa? */
export const esDeInstitucion = (autor: AutorDePlantilla | undefined): boolean =>
  !!autor && AUTORES_DE_INSTITUCION.includes(autor);

export interface PlantillaVisible {
  /**
   * Ausente en las plantillas antiguas, anteriores a que se registrara el rol
   * del autor. Se tratan como de la UGEL, que es de donde venían.
   */
  creadoPorRole?: AutorDePlantilla;
  /** Institución dueña de la plantilla, si la creó un director. */
  ieId?: string;
}

export interface UsuarioDePlantillas {
  role: string;
  /** Identificador de la institución del usuario, no su nombre. */
  institucion?: string;
}

export interface AlcanceDePlantillas {
  /** Perfil de la institución que se está viendo. Acota a esa institución. */
  isInstitution: boolean;
  isMonitorCampo: boolean;
}

/** Filtro opcional que llega por la URL desde las tarjetas del panel. */
export type FiltroDeOrigen = 'ugel' | 'ie' | null | undefined;

/** ¿Es una plantilla de la UGEL? */
export const esDeUgel = (p: PlantillaVisible): boolean =>
  !p.creadoPorRole || p.creadoPorRole === 'jefe_gestion';

/** ¿Es una plantilla propia de esta institución? */
const esDeLaInstitucionDe = (p: PlantillaVisible, usuario: UsuarioDePlantillas): boolean =>
  esDeInstitucion(p.creadoPorRole) && !!usuario.institucion && p.ieId === usuario.institucion;

/**
 * Las plantillas que corresponden al usuario, ya acotadas por el filtro de la
 * URL si viene.
 *
 * `institucionId` gana sobre todo lo demás: cuando el catálogo se muestra
 * dentro de la ficha de una institución, sólo se ven las de esa institución.
 */
export function plantillasVisibles<T extends PlantillaVisible>(
  plantillas: readonly T[],
  usuario: UsuarioDePlantillas | null | undefined,
  alcance: AlcanceDePlantillas,
  opciones: { institucionId?: string; filtroUrl?: FiltroDeOrigen } = {},
): T[] {
  const { institucionId, filtroUrl } = opciones;

  const porAlcance = ((): readonly T[] => {
    if (institucionId) return plantillas.filter((p) => p.ieId === institucionId);
    if (!usuario) return plantillas.filter(esDeUgel);

    if (usuario.role === RoleCode.JEFE_GESTION) return plantillas;

    /**
     * Personal de una institución: el catálogo de la UGEL y lo suyo.
     *
     * Al monitor de campo destacado en una institución —coordinador pedagógico,
     * jefe de taller— se le ocultaban las de la UGEL, y sólo se le mostraba la
     * plantilla propia de su I.E. Eso venía del modelo viejo, en el que cada
     * institución armaba sus fichas.
     *
     * Hoy las fichas de la UGEL son OBLIGATORIAS: son las que va a aplicar en el
     * aula, y son también la base desde la que clona cuando la Jefatura le
     * aprueba una solicitud. Ocultárselas lo dejaba sin instrumento para
     * monitorear y sin nada desde donde clonar.
     *
     * Es la misma regla que ya regía para el director de la I.E.
     */
    if (
      usuario.role === RoleCode.DIRECTOR_INSTITUCION ||
      (alcance.isMonitorCampo && alcance.isInstitution)
    ) {
      return plantillas.filter((p) => esDeUgel(p) || esDeLaInstitucionDe(p, usuario));
    }

    return plantillas.filter(esDeUgel);
  })();

  if (filtroUrl === 'ugel') return porAlcance.filter(esDeUgel);
  if (filtroUrl === 'ie') return porAlcance.filter((p) => esDeInstitucion(p.creadoPorRole));

  return [...porAlcance];
}
