/**
 * Las opciones que el formulario de programación ofrece en sus selectores.
 *
 * ── Por qué el valor es el identificador ──
 * Antes cada selector se armaba con `{ value: nombre, label: nombre }` y la
 * traducción de vuelta a identificador se hacía recién al guardar, comparando
 * cadenas. En la base de la UGEL hay **tres nombres de institución repetidos**
 * —«COORDINACION DE PRONOEI - UGEL LAMPA» figura cinco veces, una por
 * distrito— de modo que el selector mostraba cinco opciones idénticas, todas
 * con el mismo valor, y `find(por nombre)` siempre devolvía la primera.
 * Programar una visita a cualquiera de ellas era acertar una de cinco.
 */

export interface Opcion {
  value: string;
  label: string;
}

export interface InstitucionOfrecible {
  id: string;
  nombre: string;
  nivelEducativo?: string;
  distrito?: string;
}

export interface EspecialistaOfrecible {
  id: string;
  nombre: string;
  cargo?: string;
}

/** Une los rasgos que distinguen a una institución de sus homónimas. */
const rasgos = (institucion: InstitucionOfrecible, incluirNivel: boolean): string[] =>
  [institucion.distrito, incluirNivel ? institucion.nivelEducativo : undefined].filter(
    (r): r is string => !!r,
  );

/**
 * Nombre de la institución, con lo mínimo que la distingue de sus homónimas.
 *
 * Se agrega el distrito sólo si el nombre se repite, y el nivel sólo si el
 * distrito tampoco alcanza: una etiqueta cargada de datos que nadie necesita
 * es tan difícil de leer como una ambigua.
 */
export function etiquetaDeInstitucion(
  institucion: InstitucionOfrecible,
  todas: readonly InstitucionOfrecible[],
): string {
  const homonimas = todas.filter((i) => i.nombre === institucion.nombre);
  if (homonimas.length <= 1) return institucion.nombre;

  const porDistrito = homonimas.filter((i) => i.distrito === institucion.distrito);
  const detalle = rasgos(institucion, porDistrito.length > 1);

  return detalle.length > 0 ? `${institucion.nombre} — ${detalle.join(' · ')}` : institucion.nombre;
}

export const opcionesDeInstitucion = (
  instituciones: readonly InstitucionOfrecible[],
): Opcion[] =>
  instituciones.map((institucion) => ({
    value: institucion.id,
    label: etiquetaDeInstitucion(institucion, instituciones),
  }));

/** El cargo distingue a dos especialistas de igual nombre. */
export const opcionesDeEspecialista = (
  especialistas: readonly EspecialistaOfrecible[],
): Opcion[] =>
  especialistas.map((especialista) => ({
    value: especialista.id,
    label: especialista.cargo
      ? `${especialista.nombre} (${especialista.cargo})`
      : especialista.nombre,
  }));

/** Docente de una I.E. habilitado para levantar ficha: director, coordinador o jefe de taller. */
export interface EvaluadorInterno {
  id: string;
  /** Persona a la que pertenece; es el vínculo con su registro de especialista. */
  personaId: string;
  nombres: string;
  apellidos: string;
  cargo: string;
}

/**
 * Evaluadores de una institución, con el identificador que la visita necesita.
 *
 * Quien dirige o coordina en una I.E. figura en dos tablas —`docentes` y
 * `especialistas`— unidas por `persona_id`, y la visita referencia a la
 * segunda. Antes el puente entre ambas era el nombre completo: la opción
 * guardaba «Rosa Mamani» y al guardar se buscaba un especialista con ese
 * nombre.
 *
 * Quien no tenga registro de especialista se omite: ofrecerlo daría una visita
 * que el backend no puede aceptar.
 */
export function opcionesDeEvaluadorInterno(
  evaluadores: readonly EvaluadorInterno[],
  especialistas: readonly { id: string; personaId: string }[],
): Opcion[] {
  const porPersona = new Map(especialistas.map((e) => [e.personaId, e.id]));

  return evaluadores.flatMap((evaluador) => {
    const especialistaId = porPersona.get(evaluador.personaId);
    if (!especialistaId) return [];

    return [
      {
        value: especialistaId,
        label: `${evaluador.nombres} ${evaluador.apellidos} (${evaluador.cargo})`,
      },
    ];
  });
}
