import type { TipoMonitoreo, TipoPlantilla } from '@sistema-monitoreo/shared-contracts';

/**
 * El instrumento con el que se llenó una ficha.
 *
 * ── Por qué existe este módulo ──
 * `tipoMonitoreo` significaba dos cosas: en el cronograma, a quién se monitorea
 * (DOCENTE | DIRECTIVO); en la plantilla, con qué instrumento (+ DOCENTE_EIB).
 * El mapeador de reportes llenaba un único campo con lo uno o lo otro según los
 * datos, de modo que ningún consumidor podía confiar en él. La compensación fue
 * olfatear cadenas —`includes('EIB')` en catorce archivos, y hasta el NOMBRE de
 * la plantilla— y cada instrumento nuevo obligaba a recorrerlos todos.
 *
 * Hoy `IReporteFicha.instrumento` viene de la plantilla y está tipado, así que
 * la pregunta se responde comparando. Lo que queda acá son las traducciones que
 * antes vivían repetidas en ternarios: rótulo y nombre de plantilla.
 */

/**
 * Instrumento por el que se segmenta un listado o un análisis, o todos juntos.
 *
 * Los filtros lo declaraban como `string`, así que nada garantizaba que sus
 * valores coincidieran con los del contrato y cada uso los interpretaba a mano.
 */
export type FiltroDeInstrumento = TipoPlantilla | 'Todos';

/** Si la ficha se llenó con la Ficha Docente EIB. */
export function esInstrumentoEib(instrumento: TipoPlantilla | undefined): boolean {
  return instrumento === 'DOCENTE_EIB';
}

/**
 * A quién se monitorea con este instrumento.
 *
 * Se reexporta del contrato compartido: la relación entre instrumento y tipo de
 * visita es del dominio y la consulta también el backend, al validar qué
 * plantilla sirve para una visita.
 */
export { tipoDeVisitaDe } from '@sistema-monitoreo/shared-contracts';

/**
 * El instrumento de una fila de reportes, con respaldo en el tipo de visita.
 *
 * El panel tiene un camino de respaldo que arma las filas desde los cronogramas,
 * donde no hay ficha y por lo tanto no hay instrumento. Ahí se usa el tipo de la
 * visita, que es un valor válido de instrumento: `TipoMonitoreo` está contenido
 * en `TipoPlantilla`. No se puede saber si esa visita llevó la ficha EIB —no hay
 * ficha—, pero suponer «docente» para una visita directiva sí sería un error.
 */
export function instrumentoDe(fila: {
  instrumento?: TipoPlantilla;
  tipo: TipoMonitoreo;
}): TipoPlantilla {
  return fila.instrumento ?? fila.tipo;
}

/** Rótulo con el que se nombra cada instrumento en pantalla. */
export const ETIQUETA_DE_INSTRUMENTO: Record<TipoPlantilla, string> = {
  DOCENTE: 'DOCENTE',
  DOCENTE_EIB: 'DOCENTE EIB',
  DIRECTIVO: 'DIRECTIVO',
};

/**
 * Nombre de la plantilla que corresponde a cada instrumento.
 *
 * Se reexporta de la entidad, que es dueña del modelo: la tabla estaba escrita
 * dos veces —acá y como `TIPO_MONITOREO_LABEL` en el mapeador— y dos copias de
 * la misma traducción se separan sin que nadie lo note.
 */
export { ROTULO_DE_INSTRUMENTO as PLANTILLA_DE_INSTRUMENTO } from '@/entities/model-plantillas/rotulo-de-instrumento';
