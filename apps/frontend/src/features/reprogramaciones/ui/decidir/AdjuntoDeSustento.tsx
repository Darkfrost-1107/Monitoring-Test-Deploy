import { useState } from 'react';
import { Paperclip, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { requestBlob } from '@shared/config/api';
import { rutaDeDescarga } from '@shared/lib/archivo-guardado';
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
 *
 * ── Por qué dejó de ser un enlace ──
 * Con el manejador puesto seguía sin funcionar: la ruta guardada es relativa al
 * cajón, el navegador la resolvía contra el frontend, y ni nginx ni Vite la
 * reenvían al backend. El PDF abría la propia aplicación. Ahora se pide por el
 * endpoint que valida la sesión, lo que obliga a traer el contenido y abrirlo
 * desde el navegador.
 */

/** Margen para que la pestaña alcance a cargar el blob antes de revocarlo. */
const MS_ANTES_DE_LIBERAR = 60_000;

export const AdjuntoDeSustento = ({ adjunto }: { adjunto: AdjuntoDeSolicitud }) => {
  const [abriendo, setAbriendo] = useState(false);
  const ruta = rutaDeDescarga(adjunto.url);

  // Sin ruta reconocible no se ofrece la descarga: un botón que no puede
  // cumplir es peor que ninguno.
  if (!ruta) {
    return (
      <div className="pt-1.5">
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
          <Paperclip className="h-4 w-4 shrink-0" />
          {adjunto.nombre} — no disponible
        </span>
      </div>
    );
  }

  const abrir = async () => {
    setAbriendo(true);
    try {
      const blob = await requestBlob(ruta);
      const url = URL.createObjectURL(blob);
      if (!window.open(url, '_blank', 'noopener,noreferrer')) {
        toast.error('El navegador bloqueó la ventana. Permití las ventanas emergentes.');
      }
      setTimeout(() => URL.revokeObjectURL(url), MS_ANTES_DE_LIBERAR);
    } catch {
      toast.error('No se pudo abrir el documento de sustento.');
    } finally {
      setAbriendo(false);
    }
  };

  return (
    <div className="pt-1.5">
      <button
        type="button"
        onClick={abrir}
        disabled={abriendo}
        className="inline-flex items-center justify-between gap-3 bg-surface border border-slate-200 hover:border-primary/40 hover:bg-primary-light/30 rounded-lg py-1.5 px-3.5 transition-all text-xs font-bold text-slate-700 shadow-sm cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <Paperclip className="h-4 w-4 text-primary shrink-0" />
          <span className="text-slate-600 truncate max-w-xs">{adjunto.nombre}</span>
        </span>
        {abriendo ? (
          <Loader2 className="h-4.5 w-4.5 text-primary shrink-0 animate-spin" />
        ) : (
          <Download className="h-4.5 w-4.5 text-primary shrink-0" />
        )}
      </button>
    </div>
  );
};
