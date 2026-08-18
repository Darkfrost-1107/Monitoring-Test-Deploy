import type { QueryFichasCompletadas } from '../repositories/reporte.repository.js';

/**
 * Normaliza los filtros que llegan por la cadena de consulta.
 *
 * ── El defecto que corrige ──
 * `QueryFichasCompletadas` declara `anioAcademico?: number`, pero el controlador
 * recibe `@Query() query: any` y lo pasa tal cual al repositorio: en ejecución
 * llegaba la CADENA `'2026'`. El tipo prometía un número y nadie lo convertía.
 *
 * Contra una columna `Int`, Prisma no acepta esa cadena, de modo que el análisis
 * por criterio fallaba en cuanto se elegía un año y la pantalla se quedaba sin
 * desglose. Con «Todos los años» funcionaba porque no se enviaba el parámetro.
 *
 * Se normaliza acá, en el borde entre lo que entra por HTTP y lo que el
 * repositorio declara recibir, para que el tipo diga la verdad.
 */
export function normalizarFiltrosDeReporte(
  filtros: QueryFichasCompletadas,
): QueryFichasCompletadas {
  return {
    ...filtros,
    anioAcademico: aNumero(filtros.anioAcademico),
    page: aNumero(filtros.page),
    limit: aNumero(filtros.limit),
  };
}

/**
 * Un entero, o `undefined` si no lo hay.
 *
 * Devolver `undefined` ante un valor ilegible es deliberado: el filtro se
 * descarta y la consulta trae de más, que se nota. Convertirlo a `NaN` o a cero
 * la dejaría sin resultados sin que nada lo dijera, que es justo el modo de
 * fallar que se está corrigiendo.
 */
function aNumero(valor: unknown): number | undefined {
  if (valor === undefined || valor === null || valor === '') return undefined;

  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : undefined;
}
