import type { EstadoVisita } from '@sistema-monitoreo/shared-contracts';

/**
 * Traducción del estado de una visita a su presentación.
 *
 * Fase 5 de PLAN_REMEDIACION.md. Estaban sueltos en la cabecera de
 * `CalendarioSidebar`, entre la maquetación. Son puros y los comparten varios
 * componentes del panel, así que su lugar es acá.
 */

import {
  formatearFechaLarga,
  formatearFechaVisita,
  formatearHoraVisita,
} from '@/shared/lib/fecha-visita';

// Reexportadas para que las vistas del calendario tengan un solo punto de
// entrada de presentacion.
export { formatearFechaLarga, formatearFechaVisita, formatearHoraVisita };

/**
 * Paleta por estado, para el distintivo y para el punto de color.
 *
 * Tipada contra `EstadoVisita`: agregar un estado al contrato rompe acá la
 * compilación en lugar de caer en silencio a la paleta neutra. Ese fallo
 * silencioso —doce tablas y ningún aviso al omitir una— es el H-16 del plan.
 */
const PALETA_POR_ESTADO: Record<EstadoVisita, { badge: string; punto: string }> = {
  PROGRAMADO: { badge: 'bg-blue-100 text-blue-800 border-blue-200', punto: 'bg-blue-500' },
  EN_PROCESO: { badge: 'bg-rose-100 text-rose-800 border-rose-200', punto: 'bg-rose-500' },
  COMPLETADO: {
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    punto: 'bg-emerald-500',
  },
  REPROGRAMADO: { badge: 'bg-amber-100 text-amber-800 border-amber-200', punto: 'bg-amber-500' },
  CANCELADO: { badge: 'bg-slate-100 text-slate-700 border-slate-200', punto: 'bg-slate-400' },
  // Era el único que caía a la paleta neutra por no estar declarado. Se
  // explicita con los mismos valores: el aspecto no cambia, la omisión sí.
  ANULADO: { badge: 'bg-slate-100 text-slate-700', punto: 'bg-slate-400' },
};

/** Etiqueta de visita dentro de una celda del calendario, con estado de hover. */
const ETIQUETA_POR_ESTADO: Record<EstadoVisita, string> = {
  PROGRAMADO: 'bg-blue-50/70 text-blue-800 border-blue-200 hover:bg-blue-100/70',
  EN_PROCESO: 'bg-rose-50/70 text-rose-800 border-rose-200 hover:bg-rose-100/70',
  COMPLETADO: 'bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-100/70',
  REPROGRAMADO: 'bg-amber-50/70 text-amber-800 border-amber-200 hover:bg-amber-100/70',
  CANCELADO: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200',
  // Sin hover: una visita anulada no es pulsable.
  ANULADO: 'bg-slate-50 text-slate-700 border-slate-200',
};

export const claseEtiquetaVisita = (estado: EstadoVisita): string => ETIQUETA_POR_ESTADO[estado];

export const claseBadgeEstado = (estado: EstadoVisita): string => PALETA_POR_ESTADO[estado].badge;

export const clasePuntoEstado = (estado: EstadoVisita): string => PALETA_POR_ESTADO[estado].punto;

