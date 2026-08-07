import type { NivelLogro } from '@sistema-monitoreo/shared-contracts';

/**
 * Estadísticas del panel de reportes.
 *
 * Fase 6 de PLAN_REMEDIACION.md. La tarjeta «Nivel Satisfactorio» se calculaba
 * leyendo el borrador de la ficha desde `localStorage` y, cuando no estaba,
 * caía a un relleno **inventado** con todos los niveles en III y IV —el
 * comentario del código lo llamaba «mock pre-filled state»—.
 *
 * El borrador vive en el navegador de quien llenó la ficha, de modo que para
 * cualquier otra persona ninguna ficha estaba en caché y todas caían al
 * relleno. Como ese relleno contaba como alto, la métrica tendía a 100 % y no
 * describía nada real. Sin fichas siquiera, devolvía un 85 escrito a mano.
 *
 * El dato correcto ya venía del backend en cada ficha completada: `nivelLogro`
 * y `promedio`, calculados con el baremo del contrato compartido.
 */

/**
 * Niveles que cuentan como satisfactorios.
 *
 * Según el baremo, un promedio superior a 2,5 sobre 4 corresponde a logro
 * esperado o destacado.
 */
export const NIVELES_SATISFACTORIOS: readonly NivelLogro[] = [
  'LOGRO_ESPERADO',
  'LOGRO_DESTACADO',
];

export interface ReporteMedible {
  tipo: 'DOCENTE' | 'DIRECTIVO';
  /**
   * Se declara como `string` porque así llega desde el backend en
   * `BackendReportVisit`. Sólo cuenta como satisfactorio si coincide con
   * `NIVELES_SATISFACTORIOS`; cualquier otro valor queda del lado bajo.
   */
  nivelLogro?: string;
  promedio?: number;
  institucionId?: string;
}

export interface EstadisticasDeReportes {
  total: number;
  docentes: number;
  directivos: number;
  /**
   * Porcentaje de fichas que alcanzaron el logro. `null` cuando ninguna trae
   * nivel: no hay nada que informar, y un número inventado es peor que un
   * hueco.
   */
  satisfactionPercent: number | null;
  /** Promedio de los puntajes, o `null` si ninguna ficha lo trae. */
  promedioGeneral: number | null;
  institucionesDistintas: number;
}

export function calcularEstadisticas(
  reportes: readonly ReporteMedible[],
): EstadisticasDeReportes {
  const conNivel = reportes.filter((r) => !!r.nivelLogro);
  const satisfactorios = conNivel.filter((r) =>
    (NIVELES_SATISFACTORIOS as readonly string[]).includes(r.nivelLogro as string),
  );

  const conPromedio = reportes.filter((r) => typeof r.promedio === 'number');
  const sumaPromedios = conPromedio.reduce((acc, r) => acc + (r.promedio ?? 0), 0);

  return {
    total: reportes.length,
    docentes: reportes.filter((r) => r.tipo === 'DOCENTE').length,
    directivos: reportes.filter((r) => r.tipo === 'DIRECTIVO').length,

    satisfactionPercent:
      conNivel.length > 0 ? Math.round((satisfactorios.length / conNivel.length) * 100) : null,

    promedioGeneral:
      conPromedio.length > 0 ? Number((sumaPromedios / conPromedio.length).toFixed(2)) : null,

    // Por identificador y no por nombre: antes se partía el nombre por « - »
    // para quitarle el código modular, y dos sedes homónimas se contaban como
    // una sola.
    institucionesDistintas: new Set(
      reportes.map((r) => r.institucionId).filter((id): id is string => !!id),
    ).size,
  };
}
