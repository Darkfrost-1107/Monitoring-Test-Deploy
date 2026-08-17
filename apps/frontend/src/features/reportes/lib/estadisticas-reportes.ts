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
  /**
   * Instrumento con el que se llenó la ficha.
   *
   * Se llamaba `tipo` y se tipaba con `TipoMonitoreo`, que es el tipo de la
   * VISITA. Estas estadísticas segmentan por instrumento —de ahí
   * `porInstrumento`— porque cada escala mide algo distinto.
   */
  instrumento: import('@sistema-monitoreo/shared-contracts').TipoPlantilla;
  /**
   * La visita de la que salió esta ficha.
   *
   * Es lo que permite distinguir «cuántas fichas se llenaron» de «cuántos
   * monitoreos se hicieron»: una visita docente puede llevar la ficha regular y
   * la EIB. Opcional porque el camino de respaldo del panel arma las filas desde
   * los cronogramas, donde cada fila ya es una visita.
   */
  cronogramaId?: string;
  /**
   * Se declara como `string` porque así llega desde el backend en
   * `BackendReportVisit`. Sólo cuenta como satisfactorio si coincide con
   * `NIVELES_SATISFACTORIOS`; cualquier otro valor queda del lado bajo.
   */
  nivelLogro?: string;
  promedio?: number;
  institucionId?: string;
}

/** Resultado de un instrumento, medido sólo contra su propia escala. */
export interface EstadisticaPorInstrumento {
  tipo: import('@sistema-monitoreo/shared-contracts').TipoPlantilla;
  fichas: number;
  satisfactionPercent: number | null;
  promedioGeneral: number | null;
}

export interface EstadisticasDeReportes {
  /** Fichas llenadas: una fila por instrumento aplicado. */
  fichas: number;
  /**
   * Monitoreos ejecutados: cronogramas distintos.
   *
   * Hasta que se sumó la Ficha Docente EIB esto era igual a `fichas`, y un solo
   * número servía para las dos preguntas. Hoy una visita con dos instrumentos
   * sigue siendo UN monitoreo ejecutado.
   */
  visitasMonitoreadas: number;
  /** Fichas docentes, regulares y EIB. */
  fichasDocentes: number;
  fichasDirectivas: number;
  /**
   * Porcentaje de fichas que alcanzaron el logro. `null` cuando ninguna trae
   * nivel —no hay nada que informar, y un número inventado es peor que un
   * hueco— y también cuando se mezclan instrumentos: ver `porInstrumento`.
   */
  satisfactionPercent: number | null;
  /**
   * Promedio de los puntajes. `null` si ninguna ficha lo trae, y `null` si hay
   * más de un instrumento en el conjunto.
   */
  promedioGeneral: number | null;
  /** Un resultado por instrumento presente, en orden alfabético de tipo. */
  porInstrumento: EstadisticaPorInstrumento[];
  institucionesDistintas: number;
}

/** Porcentaje de logro y promedio de un conjunto de fichas de la MISMA escala. */
function medir(reportes: readonly ReporteMedible[]): {
  satisfactionPercent: number | null;
  promedioGeneral: number | null;
} {
  const conNivel = reportes.filter((r) => !!r.nivelLogro);
  const satisfactorios = conNivel.filter((r) =>
    (NIVELES_SATISFACTORIOS as readonly string[]).includes(r.nivelLogro as string),
  );

  const conPromedio = reportes.filter((r) => typeof r.promedio === 'number');
  const sumaPromedios = conPromedio.reduce((acc, r) => acc + (r.promedio ?? 0), 0);

  return {
    satisfactionPercent:
      conNivel.length > 0 ? Math.round((satisfactorios.length / conNivel.length) * 100) : null,
    promedioGeneral:
      conPromedio.length > 0 ? Number((sumaPromedios / conPromedio.length).toFixed(2)) : null,
  };
}

export function calcularEstadisticas(
  reportes: readonly ReporteMedible[],
): EstadisticasDeReportes {
  /**
   * Un monitoreo ejecutado es un cronograma, no una ficha.
   *
   * Una ficha sin `cronogramaId` cuenta como su propia visita: no hay con qué
   * agruparla, y descartarla informaría menos monitoreos de los que hubo.
   */
  const visitas = new Set<string>();
  for (const [indice, reporte] of reportes.entries()) {
    visitas.add(reporte.cronogramaId ?? `sin-cronograma-${indice}`);
  }

  /**
   * Cada instrumento se mide contra su propia escala y nunca contra la de otro.
   * La rúbrica docente llega a 4, la lista de cotejo EIB a 3 y la directiva se
   * resuelve por porcentaje: un promedio entre ellas no significa nada.
   */
  const tipos = [...new Set(reportes.map((r) => r.instrumento))].sort();
  const porInstrumento: EstadisticaPorInstrumento[] = tipos.map((tipo) => {
    const delTipo = reportes.filter((r) => r.instrumento === tipo);
    return { tipo, fichas: delTipo.length, ...medir(delTipo) };
  });

  // Con un solo instrumento el total es medible; con varios, el desglose es la
  // única lectura honesta.
  const global = tipos.length === 1 ? medir(reportes) : null;

  return {
    fichas: reportes.length,
    visitasMonitoreadas: visitas.size,
    fichasDocentes: reportes.filter(
      (r) => r.instrumento === 'DOCENTE' || r.instrumento === 'DOCENTE_EIB',
    ).length,
    fichasDirectivas: reportes.filter((r) => r.instrumento === 'DIRECTIVO').length,

    satisfactionPercent: global?.satisfactionPercent ?? null,
    promedioGeneral: global?.promedioGeneral ?? null,
    porInstrumento,

    // Por identificador y no por nombre: antes se partía el nombre por « - »
    // para quitarle el código modular, y dos sedes homónimas se contaban como
    // una sola.
    institucionesDistintas: new Set(
      reportes.map((r) => r.institucionId).filter((id): id is string => !!id),
    ).size,
  };
}
