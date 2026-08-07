import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import {
  FORMULARIO_VACIO,
  hidratarFormulario,
  type ContextoDeAula,
  type EstadoFormularioFicha,
  type FuenteDeEstado,
} from '../lib/estado-formulario';

/**
 * Se usa `SetStateAction` de React y no un tipo propio para que los sitios de
 * uso conserven la inferencia del parámetro en `set(prev => …)`.
 */
const resolver = <T,>(valor: SetStateAction<T>, previo: T): T =>
  typeof valor === 'function' ? (valor as (p: T) => T)(previo) : valor;

/**
 * Estado del formulario de ficha.
 *
 * Fase 5 de PLAN_REMEDIACION.md. `LlenarFichaForm` declaraba diecinueve
 * `useState` sueltos. Queda una sola pieza de estado, con actualizadores por
 * campo que conservan la firma de `useState` para no tener que reescribir los
 * sitios de uso a lo largo del formulario.
 *
 * Las reglas —qué es un formulario vacío, cómo se hidrata, cómo se arma el
 * payload— viven en `lib/estado-formulario.ts`, con cobertura propia.
 */
export function useFormularioFicha() {
  const [estado, setEstado] = useState<EstadoFormularioFicha>(FORMULARIO_VACIO);

  /** Reemplaza el formulario entero con lo que traiga la fuente. */
  const hidratar = useCallback((fuente: FuenteDeEstado | null | undefined) => {
    setEstado(hidratarFormulario(fuente));
  }, []);

  const campo = useMemo(() => {
    const asignar =
      <K extends keyof Omit<EstadoFormularioFicha, 'contexto'>>(
        clave: K,
      ): Dispatch<SetStateAction<EstadoFormularioFicha[K]>> =>
      (valor) =>
        setEstado((previo) => ({ ...previo, [clave]: resolver(valor, previo[clave]) }));

    const asignarContexto =
      <K extends keyof ContextoDeAula>(
        clave: K,
      ): Dispatch<SetStateAction<ContextoDeAula[K]>> =>
      (valor) =>
        setEstado((previo) => ({
          ...previo,
          contexto: { ...previo.contexto, [clave]: resolver(valor, previo.contexto[clave]) },
        }));

    return {
      setCheckedAspects: asignar('checkedAspects'),
      setSelectedLevels: asignar('selectedLevels'),
      setGeneralComments: asignar('generalComments'),
      setSugerencias: asignar('sugerencias'),
      setCompromisos: asignar('compromisos'),
      setRubricComments: asignar('rubricComments'),
      setPreguntaExtraAnswers: asignar('preguntaExtraAnswers'),
      setRespuestasEjeItem: asignar('respuestasEjeItem'),
      setEvidenciaUrls: asignar('evidenciaUrls'),
      setObservacionesEjeItem: asignar('observacionesEjeItem'),
      /** Actualizador genérico, para formularios que editan varios campos. */
      setContextoCampo: <K extends keyof ContextoDeAula>(clave: K, valor: ContextoDeAula[K]) =>
        setEstado((previo) => ({ ...previo, contexto: { ...previo.contexto, [clave]: valor } })),
      setContextoArea: asignarContexto('area'),
      setContextoGrado: asignarContexto('grado'),
      setContextoSeccion: asignarContexto('seccion'),
      setContextoAlumnos: asignarContexto('alumnos'),
      setContextoAlumnosNee: asignarContexto('alumnosNee'),
    };
  }, []);

  return { estado, hidratar, ...campo };
}
