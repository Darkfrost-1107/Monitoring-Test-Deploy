import { RoleCode } from '@sistema-monitoreo/shared-contracts';

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
export type AutorDePlantilla = 'jefe_gestion' | 'director_ie';

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
  p.creadoPorRole === 'director_ie' && !!usuario.institucion && p.ieId === usuario.institucion;

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

    // El director ve las de la UGEL y además las de su propia institución.
    if (usuario.role === RoleCode.DIRECTOR_INSTITUCION) {
      return plantillas.filter((p) => esDeUgel(p) || esDeLaInstitucionDe(p, usuario));
    }

    if (usuario.role === RoleCode.JEFE_GESTION) return plantillas;

    // Monitor de campo destacado en una institución: sólo la plantilla propia
    // de esa institución, sin las de la UGEL.
    if (alcance.isMonitorCampo && alcance.isInstitution) {
      return plantillas.filter((p) => esDeLaInstitucionDe(p, usuario));
    }

    return plantillas.filter(esDeUgel);
  })();

  if (filtroUrl === 'ugel') return porAlcance.filter(esDeUgel);
  if (filtroUrl === 'ie') return porAlcance.filter((p) => p.creadoPorRole === 'director_ie');

  return [...porAlcance];
}
