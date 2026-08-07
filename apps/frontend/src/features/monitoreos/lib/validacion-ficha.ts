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
}

export interface RespuestasAValidar {
  selectedLevels: Record<string, string>;
  rubricComments: Record<string, string>;
  observacionesEjeItem: Record<string, string>;
  sugerencias: string;
  compromisos: string;
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

  const sinObservar = (plantilla.ejesItems ?? []).filter((item) =>
    estaVacio(respuestas.observacionesEjeItem[item.id]),
  );
  if (sinObservar.length > 0) {
    return `Faltan observaciones. Por favor ingrese la observación para los ejes/ítems: \n${listar(
      sinObservar.map((item) => `${item.numero}. ${recortar(item.descripcion)}`),
    )}`;
  }

  if (estaVacio(respuestas.sugerencias)) {
    return 'Las sugerencias son obligatorias para finalizar la ficha.';
  }

  if (estaVacio(respuestas.compromisos)) {
    return 'Los compromisos son obligatorios para finalizar la ficha.';
  }

  return null;
}
