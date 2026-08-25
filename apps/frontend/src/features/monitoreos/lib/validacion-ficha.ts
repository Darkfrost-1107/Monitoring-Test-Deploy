/**
 * Condiciones para dar por cerrada una ficha de monitoreo.
 *
 * Fase 5 de PLAN_REMEDIACION.md. Las cinco reglas vivían dentro de
 * `handleFinalizeClick`, intercaladas con llamadas a `alert` en un componente
 * de 1.294 líneas. Deciden si una evaluación puede firmarse, y no tenían
 * cobertura.
 *
 * Se informa la primera regla incumplida, no todas: el orden va de lo que
 * sostiene la evaluación —el nivel de logro— hacia lo que la cierra.
 */

/** Longitud a la que se recortan los nombres en los mensajes de falta. */
const LARGO_MAXIMO_EN_LISTA = 45;

export interface PlantillaValidable {
  desempenos: readonly { id: string; nombre: string }[];
  /** `numero` llega como número desde el contrato de plantilla. */
  ejesItems?: readonly { id: string; numero: string | number; descripcion: string }[];
  /** Decide si la ficha lleva planificación y diseño de evaluación. */
  tipoMonitoreo: string;
}

/** Contexto de aula tal como lo lleva el formulario. */
export interface ContextoAValidar {
  area: string;
  grado: string;
  seccion: string;
  alumnos: number | '';
  alumnosNee: number | '';
}

export interface RespuestasAValidar {
  selectedLevels: Record<string, string>;
  rubricComments: Record<string, string>;
  observacionesEjeItem: Record<string, string>;
  generalComments: string;
  sugerencias: string;
  compromisos: string;
  contexto: ContextoAValidar;
}

/** ¿El texto está ausente o es sólo espacios? Un campo en blanco no justifica nada. */
const estaVacio = (texto: string | undefined): boolean => !texto || texto.trim() === '';

const recortar = (texto: string) => `${texto.substring(0, LARGO_MAXIMO_EN_LISTA)}...`;

const listar = (elementos: string[]) => elementos.map((e) => `• ${e}`).join('\n');

/**
 * Devuelve el mensaje de la primera condición incumplida, o `null` si la ficha
 * puede cerrarse.
 */
export function validarCierreDeFicha(
  plantilla: PlantillaValidable,
  respuestas: RespuestasAValidar,
): string | null {
  const esDirectivo = plantilla.tipoMonitoreo.toUpperCase().includes('DIRECTIVO');

  const sinCalificar = plantilla.desempenos.filter((d) => !respuestas.selectedLevels[d.id]);
  if (sinCalificar.length > 0) {
    return `Faltan calificar niveles. Por favor califique el nivel de logro para: \n${listar(
      sinCalificar.map((d) => recortar(d.nombre)),
    )}`;
  }

  const sinJustificar = plantilla.desempenos.filter((d) =>
    estaVacio(respuestas.rubricComments[d.id]),
  );
  if (sinJustificar.length > 0) {
    return `Faltan justificaciones. Por favor ingrese un comentario u observación que justifique la evaluación para: \n${listar(
      sinJustificar.map((d) => recortar(d.nombre)),
    )}`;
  }

  /**
   * Planificación y diseño de evaluación existe sólo en el instrumento docente.
   *
   * Se decide acá dentro y no en quien llama: es una regla que **bloquea** el
   * cierre, y una plantilla directiva con ítems heredados dejaría la ficha sin
   * poder finalizarse, reclamando observaciones de una sección que su pantalla
   * ni siquiera muestra.
   */
  const itemsExigibles = esDirectivo ? [] : (plantilla.ejesItems ?? []);

  const sinObservar = itemsExigibles.filter((item) =>
    estaVacio(respuestas.observacionesEjeItem[item.id]),
  );
  if (sinObservar.length > 0) {
    return `Faltan observaciones. Por favor ingrese la observación para los ejes/ítems: \n${listar(
      sinObservar.map((item) => `${item.numero}. ${recortar(item.descripcion)}`),
    )}`;
  }

  if (estaVacio(respuestas.generalComments)) {
    return 'Las observaciones generales son obligatorias para finalizar la ficha.';
  }

  if (estaVacio(respuestas.sugerencias)) {
    return 'Las sugerencias son obligatorias para finalizar la ficha.';
  }

  if (estaVacio(respuestas.compromisos)) {
    return 'Los compromisos son obligatorios para finalizar la ficha.';
  }

  /**
   * El contexto de aula es obligatorio para una ficha DOCENTE, y el backend lo
   * rechaza sin él. Se valida para no cerrar —ni encolar sin conexión— una ficha
   * incompleta: sin señal, el autocompletado desde el perfil del docente no
   * corre, así que el aula la carga el evaluador y hay que exigirla. La ficha
   * directiva no lleva contexto (va NULL), por eso se exceptúa.
   */
  if (!esDirectivo) {
    const c = respuestas.contexto;
    const faltantes: string[] = [];
    if (estaVacio(c.area)) faltantes.push('área curricular');
    if (estaVacio(c.grado)) faltantes.push('grado');
    if (estaVacio(c.seccion)) faltantes.push('sección');
    if (c.alumnos === '') faltantes.push('cantidad de estudiantes');
    if (c.alumnosNee === '') faltantes.push('cantidad de estudiantes con NEE');
    if (faltantes.length > 0) {
      return `Faltan datos del aula. Complete: \n${listar(faltantes)}`;
    }
  }

  return null;
}
