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
  templateId?: string | undefined;
  evaluadoId: string | undefined;
  /** Estado con el que se abrió el formulario, si lo hubo. */
  initialState: FuenteDeEstado | undefined;
  onAutocompletarContexto: (contexto: Partial<ContextoDeAula>) => void;
}

function buscarContextoDeVisitaLocal(visitId: string) {
  try {
    const base = leerEstadoGuardado(localStorage.getItem(claveEstadoLocal(visitId)));
    if (base?.contexto && tieneContextoCargado(base.contexto)) {
      return base.contexto;
    }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`sistema-monitoreo:ficha-state:${visitId}`)) {
        const parsed = leerEstadoGuardado(localStorage.getItem(key));
        if (parsed?.contexto && tieneContextoCargado(parsed.contexto)) {
          return parsed.contexto;
        }
      }
    }
  } catch {
    // ignorar fallo de acceso a localStorage
  }
  return null;
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
 * Si en la misma visita ya se llenó una ficha previa (ej. EIB), hereda
 * automáticamente área, grado, sección y número de alumnos de dicha sesión.
 */
export function useDocenteEvaluado({
  activo,
  visitId,
  templateId,
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

    void fetchDocenteById(evaluadoId).then(async (docente) => {
      if (cancelado || !docente) return;

      setEncontrado({ evaluadoId, docente });

      const guardado = leerEstadoGuardado(
        localStorage.getItem(claveEstadoLocal(visitId, templateId)),
      );
      const yaHayContexto =
        tieneContextoCargado(guardado?.contexto) || tieneContextoCargado(initialState?.contexto);
      if (yaHayContexto) return;

      // 1. Intentar heredar de otra ficha de la misma visita guardada localmente
      const localCtx = buscarContextoDeVisitaLocal(visitId);
      if (localCtx) {
        onAutocompletarContexto({
          area: localCtx.areaCurricular ?? '',
          grado: localCtx.grado ?? '',
          seccion: localCtx.seccion ?? '',
          alumnos: localCtx.cantidadEstudiantes !== undefined ? localCtx.cantidadEstudiantes : '',
          alumnosNee:
            localCtx.cantidadEstudiantesNee !== undefined
              ? localCtx.cantidadEstudiantesNee
              : '',
        });
        return;
      }

      // 2. Intentar heredar de fichas previas persistidas en backend para esta visita
      try {
        const { fichasApi } = await import('../api/fichas.api');
        const fichas = await fichasApi.findAllByVisita(visitId);
        if (cancelado) return;
        const conContexto = fichas.find(
          (f) =>
            f.contexto &&
            (f.contexto.areaCurricular || f.contexto.grado || f.contexto.seccion),
        );
        if (conContexto?.contexto) {
          onAutocompletarContexto({
            area: conContexto.contexto.areaCurricular ?? '',
            grado: conContexto.contexto.grado ?? '',
            seccion: conContexto.contexto.seccion ?? '',
            alumnos:
              conContexto.contexto.cantidadEstudiantes !== null &&
              conContexto.contexto.cantidadEstudiantes !== undefined
                ? conContexto.contexto.cantidadEstudiantes
                : '',
            alumnosNee:
              conContexto.contexto.cantidadEstudiantesNee !== null &&
              conContexto.contexto.cantidadEstudiantesNee !== undefined
                ? conContexto.contexto.cantidadEstudiantesNee
                : '',
          });
          return;
        }
      } catch {
        // En caso de fallo de red, continuar con sugerencias del docente
      }

      // 3. Autocompletar sugerencias desde el perfil del docente evaluado
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
  }, [activo, visitId, templateId, evaluadoId, initialState, onAutocompletarContexto]);

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
