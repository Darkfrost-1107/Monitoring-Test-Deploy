import { toast } from 'sonner';
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Cronograma } from '@entities/model-cronogramas';
import { FEATURES } from '@shared/config/features';
import { safeSetLocalStorage } from '@/shared/lib/utils';
import {
  aNivelNumerico,
  extraerEvidenciasGenerales,
  fichaAEstadoFormulario,
  type DatosFicha,
} from '../lib/ficha-estado';

/** Qué se consiguió al recuperar la ficha cerrada de una visita. */
export type ResultadoFichaLlena = 'cargada' | 'sin-respaldo' | 'error';

/**
 * Persistencia de la ficha de monitoreo: borrador y cierre.
 *
 * Fase 5 de PLAN_REMEDIACION.md. `CalendarioSidebar` tenía dos manejadores de
 * unas ochenta líneas cada uno que compartían casi todo su cuerpo —crear la
 * ficha si no existe, recorrer las tres colecciones de respuestas, interpretar
 * el 409 de plantilla versionada—. La única diferencia real es el estado al que
 * pasa la visita y si además se cierra la ficha.
 *
 * Vive fuera del componente porque no es maquetación: es la escritura del
 * resultado de un monitoreo.
 */

/** Estado local de la ficha en curso, para recuperarla al reabrir el modal. */
const claveEstadoLocal = (visitId: string, pId?: string) =>
  pId ? `sistema-monitoreo:ficha-state:${visitId}:${pId}` : `sistema-monitoreo:ficha-state:${visitId}`;

/** Datos que trae el 409 cuando la plantilla en uso pasó a histórico. */
export interface PlantillaVersionada {
  visitId: string;
  plantillaVigenteId: string | null;
  plantillaVigenteNombre: string;
}

interface ErrorApiFicha {
  response?: {
    status?: number;
    data?: {
      code?: string;
      plantillaVigenteId?: string;
      plantillaVigenteNombre?: string;
      message?: string;
    };
  };
  message?: string;
}

interface UseFichaPersistenceOptions {
  /** Plantilla con la que se está evaluando, para vincularla a la ficha. */
  plantillaId?: string;
  /** Se invoca cuando la escritura terminó bien. */
  onPersistido: () => void;
  /** Se invoca cuando el backend rechazó por plantilla versionada (ILA-0046). */
  onPlantillaVersionada: (contexto: PlantillaVersionada) => void;
}

export function useFichaPersistence({
  plantillaId,
  onPersistido,
  onPlantillaVersionada,
}: UseFichaPersistenceOptions) {
  const qc = useQueryClient();

  /** Refleja el nuevo estado de la visita en la caché, sin esperar al servidor. */
  const marcarEstadoVisita = useCallback(
    (visitId: string, estado: Cronograma['estado']) => {
      qc.setQueryData<Cronograma[]>(['cronogramas'], (previo) =>
        Array.isArray(previo)
          ? previo.map((c) => (c.id === visitId ? { ...c, estado } : c))
          : previo,
      );
    },
    [qc],
  );

  /**
   * Escribe las tres colecciones de respuestas, creando la ficha si hace falta.
   * Devuelve el identificador de la ficha para que quien llame pueda cerrarla.
   */
  const escribirRespuestas = useCallback(
    async (visitId: string, datos: DatosFicha, incluirPreguntaExtra: boolean) => {
      const { fichasApi } = await import('@/features/monitoreos/api/fichas.api');

      const ficha =
        (plantillaId
          ? await fichasApi.findByVisitaYPlantilla(visitId, plantillaId)
          : await fichasApi.findByVisita(visitId)) ??
        (await fichasApi.create({
          cronogramaId: visitId,
          // La ficha queda vinculada a la plantilla que realmente se usó, para
          // que sus respuestas coincidan al renderizarla o reportarla.
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

      return { ficha, fichasApi };
    },
    [plantillaId],
  );

  /**
   * Traduce el fallo del backend. El 409 por plantilla versionada no es un
   * error para el usuario: es una migración que hay que ofrecerle.
   */
  const manejarFallo = useCallback(
    (error: unknown, visitId: string, accion: string) => {
      const apiErr = error as ErrorApiFicha;

      if (apiErr?.response?.status === 409 && apiErr.response?.data?.code === 'PLANTILLA_VERSIONADA') {
        onPlantillaVersionada({
          visitId,
          plantillaVigenteId: apiErr.response.data.plantillaVigenteId ?? null,
          plantillaVigenteNombre: apiErr.response.data.plantillaVigenteNombre ?? 'Plantilla vigente',
        });
        return;
      }

      const mensaje =
        apiErr?.response?.data?.message ?? apiErr?.message ?? `Error desconocido al ${accion}.`;

      // Antes era un `alert()`: bloqueaba la pestaña sobre una ficha a medio
      // llenar y desaparecía al aceptarlo. El aviso dura lo suficiente para
      // leerlo y no tapa el formulario.
      toast.error(`No se pudo ${accion}`, { description: mensaje, duration: 10_000 });
      console.warn(`No se pudo ${accion} en backend:`, error);
    },
    [onPlantillaVersionada],
  );

  const guardarBorrador = useCallback(
    async (visitId: string, datos: DatosFicha) => {
      marcarEstadoVisita(visitId, 'EN_PROCESO');

      try {
        await escribirRespuestas(visitId, datos, false);
        if (!FEATURES.apiOnly) {
          safeSetLocalStorage(
            claveEstadoLocal(visitId, plantillaId),
            JSON.stringify({ ...datos, estado: 'BORRADOR' }),
          );
        }
        await qc.invalidateQueries({ queryKey: ['fichas'] });
        await qc.invalidateQueries({ queryKey: ['cronogramas'] });
        onPersistido();
      } catch (error) {
        manejarFallo(error, visitId, 'guardar borrador');
      }
    },
    [escribirRespuestas, manejarFallo, marcarEstadoVisita, onPersistido, plantillaId, qc],
  );

  const finalizar = useCallback(
    async (visitId: string, datos: DatosFicha) => {
      try {
        const { ficha, fichasApi } = await escribirRespuestas(visitId, datos, true);

        const generales = extraerEvidenciasGenerales(datos.evidenciaUrls);
        await fichasApi.finalizar(
          ficha.id,
          datos.generalComments,
          datos.sugerencias,
          datos.compromisos,
          Object.keys(generales).length > 0 ? JSON.stringify(generales) : undefined,
        );
        safeSetLocalStorage(
          claveEstadoLocal(visitId, plantillaId),
          JSON.stringify({ ...datos, estado: 'FINALIZADO' }),
        );
        marcarEstadoVisita(visitId, 'COMPLETADO');
        await qc.invalidateQueries({ queryKey: ['fichas'] });
        await qc.invalidateQueries({ queryKey: ['cronogramas'] });
        onPersistido();
      } catch (error) {
        manejarFallo(error, visitId, 'finalizar la ficha');
      }
    },
    [escribirRespuestas, manejarFallo, marcarEstadoVisita, onPersistido, plantillaId, qc],
  );

  /**
   * Deja lista en el estado local una ficha ya cerrada, para poder reabrirla.
   *
   * Si no hay estado local la reconstruye desde el backend; sólo si tampoco hay
   * ficha recurre al relleno de demostración, que no escribe nada en un
   * despliegue real.
   */
  /**
   * Deja lista la ficha ya cerrada de una visita, para abrirla en modo lectura.
   *
   * Antes, cuando el backend no tenía ficha o la consulta fallaba, se sembraba
   * un relleno de demostración —doce aspectos marcados, todos los niveles en
   * III y IV y un párrafo de observaciones redactado— y el evaluador lo abría
   * creyendo que era el monitoreo que alguien levantó. El guardia era
   * `FEATURES.apiOnly`, que depende de `VITE_PERSISTENCE_MODE`: esa variable no
   * está puesta en ningún .env ni en el despliegue, así que el modo cae en
   * `hybrid` y el guardia nunca llegaba a cerrar.
   *
   * Ahora devuelve qué pasó y quien llama decide qué decir. Una ficha que no
   * está no se inventa.
   */
  const prepararFichaLlena = useCallback(
    async (visitId: string, pId?: string): Promise<ResultadoFichaLlena> => {
      // Lo que ya está en curso localmente manda: no se pisa con lo del servidor.
      const clave = claveEstadoLocal(visitId, pId);
      if (localStorage.getItem(clave)) return 'cargada';

      try {
        const { fichasApi } = await import('@/features/monitoreos/api/fichas.api');
        const ficha = pId
          ? await fichasApi.findByVisitaYPlantilla(visitId, pId)
          : await fichasApi.findByVisita(visitId);
        if (!ficha) return 'sin-respaldo';

        safeSetLocalStorage(clave, JSON.stringify(fichaAEstadoFormulario(ficha)));
        return 'cargada';
      } catch (error) {
        console.error(error);
        return 'error';
      }
    },
    [],
  );

  return { guardarBorrador, finalizar, prepararFichaLlena };
}
