import { useMemo } from 'react';
import type { Docente } from '@entities/model-docentes';
import { opcionesDeEvaluadorInterno, type Opcion } from '../lib/opciones-de-asignacion';
import { docenteEvaluablePorEspecialista } from '../lib/asignacion';

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
 *
 * ── Por identificador ──
 * La institución y el evaluador se buscaban por nombre en minúsculas. En la
 * base hay tres nombres de institución repetidos, uno de ellos cinco veces:
 * esa búsqueda devolvía siempre la primera y el personal ofrecido podía ser el
 * de otro colegio.
 */

/** Cargos de una institución educativa que levantan ficha. */
const CARGOS_EVALUADORES = ['Director', 'Coordinador Pedagógico', 'Jefe de Taller'];

/** Cargos que sólo evalúan al personal que tienen asignado. */
const CARGOS_CON_CARTERA = ['Coordinador Pedagógico', 'Jefe de Taller'];

export type { Opcion };

interface InstitucionConocida {
  id: string;
  nombre: string;
  nivelEducativo: string;
}

interface OpcionesDeEvaluacionParams {
  docentes: readonly Docente[];
  instituciones: readonly InstitucionConocida[];
  /** Para resolver a qué especialista corresponde cada evaluador de la I.E. */
  especialistas: readonly { id: string; personaId: string }[];
  /** El director trabaja siempre sobre su propia institución. */
  esDirector: boolean;
  /** Identificador de la institución del usuario, cuando pertenece a una. */
  institucionDelUsuarioId?: string;
  /** Institución elegida en el formulario, para quien sí la elige. */
  institucionElegidaId: string;
  tipoDeVisita: import('@sistema-monitoreo/shared-contracts').TipoMonitoreo;
  evaluadorElegidoId: string;
  evaluadoElegidoId: string;
  /** Especialidades del especialista elegido; en Secundaria acotan a los docentes. */
  especialidadesDelEvaluador?: readonly string[];
}

const nombreCompleto = (docente: Docente) => `${docente.nombres} ${docente.apellidos}`;

/**
 * Antepone el valor ya elegido cuando no figura entre las opciones.
 *
 * Pasa al editar una visita cuyo evaluado cambió de institución o quedó
 * inactivo: sin esto el selector aparecería vacío y el dato se perdería al
 * guardar. Se busca su nombre en el padrón completo para no mostrar un
 * identificador crudo.
 */
const conValorActual = (
  opciones: Opcion[],
  elegidoId: string,
  padron: readonly Docente[],
): Opcion[] => {
  if (!elegidoId || opciones.some((o) => o.value === elegidoId)) return opciones;

  const conocido = padron.find((d) => d.id === elegidoId);
  const label = conocido ? `${nombreCompleto(conocido)} (${conocido.cargo})` : 'Registro anterior';

  return [{ value: elegidoId, label }, ...opciones];
};

const aOpcion = (docente: Docente): Opcion => {
  // Se muestra el área además del cargo: en Secundaria es lo que permite ver de
  // un vistazo que el docente corresponde al especialista elegido.
  const area = docente.especialidad ? ` · ${docente.especialidad}` : '';
  return {
    value: docente.id,
    label: `${nombreCompleto(docente)} (${docente.cargo})${area}`,
  };
};

export function useOpcionesDeEvaluacion({
  docentes,
  instituciones,
  especialistas,
  esDirector,
  institucionDelUsuarioId,
  institucionElegidaId,
  tipoDeVisita,
  evaluadorElegidoId,
  evaluadoElegidoId,
  especialidadesDelEvaluador,
}: OpcionesDeEvaluacionParams) {
  /** Institución sobre la que se está programando. */
  const institucion = useMemo(() => {
    const id = esDirector ? institucionDelUsuarioId : institucionElegidaId;
    if (!id) return null;
    return instituciones.find((i) => i.id === id) ?? null;
  }, [esDirector, institucionDelUsuarioId, institucionElegidaId, instituciones]);

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

  const evaluadosBase = useMemo(() => {
    if (esDirector) {
      if (!institucionDelUsuarioId) return [];

      // El director no se evalúa a sí mismo: su visita la programa la UGEL.
      const personal = docentes.filter(
        (d) =>
          d.institucionId === institucionDelUsuarioId &&
          d.activo === true &&
          d.cargo !== 'Director',
      );

      // El formulario guarda el identificador de especialista; para saber qué
      // cargo ocupa hay que volver a su registro docente por persona.
      const personaDelEvaluador = especialistas.find(
        (e) => e.id === evaluadorElegidoId,
      )?.personaId;

      const evaluador = docentes.find(
        (d) => d.personaId === personaDelEvaluador && d.institucionId === institucionDelUsuarioId,
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
    institucionDelUsuarioId,
    docentes,
    especialistas,
    institucion,
    tipoDeVisita,
    evaluadorElegidoId,
  ]);

  /**
   * En Secundaria el especialista de UGEL sólo monitorea a los docentes cuya
   * área maneja. En los demás niveles pasan todos, y antes de elegir
   * especialista no se filtra para no mostrar una lista vacía sin explicación.
   *
   * ── Por qué NO se aplica al personal de la institución ──
   * Esa regla es del especialista de UGEL, que se asigna por área. El
   * coordinador pedagógico y el jefe de taller se rigen por otra: su cartera de
   * docentes asignados, que ya se filtró más arriba y que al armarse contempla
   * la especialidad.
   *
   * Ninguno de los dos tiene registro de especialista, así que
   * `especialidadesDelEvaluador` llega vacío. Y en Secundaria una lista vacía
   * de áreas descarta a TODOS los docentes: el selector aparecía sin una sola
   * opción, con la cartera correctamente cargada detrás.
   */
  const evaluados = useMemo(
    () =>
      esDirector
        ? evaluadosBase
        : evaluadosBase.filter(
            (d) =>
              !evaluadorElegidoId ||
              docenteEvaluablePorEspecialista(
                d.especialidad,
                especialidadesDelEvaluador ?? [],
                esSecundaria,
              ),
          ),
    [esDirector, evaluadosBase, evaluadorElegidoId, especialidadesDelEvaluador, esSecundaria],
  );

  const opcionesDeEvaluado = useMemo(
    () => conValorActual(evaluados.map(aOpcion), evaluadoElegidoId, docentes),
    [evaluados, evaluadoElegidoId, docentes],
  );

  /**
   * El evaluador se elige entre los docentes de la I.E., pero la visita
   * referencia a su registro de **especialista**: el valor de cada opción es ese
   * identificador, resuelto por persona.
   */
  const opcionesDeEvaluador = useMemo(() => {
    const opciones = opcionesDeEvaluadorInterno(evaluadores, especialistas);
    if (!evaluadorElegidoId || opciones.some((o) => o.value === evaluadorElegidoId)) {
      return opciones;
    }

    // Al editar, el evaluador puede haber dejado el cargo: se conserva para no
    // perderlo al guardar.
    return [{ value: evaluadorElegidoId, label: 'Evaluador anterior' }, ...opciones];
  }, [evaluadores, especialistas, evaluadorElegidoId]);

  return { evaluados, esSecundaria, opcionesDeEvaluado, opcionesDeEvaluador };
}
