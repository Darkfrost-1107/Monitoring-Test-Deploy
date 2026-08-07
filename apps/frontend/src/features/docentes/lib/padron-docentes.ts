/**
 * El filtro del padrón de docentes y el estado de su designación.
 *
 * Vivía dentro de `docentes-table.tsx`, sin una sola prueba pese a decidir qué
 * filas aparecen en las seis pantallas que reutilizan esa tabla —directores,
 * coordinadores pedagógicos, jefes de taller y docentes de aula—.
 *
 * ── Cómo se sabe qué cargo tiene alguien ──
 * El historial `cargosList` es la fuente: una designación con `fechaFin` nula
 * está vigente. El campo `cargo` del registro es el respaldo para los
 * registros que no traen historial.
 */

/** Cargos desde los que se levanta una ficha de monitoreo. */
export const CARGOS_DE_MONITOREO = [
  'Director',
  'Coordinador Pedagógico',
  'Jefe de Taller',
] as const;

export const DOCENTE_DE_AULA = 'Docente de Aula';

export type CargoDelPadron = (typeof CARGOS_DE_MONITOREO)[number] | typeof DOCENTE_DE_AULA;

export interface DesignacionDeCargo {
  id: string;
  nombre: string;
  /** Nula mientras la designación siga vigente. */
  fechaFin: string | null;
  esPrincipal?: boolean;
}

export interface DocenteDelPadron {
  nombres: string;
  apellidos: string;
  dni: string;
  cargo: string;
  condicion?: string | null;
  nivelEducativo?: string | null;
  secciones?: { id?: string; grado: string; seccion: string }[];
  cargosList?: DesignacionDeCargo[];
}

/** ¿Desde este cargo se levantan fichas? */
export const esCargoDeMonitoreo = (cargo: string): boolean =>
  (CARGOS_DE_MONITOREO as readonly string[]).includes(cargo);

/**
 * La designación del cargo indicado, preferentemente la vigente.
 *
 * Si sólo hay cerradas se devuelve una igual: la fila tiene que poder mostrarse
 * como «Cargo Finalizado» en vez de desaparecer del listado.
 */
export function cargoVigente(
  docente: DocenteDelPadron,
  cargo: string,
): DesignacionDeCargo | null {
  const designaciones = docente.cargosList ?? [];

  return (
    designaciones.find((c) => c.nombre === cargo && c.fechaFin === null) ??
    designaciones.find((c) => c.nombre === cargo) ??
    null
  );
}

/** ¿La designación del cargo está cerrada? */
export const cargoFinalizado = (docente: DocenteDelPadron, cargo: string): boolean =>
  cargoVigente(docente, cargo)?.fechaFin != null;

/**
 * ¿El docente ocupa hoy el cargo indicado?
 *
 * «Docente de aula» se define por descarte: lo es quien no tiene ninguna
 * designación de monitoreo abierta.
 */
export function tieneElCargo(docente: DocenteDelPadron, cargo: string): boolean {
  const designaciones = docente.cargosList;

  if (cargo === DOCENTE_DE_AULA) {
    if (!designaciones) return docente.cargo === DOCENTE_DE_AULA;
    return !designaciones.some((c) => c.fechaFin === null && esCargoDeMonitoreo(c.nombre));
  }

  if (!designaciones) return docente.cargo === cargo;
  return designaciones.some((c) => c.nombre === cargo && c.fechaFin === null);
}

/**
 * El filtro del listado, tal como lo consume `useEntityTable`.
 *
 * Los criterios viven en la URL para que un listado filtrado se pueda enlazar y
 * sobreviva a un refresco.
 */
export const filtroDelPadron =
  (cargo: string) =>
  (docente: DocenteDelPadron, params: URLSearchParams): boolean => {
    if (!tieneElCargo(docente, cargo)) return false;

    const busqueda = (params.get('search') || '').toLowerCase();
    const condicion = params.get('condicion') || '';
    const seccion = params.get('seccion') || '';
    const nivel = params.get('nivelEducativo') || '';

    if (
      busqueda &&
      !docente.nombres.toLowerCase().includes(busqueda) &&
      !docente.apellidos.toLowerCase().includes(busqueda) &&
      !docente.dni.includes(busqueda)
    ) {
      return false;
    }

    if (condicion && docente.condicion !== condicion) return false;

    if (seccion && !(docente.secciones ?? []).some((s) => `${s.grado} ${s.seccion}` === seccion)) {
      return false;
    }

    if (nivel && docente.nivelEducativo?.toUpperCase() !== nivel.toUpperCase()) return false;

    return true;
  };
