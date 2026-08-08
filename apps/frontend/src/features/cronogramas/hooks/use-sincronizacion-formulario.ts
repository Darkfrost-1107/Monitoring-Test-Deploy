import { useState } from 'react';
import type { Cronograma } from '@entities/model-cronogramas';
import type { FormularioCronograma } from '../lib/formulario';
import { numerosDeVisitaDisponibles } from '../lib/numeracion-visitas';

interface Evaluable {
  id: string;
}

interface SincronizacionParams {
  /** En edición no se corrige nada: la visita ya está emitida. */
  esEdicion: boolean;
  evaluadorElegidoId: string;
  evaluadoElegidoId: string;
  tipoDeVisita: FormularioCronograma['tipo'];
  /** Evaluados que el evaluador actual puede monitorear. */
  evaluadosDisponibles: readonly Evaluable[];
  /** Evaluado ya resuelto a su registro. */
  evaluadoResuelto: Evaluable | null;
  cronogramas: readonly Cronograma[];
  onCambiar: <K extends keyof FormularioCronograma>(
    campo: K,
    valor: FormularioCronograma[K],
  ) => void;
}

/**
 * Correcciones automáticas del formulario de programación.
 *
 * Fase 5 de PLAN_REMEDIACION.md. Eran dos efectos dentro de `CronogramaPage`
 * que mantenían coherente el formulario ante cambios en cascada. Son
 * sincronización de estado, no maquetación.
 *
 * Las dos correcciones se aplican durante el render y no en un efecto: tocan
 * estado de este mismo componente, así que React descarta el render y vuelve a
 * empezar con los valores nuevos, sin pintar el intermedio. Antes se diferían
 * con `setTimeout(…, 0)`, que era el rodeo para la advertencia de renders en
 * cascada.
 */
export function useSincronizacionFormulario({
  esEdicion,
  evaluadorElegidoId,
  evaluadoElegidoId,
  tipoDeVisita,
  evaluadosDisponibles,
  evaluadoResuelto,
  cronogramas,
  onCambiar,
}: SincronizacionParams) {
  /**
   * Un coordinador o jefe de taller sólo evalúa a su cartera. Al cambiar de
   * evaluador, el evaluado ya elegido puede dejar de estar entre sus opciones:
   * conservarlo dejaría el selector mostrando a alguien que ese evaluador no
   * puede monitorear.
   */
  const hayQueSoltarAlEvaluado =
    !esEdicion &&
    !!evaluadorElegidoId &&
    !!evaluadoElegidoId &&
    !evaluadosDisponibles.some((d) => d.id === evaluadoElegidoId);

  // Al vaciarlo, la condición deja de cumplirse sola: no hace falta recordar
  // que ya se hizo.
  if (hayQueSoltarAlEvaluado) {
    onCambiar('evaluadoId', '');
  }

  /**
   * Sugiere el número de visita que corresponde al evaluado elegido. Al editar
   * se respeta el número original, que ya está emitido.
   */
  /**
   * Se sugiere una sola vez por evaluado y tipo de visita. La clave hace
   * explícito lo que antes dependía de las dependencias del efecto: sin ella,
   * un refresco del listado de cronogramas volvería a sugerir y pisaría el
   * número que el usuario hubiera elegido a mano.
   */
  const paraQuien = evaluadoResuelto ? `${evaluadoResuelto.id}:${tipoDeVisita}` : null;
  const [sugeridoPara, setSugeridoPara] = useState<string | null>(null);

  if (!esEdicion && evaluadoResuelto && paraQuien && sugeridoPara !== paraQuien) {
    setSugeridoPara(paraQuien);

    const suyas = cronogramas.filter(
      (c) => c.evaluadoId === evaluadoResuelto.id && c.tipo === tipoDeVisita,
    );
    const siguiente = numerosDeVisitaDisponibles(suyas).find((n) => !n.isOcupado && !n.isFuture);

    if (siguiente) onCambiar('visita', siguiente.value);
  }
}
