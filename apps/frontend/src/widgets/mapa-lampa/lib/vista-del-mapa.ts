import type { IUgelDashboardDistrito, IUgelDashboardIeMapa } from '@sistema-monitoreo/shared-contracts';
import { normDistrito } from '@shared/lib/distrito';

/**
 * Lo que el mapa de Lampa decide antes de dibujar.
 *
 * Vivía dentro de `LampaMap`, entre la geometría de la provincia y la
 * maquetación de la leyenda: qué color lleva cada distrito según su cobertura,
 * qué instituciones quedan a la vista y qué filtros tiene sentido ofrecer.
 */

/** Valor con el que un filtro se declara inactivo. */
export const TODOS = 'Todos';

/** El Director UGEL supervisa cobertura por distrito. */
export const MODO_DISTRITAL = 'distrital';

/** Jefe de Gestión, Jefe de Área y Especialista trabajan el detalle por IE. */
export const MODO_INSTITUCIONAL = 'institucional';

export type ModoDelMapa = typeof MODO_DISTRITAL | typeof MODO_INSTITUCIONAL;

/** Color y etiqueta de cada estado del semáforo institucional. */
export const ESTADOS_DEL_MAPA = {
  critico: { key: 'critico', color: '#ef4444', label: 'Crítico' },
  enProceso: { key: 'enProceso', color: '#f59e0b', label: 'En proceso' },
  logroPrevisto: { key: 'logroPrevisto', color: '#22c55e', label: 'Logro previsto' },
  sinRegistro: { key: 'sinRegistro', color: '#94a3b8', label: 'Sin registro' },
} as const;

export type EstadoDelMapa = (typeof ESTADOS_DEL_MAPA)[keyof typeof ESTADOS_DEL_MAPA];

/**
 * Leyenda del coroplético distrital.
 *
 * El orden importa: `colorDeCobertura` lee sus umbrales de acá, así que lo que
 * se dibuja y lo que se anuncia no pueden separarse.
 */
export const COBERTURA_LEYENDA = [
  { desde: 75, color: '#22c55e', label: 'Cobertura ≥ 75%' },
  { desde: 40, color: '#f59e0b', label: 'Cobertura 40–74%' },
  { desde: 0, color: '#ef4444', label: 'Cobertura < 40%' },
  { desde: null, color: '#94a3b8', label: 'Sin registro' },
] as const;

export const NIVELES_DEL_FILTRO = [TODOS, 'Inicial', 'Primaria', 'Secundaria'] as const;

export const DISTRITOS_DE_LAMPA = [
  'CABANILLA',
  'CALAPUJA',
  'LAMPA',
  'NICASIO',
  'OCUVIRI',
  'PALCA',
  'PARATIA',
  'PUCARA',
  'SANTA LUCIA',
  'VILAVILA',
] as const;

/**
 * Obtiene la lista de nombres de distritos presentes en las instituciones o cobertura,
 * ordenados alfabéticamente.
 */
export function extraerDistritos(
  instituciones: readonly IUgelDashboardIeMapa[],
  cobertura?: readonly IUgelDashboardDistrito[],
): string[] {
  const mapa = new Map<string, string>();
  for (const c of cobertura ?? []) {
    if (c.distrito) {
      mapa.set(normDistrito(c.distrito), c.distrito);
    }
  }
  for (const ie of instituciones) {
    if (ie.distrito) {
      const key = normDistrito(ie.distrito);
      if (!mapa.has(key)) {
        mapa.set(key, ie.distrito);
      }
    }
  }
  if (mapa.size === 0) {
    return [...DISTRITOS_DE_LAMPA];
  }
  return Array.from(mapa.values()).sort((a, b) => a.localeCompare(b, 'es'));
}

/**
 * Color del distrito según su cobertura, o el de «sin registro» si no se midió.
 *
 * Un distrito sin datos y uno con 0% no son lo mismo: el primero no se midió,
 * el segundo se midió y dio cero. Por eso la ausencia se pasa como nula y no
 * como cero.
 */
export function colorDeCobertura(porcentaje: number | null | undefined): string {
  if (porcentaje == null) return COBERTURA_LEYENDA[3].color;

  const tramo = COBERTURA_LEYENDA.find((t) => t.desde != null && porcentaje >= t.desde);
  return (tramo ?? COBERTURA_LEYENDA[3]).color;
}

/** Color y etiqueta del marcador de una IE. */
export function estadoDelMarcador(estado: string): EstadoDelMapa {
  return (
    (ESTADOS_DEL_MAPA as Record<string, EstadoDelMapa | undefined>)[estado] ??
    ESTADOS_DEL_MAPA.sinRegistro
  );
}

/**
 * ¿El filtro por nivel aporta algo?
 *
 * El especialista recibe sólo II.EE. de su nivel: ofrecerle el filtro sería
 * ofrecerle botones que dejan el mapa vacío.
 */
export function hayVariosNiveles(instituciones: readonly IUgelDashboardIeMapa[]): boolean {
  return new Set(instituciones.map((ie) => ie.nivelEducativo)).size > 1;
}

interface FiltrosDelMapa {
  /** Nombre del distrito seleccionado, tal como se muestra. */
  distrito?: string | null;
  nivel?: string;
  estado?: string;
}

/** II.EE. que quedan a la vista con los filtros puestos. */
export function institucionesVisibles(
  instituciones: readonly IUgelDashboardIeMapa[],
  { distrito, nivel, estado }: FiltrosDelMapa,
): IUgelDashboardIeMapa[] {
  const distritoNorm = distrito ? normDistrito(distrito) : null;

  return instituciones.filter((ie) => {
    if (distritoNorm && normDistrito(ie.distrito) !== distritoNorm) return false;
    if (nivel && nivel !== TODOS && ie.nivelEducativo !== nivel) return false;
    if (estado && estado !== TODOS && ie.estado !== estado) return false;
    return true;
  });
}

/**
 * Huella de los datos de cobertura, para forzar el remonte de la capa GeoJSON.
 *
 * `onEachFeature` de react-leaflet corre una sola vez, al crear la capa: los
 * tooltips conservan los porcentajes con los que se montaron. El estilo sí se
 * actualiza —`updateGeoJSON` llama a `setStyle` cuando cambia la referencia de
 * `style`—, así que sin esto los colores dicen una cosa y el tooltip otra.
 */
export function firmaDeCobertura(distritos: readonly IUgelDashboardDistrito[]): string {
  return distritos
    .map((d) => `${d.distrito}:${d.porcentajeCobertura}:${d.monitoreadas}/${d.totalInstituciones}`)
    .join('|');
}
