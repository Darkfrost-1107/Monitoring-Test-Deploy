import type { IAnalisisDesempenoCriterio } from '@sistema-monitoreo/shared-contracts';
import type { BackendReportVisit } from '@/widgets/reportes';
import type { Plantilla } from '@/entities/model-plantillas';

export type NivelLogroClave = 'I' | 'II' | 'III' | 'IV';

export interface ConteoNivel {
  nivel: NivelLogroClave;
  nombre: string;
  descripcion: string;
  conteo: number;
  porcentaje: number;
  color: string;
  colorBg: string;
  colorBorder: string;
}

export interface AnalisisDesempenoCompleto {
  totalEvaluaciones: number;
  promedioGeneral: number;
  criterioMayorDominio: IAnalisisDesempenoCriterio | null;
  criterioMayorRefuerzo: IAnalisisDesempenoCriterio | null;
  criterios: IAnalisisDesempenoCriterio[];
  /**
   * El backend no devolvió el desglose por criterio.
   *
   * `criterios` trae la estructura del instrumento con la distribución en cero:
   * los nombres de los criterios se conocen, cuántas fichas cayeron en cada
   * nivel de cada criterio no. Quien muestre esto tiene que decirlo, no
   * dibujar un gráfico de ceros como si fuera un resultado.
   */
  sinDesglosePorCriterio: boolean;
}

export const DESEMPENOS_DOCENTE_DEFAULT: Array<{
  orden: number;
  nombre: string;
  descripcionCorta: string;
}> = [
  {
    orden: 1,
    nombre: 'Involucra activamente a los estudiantes en el proceso de aprendizaje',
    descripcionCorta: 'Promueve el interés y la participación activa durante la sesión.',
  },
  {
    orden: 2,
    nombre: 'Maximiza el tiempo dedicado al aprendizaje',
    descripcionCorta: 'Gestiona la sesión evitando tiempos muertos y transiciones fluidas.',
  },
  {
    orden: 3,
    nombre: 'Fomenta el razonamiento y pensamiento crítico',
    descripcionCorta: 'Propone retos cognitivos que exigen análisis y argumentación.',
  },
];

export const DESEMPENOS_EIB_DEFAULT: Array<{
  orden: number;
  nombre: string;
  descripcionCorta: string;
}> = [
  {
    orden: 1,
    nombre: 'Condiciones básicas para el aprendizaje EIB',
    descripcionCorta: 'Ambiente físico, orden, ventilación y aula letrada en lengua originaria y castellano.',
  },
  {
    orden: 2,
    nombre: 'Interacciones pedagógicas y diálogo de saberes',
    descripcionCorta: 'Propósito claro, atención a la diversidad y contraste de saberes locales con la ciencia.',
  },
  {
    orden: 3,
    nombre: 'Desarrollo del bilingüismo y convivencia intercultural',
    descripcionCorta: 'Uso pertinente de lengua materna y segunda lengua, pensamiento crítico y retroalimentación.',
  },
  {
    orden: 4,
    nombre: 'Planificación curricular con enfoque EIB',
    descripcionCorta: 'Caracterización sociocultural y lingüística, situaciones significativas y metodología activa.',
  },
];

export const DESEMPENOS_DIRECTIVO_DEFAULT: Array<{
  orden: number;
  nombre: string;
  descripcionCorta: string;
}> = [
  {
    orden: 1,
    nombre: 'Conducción de la gestión escolar y liderazgo pedagógico',
    descripcionCorta: 'Planificación institucional estratégica, metas de aprendizaje y seguimiento.',
  },
  {
    orden: 2,
    nombre: 'Gestión de las condiciones operativas y convivencia escolar',
    descripcionCorta: 'Mantenimiento de infraestructura, recursos educativos y clima institucional.',
  },
  {
    orden: 3,
    nombre: 'Acompañamiento y monitoreo a la práctica pedagógica',
    descripcionCorta: 'Plan de visitas, observación en aula y retroalimentación docente formativa.',
  },
];

/**
 * El nivel de logro que declara una ficha, o nulo si no lo declara.
 *
 * Cerraba con `return 'II'`: una ficha sin nivel ni promedio salía «En proceso»
 * sin que nada lo dijera. Es el mismo vicio que el de la estimación por
 * criterio — completar un hueco con un valor plausible—, así que ahora la falta
 * de dato se devuelve como tal y la decide quien llame.
 */
export const normalizarNivelLogro = (
  nivelRaw?: string,
  promedio?: number,
): NivelLogroClave | null => {
  if (nivelRaw) {
    const raw = nivelRaw.toUpperCase().trim();
    if (raw.endsWith('IV') || raw.includes('DESTACADO')) return 'IV';
    if (raw.endsWith('III') || raw.includes('SATISFACTORIO') || raw.includes('ESPERADO')) return 'III';
    if (raw.endsWith('II') || raw.includes('PROCESO')) return 'II';
    if (raw.endsWith('I') || raw.includes('INICIO') || raw.includes('DEFICIENTE')) return 'I';
  }

  if (typeof promedio === 'number' && !Number.isNaN(promedio)) {
    if (promedio < 2.0) return 'I';
    if (promedio < 3.0) return 'II';
    if (promedio < 3.6) return 'III';
    return 'IV';
  }

  return null;
};

/**
 * Calcula el análisis estadístico consolidado por Criterio / Desempeño a evaluar.
 */
export const calcularAnalisisPorCriterios = (
  criteriosData: IAnalisisDesempenoCriterio[] = [],
  visitas: BackendReportVisit[] = [],
  plantillas: Plantilla[] = [],
  tipoFiltro: string = 'Todos',
): AnalisisDesempenoCompleto => {
  // Si el backend ya devolvió los criterios consolidados con respuestas, usarlos directamente
  if (criteriosData && criteriosData.length > 0) {
    const totalEvaluadosGlobal = Math.max(...criteriosData.map((c) => c.totalEvaluados), 0);
    const sumaPromedios = criteriosData.reduce((acc, c) => acc + c.promedio, 0);
    const promedioGeneral =
      criteriosData.length > 0 ? Number((sumaPromedios / criteriosData.length).toFixed(2)) : 0;

    const ordenadosPorDominio = [...criteriosData].sort((a, b) => b.tasaLogro - a.tasaLogro);
    const ordenadosPorRefuerzo = [...criteriosData].sort((a, b) => b.tasaRefuerzo - a.tasaRefuerzo);

    return {
      totalEvaluaciones: totalEvaluadosGlobal,
      promedioGeneral,
      criterioMayorDominio: ordenadosPorDominio[0] ?? null,
      criterioMayorRefuerzo: ordenadosPorRefuerzo[0] ?? null,
      criterios: criteriosData,
      sinDesglosePorCriterio: false,
    };
  }

  const esDirectivo = tipoFiltro === 'DIRECTIVO';
  const esEib = tipoFiltro === 'DOCENTE_EIB' || tipoFiltro?.toUpperCase().includes('EIB');

  // Fallback / Estimación a partir de los desempeños de la plantilla y las fichas de visitas
  const plantillaObjetivo = plantillas.find((p) => {
    const t = (p.tipoMonitoreo || '').toUpperCase();
    if (esDirectivo) return t.includes('DIRECTIVO');
    if (esEib) return t.includes('EIB');
    return t === 'DOCENTE' || (t.includes('DOCENTE') && !t.includes('EIB'));
  });

  const listaDesempenos =
    plantillaObjetivo && Array.isArray(plantillaObjetivo.desempenos) && plantillaObjetivo.desempenos.length > 0
      ? plantillaObjetivo.desempenos.map((d, index) => ({
          orden: index + 1,
          nombre: d.nombre,
          descripcionCorta: d.descripcionCorta || '',
          id: d.id,
        }))
      : esDirectivo
      ? DESEMPENOS_DIRECTIVO_DEFAULT.map((d) => ({
          orden: d.orden,
          nombre: d.nombre,
          descripcionCorta: d.descripcionCorta,
          id: `dir-${d.orden}`,
        }))
      : esEib
      ? DESEMPENOS_EIB_DEFAULT.map((d) => ({
          orden: d.orden,
          nombre: d.nombre,
          descripcionCorta: d.descripcionCorta,
          id: `eib-${d.orden}`,
        }))
      : DESEMPENOS_DOCENTE_DEFAULT.map((d) => ({
          orden: d.orden,
          nombre: d.nombre,
          descripcionCorta: d.descripcionCorta,
          id: `doc-${d.orden}`,
        }));

  const visitasFiltradas = visitas.filter((v) => {
    const t = (v.tipo || 'DOCENTE').toUpperCase();
    if (esDirectivo) return t === 'DIRECTIVO';
    if (esEib) return t === 'DOCENTE_EIB' || t.includes('EIB');
    if (tipoFiltro === 'DOCENTE') return t === 'DOCENTE' && !t.includes('EIB');
    return true;
  });
  const totalVisitas = visitasFiltradas.length;

  /**
   * ── Por qué acá no hay distribución ──
   * De cada ficha este camino conoce sólo su nivel de logro GLOBAL. El desglose
   * por criterio —cuántas fichas cayeron en el nivel II del criterio 3— vive en
   * `fichaRespuestaDesempeno`, y eso lo consulta el backend. Sin esa respuesta
   * el dato no existe, y no hay cálculo que lo produzca.
   *
   * Antes se repartía el nivel global de cada ficha entre todos los criterios y
   * después se lo alteraba según la paridad del índice del arreglo:
   *
   *     if (index === 0 && nivelAsignado === 2 && i % 2 === 0) nivelAsignado = 3;
   *     if (index === 2 && nivelAsignado === 3 && i % 3 === 0) nivelAsignado = 2;
   *
   * El gráfico salía distribuido y creíble sobre números inventados, en el
   * análisis estadístico oficial de la UGEL. Y se disparaba justo cuando más
   * importaba: un instrumento recién agregado, todavía sin fichas finalizadas,
   * no caía en el estado vacío de la página —que mira el total sin filtrar— sino
   * acá.
   *
   * Se informa la estructura de criterios, que sí se conoce, con la distribución
   * en cero y `sinDesglosePorCriterio` en alto para que la pantalla lo diga.
   */
  const criterios: IAnalisisDesempenoCriterio[] = listaDesempenos.map((des) => ({
    desempenoId: des.id,
    nombre: des.nombre,
    orden: des.orden,
    descripcionCorta: des.descripcionCorta,
    totalEvaluados: totalVisitas,
    conteoNivelI: 0,
    conteoNivelII: 0,
    conteoNivelIII: 0,
    conteoNivelIV: 0,
    porcentajeNivelI: 0,
    porcentajeNivelII: 0,
    porcentajeNivelIII: 0,
    porcentajeNivelIV: 0,
    promedio: 0,
    tasaLogro: 0,
    tasaRefuerzo: 0,
  }));

  return {
    totalEvaluaciones: totalVisitas,
    promedioGeneral: 0,
    // Sin distribución no hay criterio que destaque ni que necesite refuerzo:
    // ordenar ceros habría devuelto siempre el primero del arreglo.
    criterioMayorDominio: null,
    criterioMayorRefuerzo: null,
    criterios,
    sinDesglosePorCriterio: true,
  };
};
