/**
 * Los años que ofrece el filtro de reportes.
 *
 * ── Por qué no alcanza con los años de las fichas ──
 * La lista se deriva de las fichas cargadas, de modo que un año aparece recién
 * cuando existe la primera ficha suya. Eso funciona mientras el filtro admita
 * «Todos los años», pero el Análisis de Desempeño exige elegir uno —sus
 * criterios cambian de un año a otro y mezclarlos no dice nada— y arranca en el
 * año en curso. Sin esta garantía, el primer día de un año nuevo el filtro se
 * abriría en un año que no está entre sus opciones.
 *
 * Se ordena de más reciente a más antiguo: el año en curso es el que se consulta.
 */
export function aniosDeFiltro(aniosConFichas: readonly string[], anioActual: number): string[] {
  const anios = new Set(aniosConFichas);
  anios.add(String(anioActual));

  return [...anios].sort((a, b) => b.localeCompare(a));
}
