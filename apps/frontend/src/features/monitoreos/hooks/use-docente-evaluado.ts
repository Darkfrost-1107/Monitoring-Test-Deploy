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
  const [docente, setDocente] = useState<Docente | null>(null);

  useEffect(() => {
    if (!activo || !visitId || !evaluadoId) {
      setTimeout(() => setDocente(null), 0);
      return;
    }

    void fetchDocenteById(evaluadoId).then((encontrado) => {
      if (!encontrado) return;

      // El diferido es el comportamiento original y se conserva.
      setTimeout(() => {
        setDocente(encontrado);

        const guardado = leerEstadoGuardado(localStorage.getItem(claveEstadoLocal(visitId)));
        const yaHayContexto =
          tieneContextoCargado(guardado?.contexto) || tieneContextoCargado(initialState?.contexto);
        if (yaHayContexto) return;

        const primeraSeccion = encontrado.secciones?.[0];
        onAutocompletarContexto({
          area: encontrado.especialidad || 'General',
          ...(primeraSeccion
            ? { grado: primeraSeccion.grado || '', seccion: primeraSeccion.seccion || '' }
            : {}),
        });
      }, 0);
    });
  }, [activo, visitId, evaluadoId, initialState, onAutocompletarContexto]);

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
