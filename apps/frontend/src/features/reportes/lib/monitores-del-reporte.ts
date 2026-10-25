export type OrigenMonitor = 'INTERNO' | 'EXTERNO';

export interface MonitorDelReporte {
  id: string;
  nombre: string;
  cargo?: string;
  origen?: OrigenMonitor;
}

export interface FichaConMonitor {
  monitorId?: string;
  especialista: string;
  especialistaCargo?: string;
}

/**
 * Determina si un monitor es parte del equipo interno de la I.E. (Director,
 * Subdirector, Coordinador, Jefe de Taller) o un monitor externo de la UGEL
 * (Especialista, Jefatura, etc.).
 */
export function origenDelMonitor(cargo?: string): OrigenMonitor | undefined {
  if (!cargo || !cargo.trim()) return undefined;
  const c = cargo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (
    c.includes('director') ||
    c.includes('subdirector') ||
    c.includes('coordinador') ||
    c.includes('taller')
  ) {
    return 'INTERNO';
  }
  return 'EXTERNO';
}

/**
 * Abreviatura compacta del cargo para mantener los rótulos del select sin
 * ensanchamiento horizontal innecesario.
 */
export function cargoAbreviado(cargo?: string): string {
  if (!cargo || !cargo.trim()) return '';
  const c = cargo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (c.includes('subdirector')) return '(Subdir.)';
  if (c.includes('director')) return '(Dir.)';
  if (c.includes('coordinador')) return '(Coord.)';
  if (c.includes('taller')) return '(Taller)';
  if (c.includes('gestion')) return '(Jefe Gestión)';
  if (c.includes('area')) return '(Jefe Área)';
  if (c.includes('especialista')) return '(Especialista)';
  return `(${cargo.trim()})`;
}

/**
 * Rótulo para la opción del selector: "Nombre (Abrev.)" si se conoce el cargo.
 */
export function rotuloDeMonitor(monitor: { nombre: string; cargo?: string }): string {
  const abrev = cargoAbreviado(monitor.cargo);
  return abrev ? `${monitor.nombre} ${abrev}` : monitor.nombre;
}

/**
 * Nombre de grupo para optgroup en el selector: "INTERNO (I.E.)" o "EXTERNO (UGEL)".
 */
export function grupoDeMonitor(monitor: { origen?: OrigenMonitor; cargo?: string }): string | undefined {
  const origen = monitor.origen ?? (monitor.cargo ? origenDelMonitor(monitor.cargo) : undefined);
  if (origen === 'INTERNO') return 'INTERNO (I.E.)';
  if (origen === 'EXTERNO') return 'EXTERNO (UGEL)';
  return undefined;
}

/**
 * Quién realizó los monitoreos de estas fichas, para el filtro «Monitor».
 *
 * Se identifica por el id y no por el nombre: dos personas pueden llamarse igual, y
 * el filtro del backend compara ids. Una ficha sin monitor identificado no aporta
 * una opción, porque elegirla no filtraría a nadie. `cuenta` permite ofrecer solo
 * los monitores de las fichas que siguen a la vista con el resto de los filtros.
 *
 * Se ordenan priorizando monitores internos de la I.E. primero, luego externos de la UGEL,
 * y alfabéticamente por nombre dentro de cada grupo.
 */
export function monitoresDelReporte<T extends FichaConMonitor>(
  fichas: readonly T[],
  cuenta: (ficha: T) => boolean = () => true,
): MonitorDelReporte[] {
  const porId = new Map<string, { nombre: string; cargo?: string }>();

  for (const ficha of fichas) {
    if (!ficha.monitorId || !cuenta(ficha)) continue;
    const previo = porId.get(ficha.monitorId);
    if (!previo) {
      porId.set(ficha.monitorId, {
        nombre: ficha.especialista,
        cargo: ficha.especialistaCargo,
      });
    } else if (!previo.cargo && ficha.especialistaCargo) {
      previo.cargo = ficha.especialistaCargo;
    }
  }

  return [...porId.entries()]
    .map(([id, { nombre, cargo }]) => ({
      id,
      nombre,
      cargo,
      origen: origenDelMonitor(cargo),
    }))
    .sort((a, b) => {
      if (a.origen && b.origen && a.origen !== b.origen) {
        return a.origen === 'INTERNO' ? -1 : 1;
      }
      if (a.origen && !b.origen) return -1;
      if (!a.origen && b.origen) return 1;
      return a.nombre.localeCompare(b.nombre);
    });
}
