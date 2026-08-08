import { Paperclip, Download } from 'lucide-react';
import type { AdjuntoDeSolicitud } from '../../lib/adjunto-de-solicitud';

/**
 * El documento de sustento de una solicitud.
 *
 * Era un `div` con `cursor-pointer`, estados `hover:` y un ícono de descarga
 * que crecía al pasar por encima —y sin ningún manejador—: se veía descargable
 * y al pulsarlo no pasaba nada. La URL existía en `archivo_sustento_url`, pero
 * el mapeo la descartaba y guardaba sólo el nombre.
 *
 * Debajo del nombre decía «(1.2 MB)», escrito a mano: el mismo tamaño para
 * todos los archivos, incluido el que pesa otra cosa.
 */

export const AdjuntoDeSustento = ({ adjunto }: { adjunto: AdjuntoDeSolicitud }) => (
  <div className="pt-1.5">
    <a
      href={adjunto.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-between gap-3 bg-surface border border-slate-200 hover:border-primary/40 hover:bg-primary-light/30 rounded-lg py-1.5 px-3.5 transition-all text-xs font-bold text-slate-700 shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="flex items-center gap-1.5 min-w-0">
        <Paperclip className="h-4 w-4 text-primary shrink-0" />
        <span className="text-slate-600 truncate max-w-xs">{adjunto.nombre}</span>
      </span>
      <Download className="h-4.5 w-4.5 text-primary shrink-0" />
    </a>
  </div>
);
