/**
 * Paginación en el navegador.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Estaba escrita a mano dentro de
 * `PlanMonitoreoAnualPage`, repartida en tres `useMemo` y un cálculo suelto de
 * `totalPages`. Vive en `shared` porque los otros listados paginados del
 * sistema tienen su propia copia.
 *
 * ── El defecto que corrige ──
 * La página actual no se acotaba al total. Al eliminar el último elemento de la
 * última página, `currentPage` se quedaba apuntando a una página que ya no
 * existe y el listado aparecía vacío, con la paginación diciendo «Mostrando 7 a
 * 6 de 6 registros». La única forma de salir era cambiar un filtro.
 */

export interface Pagina<T> {
  /** Los elementos de la página, ya acotada al total disponible. */
  elementos: T[];
  /** Página efectiva. Puede no coincidir con la pedida si ésta se pasaba. */
  paginaActual: number;
  totalPaginas: number;
  /** Texto del pie: «Mostrando 1 a 6 de 14 registros». */
  rango: string;
}

/**
 * Corta la lista en la página pedida.
 *
 * Una página fuera de rango se acota en lugar de devolver una lista vacía: el
 * usuario que borra el último elemento de la última página debe ver la anterior,
 * no una pantalla en blanco.
 */
export function paginar<T>(
  elementos: readonly T[],
  paginaPedida: number,
  porPagina: number,
): Pagina<T> {
  const totalPaginas = Math.max(1, Math.ceil(elementos.length / porPagina));
  const paginaActual = Math.min(Math.max(1, Math.trunc(paginaPedida) || 1), totalPaginas);

  const desde = (paginaActual - 1) * porPagina;
  const recorte = elementos.slice(desde, desde + porPagina);

  return {
    elementos: recorte,
    paginaActual,
    totalPaginas,
    rango:
      elementos.length === 0
        ? 'Mostrando 0 registros'
        : `Mostrando ${desde + 1} a ${desde + recorte.length} de ${elementos.length} registros`,
  };
}

/**
 * Los números de página a dibujar, con elisiones.
 *
 * Antes se dibujaba un botón por página sin límite: con cien planes, la barra
 * de paginación eran diecisiete botones en fila.
 */
export function numerosDePagina(
  paginaActual: number,
  totalPaginas: number,
  maximo = 7,
): (number | 'elision')[] {
  if (totalPaginas <= maximo) {
    return Array.from({ length: totalPaginas }, (_, i) => i + 1);
  }

  // Se reservan cuatro lugares para la primera, la última y las dos elisiones.
  const alrededor = Math.max(1, Math.floor((maximo - 4) / 2));
  const desde = Math.max(2, paginaActual - alrededor);
  const hasta = Math.min(totalPaginas - 1, paginaActual + alrededor);

  const paginas: (number | 'elision')[] = [1];
  if (desde > 2) paginas.push('elision');
  for (let p = desde; p <= hasta; p++) paginas.push(p);
  if (hasta < totalPaginas - 1) paginas.push('elision');
  paginas.push(totalPaginas);

  return paginas;
}
