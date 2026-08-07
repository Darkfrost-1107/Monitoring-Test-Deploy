/**
 * Niveles educativos a cargo de un Jefe de Área y quién puede ascender a serlo.
 *
 * La UGEL tiene un único Jefe de Área por nivel de Educación Básica Regular, y
 * el ascenso se hace promoviendo a un especialista **de ese mismo nivel**. Las
 * dos reglas vivían dentro de `JefeAreaFormBase`, entre la maquetación de dos
 * formularios distintos, y decidían qué opciones se ofrecen sin poder probarse.
 *
 * El backend es quien manda: `especialista-create.helper.ts`,
 * `especialista-update.helper.ts` y `transicion-rol.helper.ts` rechazan con
 * «Ya existe un Jefe de Área activo para el nivel X». Lo que se calcula acá es
 * lo mismo, por adelantado, para no ofrecer una opción que se va a rechazar.
 */

export const NIVELES_JEFE_AREA = ['Inicial', 'Primaria', 'Secundaria'] as const;

export type NivelJefeArea = (typeof NIVELES_JEFE_AREA)[number];

/** Cargo desde el que se asciende. */
export const CARGO_ESPECIALISTA = 'Especialista';

/** Cargo al que se asciende. */
export const CARGO_JEFE_AREA = 'Jefe de Área';

/** Lo que la clasificación necesita de un especialista. */
export interface EspecialistaClasificable {
  cargo: string;
  nivelEducativo?: string | null;
}

/**
 * El nivel tal como lo nombra el sistema, o nulo si no es uno de los tres.
 *
 * La columna `nivel_educativo` es texto libre de 50 caracteres y admite valores
 * de otras modalidades —EBA, EBE, CEPROs—, que no tienen Jefe de Área. La
 * versión anterior devolvía 'Secundaria' ante cualquier valor que no
 * reconociera: eso convertía un dato desconocido en un dato afirmado, y como el
 * resultado alimenta el cálculo de niveles ocupados, bloqueaba Secundaria por
 * un registro que no le correspondía.
 */
export function normalizarNivel(nivel?: string | null): NivelJefeArea | null {
  const limpio = nivel?.trim().toLowerCase();
  if (!limpio) return null;

  return NIVELES_JEFE_AREA.find((n) => n.toLowerCase() === limpio) ?? null;
}

/** Niveles que ya tienen un Jefe de Área y por lo tanto no admiten otro. */
export function nivelesOcupados(
  especialistas: readonly EspecialistaClasificable[],
): NivelJefeArea[] {
  const ocupados = new Set<NivelJefeArea>();

  for (const especialista of especialistas) {
    if (especialista.cargo !== CARGO_JEFE_AREA) continue;

    const nivel = normalizarNivel(especialista.nivelEducativo);
    if (nivel) ocupados.add(nivel);
  }

  return NIVELES_JEFE_AREA.filter((n) => ocupados.has(n));
}

/** Especialistas que pueden ascender a Jefe de Área del nivel indicado. */
export function candidatosDelNivel<T extends EspecialistaClasificable>(
  especialistas: readonly T[],
  nivel: NivelJefeArea,
): T[] {
  return especialistas.filter(
    (e) => e.cargo === CARGO_ESPECIALISTA && normalizarNivel(e.nivelEducativo) === nivel,
  );
}

/** Opciones del selector de nivel, con los ocupados fuera de alcance. */
export function opcionesDeNivel(
  ocupados: readonly NivelJefeArea[],
): { value: NivelJefeArea; label: string; disabled: boolean }[] {
  return NIVELES_JEFE_AREA.map((nivel) => ({
    value: nivel,
    label: nivel,
    disabled: ocupados.includes(nivel),
  }));
}

/**
 * Nivel sobre el que conviene abrir el formulario, o nulo si no queda ninguno.
 *
 * Antes se abría siempre en 'Secundaria', estuviera ocupada o no: el selector
 * mostraba la opción atenuada pero seleccionada, y el envío llegaba igual al
 * servidor para que lo rechazara.
 */
export function primerNivelLibre(ocupados: readonly NivelJefeArea[]): NivelJefeArea | null {
  return NIVELES_JEFE_AREA.find((nivel) => !ocupados.includes(nivel)) ?? null;
}
