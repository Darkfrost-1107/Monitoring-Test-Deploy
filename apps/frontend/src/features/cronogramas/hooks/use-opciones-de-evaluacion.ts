import { useMemo } from 'react';
import type { Docente } from '@entities/model-docentes';

/**
 * A quién se puede evaluar y quién puede evaluarlo, dentro de una institución.
 *
 * Fase 5 de PLAN_REMEDIACION.md. Eran cinco `useMemo` encadenados dentro de
 * `CronogramaPage` que repetían tres veces la misma búsqueda de institución por
 * nombre.
 *
 * La regla de fondo: en una institución evalúan el director, el coordinador
 * pedagógico y el jefe de taller. Los dos últimos sólo evalúan a los docentes
 * que tienen asignados; el director, a todos.
 */

/** Cargos de una institución educativa que levantan ficha. */
const CARGOS_EVALUADORES = ['Director', 'Coordinador Pedagógico', 'Jefe de Taller'];

/** Cargos que sólo evalúan al personal que tienen asignado. */
const CARGOS_CON_CARTERA = ['Coordinador Pedagógico', 'Jefe de Taller'];

export interface Opcion {
  value: string;
  label: string;
}

interface InstitucionConocida {
  id: string;
  nombre: string;
  nivelEducativo: string;
}

interface OpcionesDeEvaluacionParams {
  docentes: readonly Docente[];
  instituciones: readonly InstitucionConocida[];
  /** El director trabaja siempre sobre su propia institución. */
  esDirector: boolean;
  institucionDelUsuario: { id?: string; nombre?: string };
  /** Institución elegida en el formulario, para quien sí la elige. */
  institucionElegida: string;
  tipoDeVisita: 'DOCENTE' | 'DIRECTIVO';
  evaluadorElegido: string;
  evaluadoElegido: string;
}

const nombreCompleto = (docente: Docente) => `${docente.nombres} ${docente.apellidos}`;

/**
 * Antepone el valor ya elegido cuando no figura entre las opciones.
 *
 * Pasa al editar una visita cuyo evaluado cambió de institución o quedó
 * inactivo: sin esto el selector aparecería vacío y el dato se perdería al
 * guardar.
 */
const conValorActual = (opciones: Opcion[], elegido: string): Opcion[] =>
  elegido && !opciones.some((o) => o.value === elegido)
    ? [{ value: elegido, label: elegido }, ...opciones]
    : opciones;

const aOpcion = (docente: Docente): Opcion => ({
  value: nombreCompleto(docente),
  label: `${nombreCompleto(docente)} (${docente.cargo})`,
});

export function useOpcionesDeEvaluacion({
  docentes,
  instituciones,
  esDirector,
  institucionDelUsuario,
  institucionElegida,
  tipoDeVisita,
  evaluadorElegido,
  evaluadoElegido,
}: OpcionesDeEvaluacionParams) {
  /** Institución sobre la que se está programando. */
  const institucion = useMemo(() => {
    const nombre = esDirector ? institucionDelUsuario.nombre : institucionElegida;
    if (!nombre) return null;
    return (
      instituciones.find((i) => i.nombre.toLowerCase() === nombre.toLowerCase()) ?? null
    );
  }, [esDirector, institucionDelUsuario.nombre, institucionElegida, instituciones]);

  /**
   * Sólo en Secundaria existen el coordinador pedagógico y el jefe de taller,
   * de modo que en los demás niveles el director es el único evaluador posible.
   */
  const esSecundaria = institucion?.nivelEducativo.toLowerCase() === 'secundaria';

  const evaluadores = useMemo(() => {
    if (!institucion) return [];
    return docentes.filter(
      (d) =>
        d.institucionId === institucion.id &&
        d.activo === true &&
        CARGOS_EVALUADORES.includes(d.cargo),
    );
  }, [docentes, institucion]);

  const evaluados = useMemo(() => {
    if (esDirector) {
      const institucionId = institucionDelUsuario.id;
      if (!institucionId) return [];

      // El director no se evalúa a sí mismo: su visita la programa la UGEL.
      const personal = docentes.filter(
        (d) => d.institucionId === institucionId && d.activo === true && d.cargo !== 'Director',
      );

      const evaluador = docentes.find(
        (d) =>
          d.institucionId === institucionId &&
          d.activo === true &&
          nombreCompleto(d).trim().toLowerCase() === evaluadorElegido.trim().toLowerCase(),
      );

      if (evaluador && CARGOS_CON_CARTERA.includes(evaluador.cargo)) {
        return personal.filter((d) => d.evaluadorActual?.evaluadorId === evaluador.id);
      }

      return personal;
    }

    if (!institucion) return [];

    return docentes.filter((d) => {
      if (d.institucionId !== institucion.id || d.activo !== true) return false;
      // Un monitoreo directivo evalúa al director; uno docente, al resto.
      return tipoDeVisita === 'DIRECTIVO' ? d.cargo === 'Director' : d.cargo !== 'Director';
    });
  }, [
    esDirector,
    institucionDelUsuario.id,
    docentes,
    institucion,
    tipoDeVisita,
    evaluadorElegido,
  ]);

  const opcionesDeEvaluado = useMemo(
    () => conValorActual(evaluados.map(aOpcion), evaluadoElegido),
    [evaluados, evaluadoElegido],
  );

  const opcionesDeEvaluador = useMemo(
    () => conValorActual(evaluadores.map(aOpcion), evaluadorElegido),
    [evaluadores, evaluadorElegido],
  );

  return { evaluados, esSecundaria, opcionesDeEvaluado, opcionesDeEvaluador };
}
