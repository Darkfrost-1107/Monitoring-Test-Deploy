import { fichasApi } from '../api/fichas.api';
import { firmasApi } from '@/shared/api/firmas.api';
import { aNivelNumerico, extraerEvidenciasGenerales, type DatosFicha } from './ficha-estado';

/**
 * Envío de una ficha al backend, como función pura (sin React).
 *
 * Es la MISMA secuencia que corría dentro de `useFichaPersistence`: encontrar o
 * crear la ficha, escribir las tres colecciones de respuestas y —al finalizar—
 * cerrarla. Se extrajo acá para que la usen dos caminos con idéntico resultado:
 * el envío online directo y el motor de sincronización que drena la cola offline.
 *
 * La secuencia es **idempotente**: `findByVisitaYPlantilla ?? create` no duplica,
 * los PATCH de respuestas son reescrituras, y `finalizar` sólo actúa sobre una
 * ficha en BORRADOR. Reintentarla es seguro.
 */

/** Cuerpo que viaja en la cola para una ficha finalizada offline. */
export interface PayloadFinalizarFicha {
  visitId: string;
  plantillaId?: string;
  datos: DatosFicha;
}

/**
 * Escribe las respuestas, creando la ficha si no existe. Devuelve su id.
 * `incluirPreguntaExtra` acompaña sólo al cierre (no al borrador), igual que antes.
 */
export async function escribirRespuestasFicha(
  visitId: string,
  plantillaId: string | undefined,
  datos: DatosFicha,
  incluirPreguntaExtra: boolean,
): Promise<string> {
  const ficha =
    (plantillaId
      ? await fichasApi.findByVisitaYPlantilla(visitId, plantillaId)
      : await fichasApi.findByVisita(visitId)) ??
    (await fichasApi.create({
      cronogramaId: visitId,
      plantillaId,
      areaCurricular: datos.contexto?.areaCurricular,
      grado: datos.contexto?.grado,
      seccion: datos.contexto?.seccion,
      cantidadEstudiantes: datos.contexto?.cantidadEstudiantes,
      cantidadEstudiantesNee: datos.contexto?.cantidadEstudiantesNee,
    }));

  for (const [desempenoId, romano] of Object.entries(datos.selectedLevels)) {
    await fichasApi.saveRespuestaDesempeno(
      ficha.id,
      desempenoId,
      aNivelNumerico(romano),
      datos.rubricComments?.[desempenoId],
      incluirPreguntaExtra ? datos.preguntaExtraAnswers?.[desempenoId] : undefined,
    );
  }
  for (const [aspectoId, marcado] of Object.entries(datos.checkedAspects)) {
    await fichasApi.saveRespuestaAspecto(ficha.id, aspectoId, marcado);
  }
  for (const [ejeItemId, nivel] of Object.entries(datos.respuestasEjeItem ?? {})) {
    await fichasApi.saveRespuestaEjeItem(
      ficha.id,
      ejeItemId,
      nivel,
      datos.evidenciaUrls?.[ejeItemId],
      datos.observacionesEjeItem?.[ejeItemId],
    );
  }

  return ficha.id;
}

/** Escribe respuestas + finaliza (cierra) la ficha. */
export async function finalizarFichaCompleta({
  visitId,
  plantillaId,
  datos,
}: PayloadFinalizarFicha): Promise<void> {
  const fichaId = await escribirRespuestasFicha(visitId, plantillaId, datos, true);
  const generales = extraerEvidenciasGenerales(datos.evidenciaUrls);
  await fichasApi.finalizar(
    fichaId,
    datos.generalComments,
    datos.sugerencias,
    datos.compromisos,
    Object.keys(generales).length > 0 ? JSON.stringify(generales) : undefined,
  );
}

/** Escribe respuestas sin cerrar (borrador). */
export async function guardarBorradorFicha({
  visitId,
  plantillaId,
  datos,
}: PayloadFinalizarFicha): Promise<void> {
  await escribirRespuestasFicha(visitId, plantillaId, datos, false);
}

/** Cuerpo que viaja en la cola para una firma hecha offline. */
export interface PayloadFirmarFicha {
  /** Se firma por el cronograma (el backend resuelve la ficha) + su plantilla. */
  cronogramaId: string;
  plantillaId?: string;
}

/**
 * Firma la ficha. El rol del firmante lo deriva el backend de la persona
 * autenticada, y la imagen sale de la firma que ya tiene registrada, así que el
 * cuerpo sólo lleva el consentimiento. Firmar dos veces con el mismo rol es un
 * conflicto en el backend (unique ficha+rol): el motor de sync lo trata como
 * éxito idempotente.
 */
export async function firmarFichaCompleta({
  cronogramaId,
  plantillaId,
}: PayloadFirmarFicha): Promise<void> {
  await firmasApi.signFicha(cronogramaId, { consentimiento: true, plantillaId });
}
