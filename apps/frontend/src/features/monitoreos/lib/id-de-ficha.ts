type Buscar = (visitaId: string, plantillaId: string) => Promise<{ id: string } | null>;

/**
 * El id de la ficha, venga como venga la fila.
 *
 * Desde el listado de Reportes la fila ya es una ficha (trae `nivelLogro`, aunque
 * sea nulo en un instrumento informativo) y su id es el de la ficha. Desde el
 * Calendario es una visita, y hay que buscar su ficha por visita y plantilla.
 * Es la misma distinción que usan la ficha imprimible y el listado.
 */
export async function idDeFicha(
  fila: { id: string },
  plantillaId: string,
  buscar: Buscar,
): Promise<string | null> {
  if ('nivelLogro' in fila) return fila.id;
  return (await buscar(fila.id, plantillaId))?.id ?? null;
}
