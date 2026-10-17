export interface MonitorDelReporte {
  id: string;
  nombre: string;
}

interface FichaConMonitor {
  monitorId?: string;
  especialista: string;
}

/**
 * Quién realizó los monitoreos de estas fichas, para el filtro «Monitor».
 *
 * Se identifica por el id y no por el nombre: dos personas pueden llamarse igual, y
 * el filtro del backend compara ids. Una ficha sin monitor identificado no aporta
 * una opción, porque elegirla no filtraría a nadie. `cuenta` permite ofrecer solo
 * los monitores de las fichas que siguen a la vista con el resto de los filtros.
 */
export function monitoresDelReporte<T extends FichaConMonitor>(
  fichas: readonly T[],
  cuenta: (ficha: T) => boolean = () => true,
): MonitorDelReporte[] {
  const porId = new Map<string, string>();

  for (const ficha of fichas) {
    if (!ficha.monitorId || !cuenta(ficha)) continue;
    porId.set(ficha.monitorId, ficha.especialista);
  }

  return [...porId.entries()]
    .map(([id, nombre]) => ({ id, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}
