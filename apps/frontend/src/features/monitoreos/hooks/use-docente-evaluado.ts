import { useEffect, useMemo, useState } from 'react';
import { fetchDocenteById } from '@features/docentes/docente-service';
import type { Docente } from '@entities/model-docentes';
import {
  claveEstadoLocal,
  leerEstadoGuardado,
  tieneContextoCargado,
  type ContextoDeAula,
  type FuenteDeEstado,
} from '../lib/estado-formulario';

interface OpcionesDocenteEvaluado {
  activo: boolean;
  visitId: string | undefined;
  evaluadoId: string | undefined;
  /** Estado con el que se abrió el formulario, si lo hubo. */
  initialState: FuenteDeEstado | undefined;
  onAutocompletarContexto: (contexto: Partial<ContextoDeAula>) => void;
}

/**
 * Ficha del docente evaluado, con autocompletado del contexto de aula.
 *
 * Fase 5 de PLAN_REMEDIACION.md. Vivía como un efecto dentro de
 * `LlenarFichaForm` que mezclaba tres cosas: pedir el docente, decidir si ya
 * había contexto cargado, y escribir el que corresponda.
 *
 * No pisa lo que el evaluador ya escribió: si el borrador local o el estado
 * recibido traen área, grado o sección, el autocompletado no ocurre.
 */
export function useDocenteEvaluado({
  activo,
  visitId,
  evaluadoId,
  initialState,
  onAutocompletarContexto,
}: OpcionesDocenteEvaluado) {
  /** Lo encontrado, junto al evaluado que lo originó. */
  const [encontrado, setEncontrado] = useState<{ evaluadoId: string; docente: Docente } | null>(
    null,
  );

  useEffect(() => {
    if (!activo || !visitId || !evaluadoId) return;

    // Una respuesta que llega tarde no debe cargar al docente de otra visita.
    let cancelado = false;

    void fetchDocenteById(evaluadoId).then((docente) => {
      if (cancelado || !docente) return;

      setEncontrado({ evaluadoId, docente });

      const guardado = leerEstadoGuardado(localStorage.getItem(claveEstadoLocal(visitId)));
      const yaHayContexto =
        tieneContextoCargado(guardado?.contexto) || tieneContextoCargado(initialState?.contexto);
      if (yaHayContexto) return;

      const primeraSeccion = docente.secciones?.[0];
      onAutocompletarContexto({
        // Sin especialidad no se sugiere área: rellenarla con «General» sería
        // proponer un área que el docente no declaró, en un campo de la ficha.
        ...(docente.especialidad ? { area: docente.especialidad } : {}),
        ...(primeraSeccion
          ? { grado: primeraSeccion.grado || '', seccion: primeraSeccion.seccion || '' }
          : {}),
      });
    });

    return () => {
      cancelado = true;
    };
  }, [activo, visitId, evaluadoId, initialState, onAutocompletarContexto]);

  /**
   * Se deriva en vez de limpiarse: cerrar la ficha o cambiar de evaluado ya no
   * necesita un efecto que ponga el estado en nulo con `setTimeout(…, 0)`.
   */
  const docente =
    activo && encontrado && encontrado.evaluadoId === evaluadoId ? encontrado.docente : null;

  /**
   * Áreas que el docente dicta, para ofrecerlas de un toque. La especialidad
   * llega como una lista separada por comas.
   */
  const areasSugeridas = useMemo(
    () =>
      docente?.especialidad
        ?.split(',')
        .map((area) => area.trim())
        .filter(Boolean) ?? [],
    [docente],
  );

  return { docente, areasSugeridas };
}
