/**
 * Traducción entre la ficha que persiste el backend y el estado del formulario.
 *
 * Fase 5 de PLAN_REMEDIACION.md. Estas conversiones estaban repetidas dentro de
 * `CalendarioSidebar`: la escala romana en dos manejadores y un `onClick`, y la
 * lectura de evidencia general dentro de un manejador de botón de 60 líneas.
 * Son puras y deciden la calificación que se muestra, así que su lugar es acá,
 * con cobertura.
 */

/**
 * Estado completo del formulario de ficha.
 *
 * Estaba escrito palabra por palabra en la firma de los dos manejadores de
 * `CalendarioSidebar`: dieciocho líneas repetidas, que es donde nacen las
 * discrepancias cuando se agrega un campo en una y no en la otra.
 */
export interface DatosFicha {
  checkedAspects: Record<string, boolean>;
  selectedLevels: Record<string, string>;
  generalComments: string;
  sugerencias?: string;
  compromisos?: string;
  rubricComments?: Record<string, string>;
  preguntaExtraAnswers?: Record<string, boolean>;
  respuestasEjeItem?: Record<string, number>;
  evidenciaUrls?: Record<string, string>;
  observacionesEjeItem?: Record<string, string>;
  contexto?: {
    areaCurricular: string;
    grado: string;
    seccion: string;
    cantidadEstudiantes: number;
    cantidadEstudiantesNee: number;
  };
}

/** Escala de desempeño, de menor a mayor. El backend la guarda como 1..4. */
export const NIVELES_ROMANOS = ['I', 'II', 'III', 'IV'] as const;

export type NivelRomano = (typeof NIVELES_ROMANOS)[number];

/**
 * Clave histórica de evidencia general, anterior a los slots numerados.
 * Se conserva para leer fichas ya guardadas.
 */
export const CLAVE_EVIDENCIA_GENERAL = 'GENERAL';

/**
 * Romano a número.
 *
 * Un valor desconocido cae a 1 en lugar de fallar. Es el comportamiento
 * histórico y está fijado en las pruebas; degrada la calificación en silencio,
 * de modo que corregirlo requiere decidir qué hacer en su lugar.
 */
export const aNivelNumerico = (romano: string): number => {
  const indice = (NIVELES_ROMANOS as readonly string[]).indexOf(romano);
  return indice >= 0 ? indice + 1 : 1;
};

/** Número a romano. Fuera de rango cae al nivel más bajo. */
export const aNivelRomano = (nivel: number): NivelRomano => NIVELES_ROMANOS[nivel - 1] ?? 'I';

/** Separa las evidencias generales de las asociadas a un ítem del instrumento. */
export const extraerEvidenciasGenerales = (
  evidenciaUrls: Record<string, string> | undefined,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(evidenciaUrls ?? {}).filter(([clave]) =>
      clave.startsWith(CLAVE_EVIDENCIA_GENERAL),
    ),
  );

/**
 * Lee el campo `evidenciaGeneral` de una ficha guardada.
 *
 * Admite los dos formatos que conviven en la base: un JSON con los slots
 * `GENERAL_1/2/3`, y una URL suelta de las fichas anteriores a los slots. Un
 * JSON corrupto se trata como URL suelta antes que perder el dato.
 */
export const interpretarEvidenciaGeneral = (
  crudo: string | null | undefined,
): Record<string, string> => {
  if (!crudo) return {};

  if (crudo.trim().startsWith('{')) {
    try {
      return JSON.parse(crudo) as Record<string, string>;
    } catch {
      return { [CLAVE_EVIDENCIA_GENERAL]: crudo };
    }
  }

  return { [CLAVE_EVIDENCIA_GENERAL]: crudo };
};

/**
 * Forma de la ficha tal como la devuelve el backend.
 *
 * Los campos opcionales admiten `null` además de `undefined`: la API los
 * serializa como `null` porque vienen de columnas anulables, y estrecharlo a
 * `undefined` obligaría a normalizar en cada punto de llamada.
 */
export interface FichaPersistida {
  respuestasAspecto: readonly { aspectoId: string; marcado: boolean }[];
  respuestasDesempeno: readonly {
    desempenoId: string;
    nivel: number;
    observaciones?: string | null;
  }[];
  respuestasEjeItem?: readonly {
    ejeItemId: string;
    nivel: number;
    evidenciaUrl?: string | null;
    observacion?: string | null;
  }[];
  evidenciaGeneral?: string | null;
  observaciones?: string | null;
  sugerencias?: string | null;
  compromisos?: string | null;
  /** Columnas anulables: la ficha puede haberse creado sin contexto de aula. */
  contexto?: {
    areaCurricular?: string | null;
    grado?: string | null;
    seccion?: string | null;
    cantidadEstudiantes?: number | null;
    cantidadEstudiantesNee?: number | null;
  } | null;
}

/**
 * Normaliza el contexto de aula a la forma que espera el formulario.
 *
 * Los nulos de la base pasan a ausentes. Para el formulario son equivalentes
 * —ambos caen al valor por defecto del campo— y `undefined` además desaparece
 * al serializar, que es lo que se guarda en el estado local.
 */
const normalizarContexto = (contexto: FichaPersistida['contexto']): DatosFicha['contexto'] =>
  contexto
    ? {
        areaCurricular: contexto.areaCurricular ?? '',
        grado: contexto.grado ?? '',
        seccion: contexto.seccion ?? '',
        cantidadEstudiantes: contexto.cantidadEstudiantes ?? 0,
        cantidadEstudiantesNee: contexto.cantidadEstudiantesNee ?? 0,
      }
    : undefined;

/**
 * Reconstruye el estado del formulario desde una ficha ya guardada, para poder
 * reabrirla en modo lectura.
 *
 * Estaba escrito dentro del `onClick` de un botón, sesenta líneas de mapeo
 * inline sin ninguna prueba.
 */
export function fichaAEstadoFormulario(ficha: FichaPersistida): DatosFicha {
  const checkedAspects: Record<string, boolean> = {};
  for (const r of ficha.respuestasAspecto) {
    checkedAspects[r.aspectoId] = r.marcado;
  }

  const selectedLevels: Record<string, string> = {};
  const rubricComments: Record<string, string> = {};
  for (const r of ficha.respuestasDesempeno) {
    selectedLevels[r.desempenoId] = aNivelRomano(r.nivel);
    if (r.observaciones) rubricComments[r.desempenoId] = r.observaciones;
  }

  const respuestasEjeItem: Record<string, number> = {};
  const evidenciaUrls: Record<string, string> = {};
  const observacionesEjeItem: Record<string, string> = {};
  for (const r of ficha.respuestasEjeItem ?? []) {
    respuestasEjeItem[r.ejeItemId] = r.nivel;
    if (r.evidenciaUrl) evidenciaUrls[r.ejeItemId] = r.evidenciaUrl;
    if (r.observacion) observacionesEjeItem[r.ejeItemId] = r.observacion;
  }

  // La evidencia general comparte diccionario con la de los ejes; sus claves
  // llevan el prefijo `GENERAL`, que es lo que las distingue al volver a guardar.
  Object.assign(evidenciaUrls, interpretarEvidenciaGeneral(ficha.evidenciaGeneral));

  return {
    checkedAspects,
    selectedLevels,
    generalComments: ficha.observaciones ?? '',
    sugerencias: ficha.sugerencias ?? '',
    compromisos: ficha.compromisos ?? '',
    rubricComments,
    respuestasEjeItem,
    evidenciaUrls,
    observacionesEjeItem,
    contexto: normalizarContexto(ficha.contexto),
  };
}
