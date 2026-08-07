import type { DatosFicha } from './ficha-estado';

/**
 * Estado del formulario de ficha, en una sola pieza.
 *
 * Fase 5 de PLAN_REMEDIACION.md. `LlenarFichaForm` declaraba diecinueve
 * `useState` y repetía el mismo bloque de catorce asignaciones cuatro veces:
 * una por cada origen del estado inicial —estado recibido, estado local,
 * estado local corrupto y ficha nueva—. Agregar un campo obligaba a acertar en
 * las cuatro.
 */

/** Contexto del aula, tal como lo edita el formulario. */
export interface ContextoDeAula {
  area: string;
  grado: string;
  seccion: string;
  /**
   * Cadena vacía mientras no se cargó. Un cero es una respuesta —un aula sin
   * estudiantes con necesidades especiales— y no equivale a no haber contestado.
   */
  alumnos: number | '';
  alumnosNee: number | '';
}

export interface EstadoFormularioFicha {
  checkedAspects: Record<string, boolean>;
  selectedLevels: Record<string, string>;
  generalComments: string;
  sugerencias: string;
  compromisos: string;
  rubricComments: Record<string, string>;
  preguntaExtraAnswers: Record<string, boolean>;
  respuestasEjeItem: Record<string, number>;
  evidenciaUrls: Record<string, string>;
  observacionesEjeItem: Record<string, string>;
  contexto: ContextoDeAula;
}

const CONTEXTO_VACIO: ContextoDeAula = {
  area: '',
  grado: '',
  seccion: '',
  alumnos: '',
  alumnosNee: '',
};

export const FORMULARIO_VACIO: EstadoFormularioFicha = {
  checkedAspects: {},
  selectedLevels: {},
  generalComments: '',
  sugerencias: '',
  compromisos: '',
  rubricComments: {},
  preguntaExtraAnswers: {},
  respuestasEjeItem: {},
  evidenciaUrls: {},
  observacionesEjeItem: {},
  contexto: CONTEXTO_VACIO,
};

/** Contexto tal como viaja en la ficha persistida. */
type ContextoPersistido = Partial<NonNullable<DatosFicha['contexto']>>;

/** Fuente parcial del estado inicial: puede venir incompleta desde cualquier lado. */
export type FuenteDeEstado = Partial<Omit<DatosFicha, 'contexto'>> & {
  contexto?: ContextoPersistido | null;
};

/** Rellena con vacíos lo que la fuente no traiga. */
export function hidratarFormulario(
  fuente: FuenteDeEstado | null | undefined,
): EstadoFormularioFicha {
  if (!fuente) return FORMULARIO_VACIO;

  return {
    checkedAspects: fuente.checkedAspects ?? {},
    selectedLevels: fuente.selectedLevels ?? {},
    generalComments: fuente.generalComments ?? '',
    sugerencias: fuente.sugerencias ?? '',
    compromisos: fuente.compromisos ?? '',
    rubricComments: fuente.rubricComments ?? {},
    preguntaExtraAnswers: fuente.preguntaExtraAnswers ?? {},
    respuestasEjeItem: fuente.respuestasEjeItem ?? {},
    evidenciaUrls: fuente.evidenciaUrls ?? {},
    observacionesEjeItem: fuente.observacionesEjeItem ?? {},
    contexto: fuente.contexto
      ? {
          area: fuente.contexto.areaCurricular ?? '',
          grado: fuente.contexto.grado ?? '',
          seccion: fuente.contexto.seccion ?? '',
          alumnos: fuente.contexto.cantidadEstudiantes ?? '',
          alumnosNee: fuente.contexto.cantidadEstudiantesNee ?? '',
        }
      : CONTEXTO_VACIO,
  };
}

/**
 * Interpreta el estado local serializado.
 *
 * Un estado corrupto se descarta en lugar de propagar el error: impedir que se
 * abra la ficha sería peor que perder un borrador ilegible.
 */
export function leerEstadoGuardado(crudo: string | null): FuenteDeEstado | null {
  if (!crudo) return null;
  try {
    return JSON.parse(crudo) as FuenteDeEstado;
  } catch (error) {
    console.warn('Estado de ficha ilegible; se descarta.', error);
    return null;
  }
}

/**
 * ¿El contexto de aula ya viene cargado?
 *
 * Sólo cuentan área, grado y sección: la cantidad de estudiantes se completa
 * sola en algunos flujos, y tomarla como señal impediría autocompletar el resto
 * desde la ficha del docente.
 */
export const tieneContextoCargado = (contexto: ContextoPersistido | undefined | null): boolean =>
  !!(contexto?.areaCurricular || contexto?.grado || contexto?.seccion);

/**
 * Arma el payload que se envía al guardar o finalizar.
 *
 * Estaba escrito dos veces dentro del componente, una en cada manejador.
 * El contexto sólo acompaña al monitoreo a docente: una visita a un directivo
 * no ocurre en un aula y no tiene área, grado ni sección que registrar.
 */
export function aDatosFicha(
  estado: EstadoFormularioFicha,
  tipoVisita: 'DOCENTE' | 'DIRECTIVO',
): DatosFicha {
  const { contexto, ...respuestas } = estado;

  return {
    ...respuestas,
    contexto:
      tipoVisita === 'DOCENTE'
        ? {
            areaCurricular: contexto.area,
            grado: contexto.grado,
            seccion: contexto.seccion,
            cantidadEstudiantes: Number(contexto.alumnos) || 0,
            cantidadEstudiantesNee: Number(contexto.alumnosNee) || 0,
          }
        : undefined,
  };
}

/** Clave con la que se guarda el borrador de una ficha en el navegador. */
export const claveEstadoLocal = (visitId: string) => `sistema-monitoreo:ficha-state:${visitId}`;
