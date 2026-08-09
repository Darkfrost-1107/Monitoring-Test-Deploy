/**
 * ¿Un registro pertenece a la institución educativa del usuario?
 *
 * La regla vivía escrita dos veces —`esDeSuInstitucion` en
 * `features/cronogramas/lib/visibilidad.ts` y `esMismaInstitucion` en
 * `entities/model-reprogramaciones/decision.ts`— con el mismo defecto en ambas.
 * Los dos archivos advierten en su encabezado sobre reglas duplicadas que
 * divergen; ésta era una de ellas.
 *
 * ── El nombre es respaldo, no una segunda puerta ──
 * Las dos copias resolvían la pertenencia con un `||`:
 *
 *     (usuario.institucion && registro.institucionId === usuario.institucion) ||
 *     (usuario.institucionNombre && registro.institucion === usuario.institucionNombre)
 *
 * El comentario decía «respaldo cuando no hay identificador», pero el código no
 * hacía eso: con el identificador presente y **distinto**, la comparación por
 * nombre podía habilitar igual. En la base de la UGEL hay tres nombres de
 * institución repetidos —«COORDINACION DE PRONOEI - UGEL LAMPA» figura cinco
 * veces, una por distrito—, de modo que el director de una de esas sedes veía y
 * decidía sobre las visitas de las otras cuatro.
 *
 * Acá el identificador manda: si el usuario lo trae, es lo único que se compara.
 * El nombre sólo interviene cuando no hay identificador con qué decidir.
 *
 * ── Qué NO es esto ──
 * No es el control de acceso: el backend aplica RLS sobre las mismas filas.
 * Acá se decide qué se muestra y qué se ofrece resolver.
 */

/** Vínculo institucional del usuario, tal como lo trae su token. */
export interface PertenenciaDelUsuario {
  /** Identificador de su institución, cuando el token lo trae. */
  institucion?: string;
  /** Nombre de su institución; respaldo cuando no hay identificador. */
  institucionNombre?: string;
}

/** Registro cuya pertenencia institucional se evalúa: una visita, una solicitud. */
export interface RegistroConInstitucion {
  institucionId: string;
  institucion: string;
}

export function esDeLaInstitucionDelUsuario(
  usuario: PertenenciaDelUsuario,
  registro: RegistroConInstitucion,
): boolean {
  if (usuario.institucion) {
    return registro.institucionId === usuario.institucion;
  }

  if (!usuario.institucionNombre) return false;

  return registro.institucion.toLowerCase() === usuario.institucionNombre.toLowerCase();
}
