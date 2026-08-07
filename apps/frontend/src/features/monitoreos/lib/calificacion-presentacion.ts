import {
  NIVEL_LOGRO_LABELS,
  calcularResultadoBaremo,
  romanoANivel,
  type NivelLogro,
} from '@sistema-monitoreo/shared-contracts';

/**
 * Calificación consolidada que se muestra al cerrar la ficha.
 *
 * El cálculo es del contrato compartido, que es el mismo que aplica el backend
 * al persistir. Esta pantalla tuvo su propia tabla sobre el puntaje total:
 * coincidía con el backend sólo para plantillas de cinco desempeños y
 * discrepaba en cualquier otra, de modo que el evaluador podía ver un nivel de
 * logro y guardarse otro. Ver H-28 de PLAN_REMEDIACION.md.
 *
 * Lo que se agrega acá es presentación: etiqueta y colores del nivel.
 */

/** Puntos que otorga el nivel más alto de la escala. */
const PUNTAJE_MAXIMO_POR_DESEMPENO = 4;

/**
 * Color y fondo de cada nivel de logro. Es decisión de presentación y por eso
 * vive acá y no en el contrato, que sólo define la regla de cálculo.
 */
const COLORES_NIVEL: Record<NivelLogro, { nivelColor: string; nivelBg: string }> = {
  INICIO: { nivelColor: '#ef4444', nivelBg: '#fef2f2' },
  EN_PROCESO: { nivelColor: '#f59e0b', nivelBg: '#fffbeb' },
  LOGRO_ESPERADO: { nivelColor: '#10b981', nivelBg: '#ecfdf5' },
  LOGRO_DESTACADO: { nivelColor: '#6366f1', nivelBg: '#eef2ff' },
};

/** Un desempeño de la plantilla con el nivel que se le asignó, si lo tiene. */
export interface DesempenoCalificado {
  id: string;
  /** Nivel en escala romana. Cadena vacía cuando no se calificó. */
  romano: string;
}

export interface CalificacionPresentada {
  puntajeTotal: number;
  /**
   * Techo posible, sobre todos los desempeños de la plantilla y no sólo los
   * calificados: dejar uno sin calificar baja el porcentaje, no el techo.
   */
  puntajeMax: number;
  porcentaje: number;
  nivelLogro: NivelLogro;
  nivel: string;
  nivelColor: string;
  nivelBg: string;
}

export function resolverCalificacion(
  desempenos: readonly DesempenoCalificado[],
): CalificacionPresentada {
  const niveles = desempenos.map((d) => romanoANivel(d.romano)).filter((n) => n > 0);

  const resultado = calcularResultadoBaremo(niveles);

  return {
    ...resultado,
    puntajeMax: desempenos.length * PUNTAJE_MAXIMO_POR_DESEMPENO,
    nivel: NIVEL_LOGRO_LABELS[resultado.nivelLogro],
    ...COLORES_NIVEL[resultado.nivelLogro],
  };
}
