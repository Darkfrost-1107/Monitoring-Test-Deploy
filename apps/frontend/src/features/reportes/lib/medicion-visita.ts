import { nivelLogroARomano } from './nivel-logro';

/**
 * Cómo se presenta la calificación de una visita en el listado de reportes.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Esto estaba escrito dos veces en
 * `ReportesGrid` —cuadrícula y tabla— y en ambas se apoyaba en `getFichaState`,
 * que devolvía una evaluación inventada cuando la ficha no estaba en el
 * navegador: treinta y cinco aspectos marcados y todos los niveles en III y IV.
 *
 * Con eso, una visita sin calificar mostraba «33 / 35 aspectos», una barra al
 * 80 % y «Nivel III». Ahora una visita sin calificar se muestra como lo que es.
 */

/** Puntaje máximo del baremo. */
const PUNTAJE_MAXIMO = 4;

export interface VisitaMedible {
  nivelLogro?: string;
  promedio?: number;
  puntajeTotal?: number;
}

export interface MedicionDeVisita {
  /** ¿La visita tiene calificación? */
  calificada: boolean;
  /** Texto de la calificación, listo para mostrar. */
  calificacion: string;
  /** Versión corta, para la tabla. */
  calificacionCorta: string;
  /** Avance de la barra, de 0 a 100. */
  porcentaje: number;
  /** Numeral romano del nivel, o `null` si no hay calificación. */
  nivelRomano: string | null;
}

/** Lo que se muestra cuando no hay dato. */
export const SIN_DATO = '—';

export function medirVisita(visita: VisitaMedible): MedicionDeVisita {
  const nivelRomano = nivelLogroARomano(visita.nivelLogro);
  const promedio = visita.promedio;

  if (nivelRomano === null || typeof promedio !== 'number') {
    return {
      calificada: false,
      calificacion: SIN_DATO,
      calificacionCorta: SIN_DATO,
      porcentaje: 0,
      nivelRomano: null,
    };
  }

  return {
    calificada: true,
    calificacion: `Promedio ${promedio.toFixed(2)} (${visita.puntajeTotal ?? 0} pts)`,
    calificacionCorta: `Prom. ${promedio.toFixed(2)}`,
    porcentaje: Math.min(100, Math.max(0, (promedio / PUNTAJE_MAXIMO) * 100)),
    nivelRomano,
  };
}
