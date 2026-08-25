import { toast } from 'sonner';
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Cronograma } from '@entities/model-cronogramas';
import { FEATURES } from '@shared/config/features';
import { safeSetLocalStorage } from '@/shared/lib/utils';
import { fichaAEstadoFormulario, type DatosFicha } from '../lib/ficha-estado';
import {
  finalizarFichaCompleta,
  guardarBorradorFicha,
  type PayloadFinalizarFicha,
} from '../lib/ficha-envio';
import { encolar } from '@features/offline/outbox';
import { esErrorDeRed } from '@features/offline/errores';

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
   * Guarda la ficha en la cola de envío para subirla al recuperar la conexión, y
   * deja el estado local como si ya se hubiera enviado. El especialista sigue
   * trabajando sin perder nada.
   */
  const encolarEnvio = useCallback(
    async (payload: PayloadFinalizarFicha, estadoLocal: 'BORRADOR' | 'FINALIZADO') => {
      await encolar('finalizar-ficha', payload);
      safeSetLocalStorage(
        claveEstadoLocal(payload.visitId, plantillaId),
        JSON.stringify({ ...payload.datos, estado: estadoLocal }),
      );
      marcarEstadoVisita(payload.visitId, estadoLocal === 'FINALIZADO' ? 'COMPLETADO' : 'EN_PROCESO');
      toast.info('Sin conexión: la ficha quedó guardada y se enviará al recuperar internet.', {
        duration: 8000,
      });
      onPersistido();
    },
    [marcarEstadoVisita, onPersistido, plantillaId],
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
      const payload: PayloadFinalizarFicha = { visitId, plantillaId, datos };

      try {
        await guardarBorradorFicha(payload);
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
        // Sin señal, no es un fallo: la ficha se encola y se envía al reconectar.
        if (esErrorDeRed(error)) await encolarEnvio(payload, 'BORRADOR');
        else manejarFallo(error, visitId, 'guardar borrador');
      }
    },
    [encolarEnvio, manejarFallo, marcarEstadoVisita, onPersistido, plantillaId, qc],
  );

  const finalizar = useCallback(
    async (visitId: string, datos: DatosFicha) => {
      const payload: PayloadFinalizarFicha = { visitId, plantillaId, datos };

      try {
        await finalizarFichaCompleta(payload);
        safeSetLocalStorage(
          claveEstadoLocal(visitId, plantillaId),
          JSON.stringify({ ...datos, estado: 'FINALIZADO' }),
        );
        marcarEstadoVisita(visitId, 'COMPLETADO');
        await qc.invalidateQueries({ queryKey: ['fichas'] });
        await qc.invalidateQueries({ queryKey: ['cronogramas'] });
        onPersistido();
      } catch (error) {
        if (esErrorDeRed(error)) await encolarEnvio(payload, 'FINALIZADO');
        else manejarFallo(error, visitId, 'finalizar la ficha');
      }
    },
    [encolarEnvio, manejarFallo, marcarEstadoVisita, onPersistido, plantillaId, qc],
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
