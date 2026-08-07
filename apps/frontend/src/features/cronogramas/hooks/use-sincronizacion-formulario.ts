import { useEffect } from 'react';
import type { Cronograma } from '@entities/model-cronogramas';
import type { FormularioCronograma } from '../lib/formulario';
import { numerosDeVisitaDisponibles } from '../lib/numeracion-visitas';

interface Evaluable {
  id: string;
  nombres: string;
  apellidos: string;
}

interface SincronizacionParams {
  /** En edición no se corrige nada: la visita ya está emitida. */
  esEdicion: boolean;
  evaluadorElegido: string;
  evaluadoElegido: string;
  tipoDeVisita: FormularioCronograma['tipo'];
  /** Evaluados que el evaluador actual puede monitorear. */
  evaluadosDisponibles: readonly Evaluable[];
  /** Evaluado ya resuelto a su registro, si el nombre coincide con alguno. */
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
 * El diferido con `setTimeout` se conserva del código original: evita escribir
 * estado dentro del mismo ciclo de render que dispara el efecto.
 */
export function useSincronizacionFormulario({
  esEdicion,
  evaluadorElegido,
  evaluadoElegido,
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
  useEffect(() => {
    if (esEdicion || !evaluadorElegido || !evaluadoElegido) return;

    const sigueDisponible = evaluadosDisponibles.some(
      (d) => `${d.nombres} ${d.apellidos}`.trim() === evaluadoElegido.trim(),
    );
    if (sigueDisponible) return;

    const t = setTimeout(() => onCambiar('docente', ''), 0);
    return () => clearTimeout(t);
  }, [esEdicion, evaluadorElegido, evaluadoElegido, evaluadosDisponibles, onCambiar]);

  /**
   * Sugiere el número de visita que corresponde al evaluado elegido. Al editar
   * se respeta el número original, que ya está emitido.
   */
  useEffect(() => {
    if (esEdicion || !evaluadoResuelto) return;

    const suyas = cronogramas.filter(
      (c) => c.evaluadoId === evaluadoResuelto.id && c.tipo === tipoDeVisita,
    );
    const siguiente = numerosDeVisitaDisponibles(suyas).find((n) => !n.isOcupado && !n.isFuture);
    if (!siguiente) return;

    const t = setTimeout(() => onCambiar('visita', siguiente.value), 0);
    return () => clearTimeout(t);
  }, [esEdicion, evaluadoResuelto, tipoDeVisita, cronogramas, onCambiar]);
}
