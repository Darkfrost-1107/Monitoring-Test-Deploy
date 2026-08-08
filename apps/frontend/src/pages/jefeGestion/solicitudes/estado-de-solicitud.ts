/**
 * Presentación del estado de una solicitud de visita.
 *
 * El contrato tipa `estado` como `EstadoSolicitudVisita | string`: el backend
 * puede devolver uno que este frontend todavía no conozca. Antes el mapa caía
 * en PENDIENTE ante cualquier desconocido, así que una solicitud ya cerrada por
 * un estado nuevo se rotulaba «Pendiente» y volvía a ofrecer atenderla. Un
 * estado que no se reconoce se muestra tal cual y no habilita ninguna acción.
 */

export interface EstiloDeEstado {
  accent: string;
  badge: string;
  dot: string;
  label: string;
  /** Sólo un estado reconocido como pendiente admite atender o rechazar. */
  resoluble: boolean;
}

const ESTILOS: Record<string, EstiloDeEstado> = {
  PENDIENTE: {
    accent: 'border-l-amber-400',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    label: 'Pendiente',
    resoluble: true,
  },
  ATENDIDA: {
    accent: 'border-l-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    label: 'Atendida',
    resoluble: false,
  },
  RECHAZADA: {
    accent: 'border-l-rose-400',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
    label: 'Rechazada',
    resoluble: false,
  },
};

/** Estado desconocido: se muestra el código crudo, en gris y sin acciones. */
const desconocido = (estado: string): EstiloDeEstado => ({
  accent: 'border-l-slate-300',
  badge: 'bg-slate-50 text-slate-600 border-slate-200',
  dot: 'bg-slate-400',
  label: estado,
  resoluble: false,
});

export const estiloDeEstado = (estado: string): EstiloDeEstado =>
  ESTILOS[estado] ?? desconocido(estado);
