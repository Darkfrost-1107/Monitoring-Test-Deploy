import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { solicitudesPlantillaApi } from '@shared/api/solicitudes-plantilla.api';

/**
 * Abre el PDF de justificación de una solicitud.
 *
 * ── Por qué es un botón y no un enlace ──
 * El archivo no se sirve desde `uploads/`: ese estático no exige sesión, así
 * que un enlace directo dejaría el documento al alcance de cualquiera que
 * conociera la URL. Se pide por un endpoint que valida la sesión y acota por
 * institución, y eso obliga a traer el contenido y abrirlo desde el navegador.
 *
 * Un `href` relativo, además, ni siquiera funcionaba: el navegador lo resolvía
 * contra el frontend, el router no reconocía la ruta y mandaba al inicio.
 *
 * La URL temporal se libera después de abrirla. Cada `createObjectURL` retiene
 * el blob en memoria hasta que se revoca, y una bandeja con muchas solicitudes
 * las iría acumulando.
 *
 * Tiene un solo aspecto. Antes ofrecía dos variantes para dos pantallas, y esa
 * es una diferencia que nadie pidió: el mismo acto debe verse igual en toda la
 * aplicación, y un parámetro de estilo es una decisión que hay que volver a
 * tomar en cada uso.
 */

interface Props {
  solicitudId: string;
}

/** Margen para que la pestaña alcance a cargar el blob antes de revocarlo. */
const MS_ANTES_DE_LIBERAR = 60_000;

export function BotonJustificacion({ solicitudId }: Props) {
  const [abriendo, setAbriendo] = useState(false);

  const abrir = async () => {
    setAbriendo(true);
    try {
      const blob = await solicitudesPlantillaApi.justificacion(solicitudId);
      const url = URL.createObjectURL(blob);
      const abierta = window.open(url, '_blank', 'noopener,noreferrer');

      if (!abierta) {
        toast.error('El navegador bloqueó la ventana. Permití las ventanas emergentes.');
      }
      setTimeout(() => URL.revokeObjectURL(url), MS_ANTES_DE_LIBERAR);
    } catch {
      toast.error('No se pudo abrir la justificación.');
    } finally {
      setAbriendo(false);
    }
  };

  return (
    <button
      type="button"
      onClick={abrir}
      disabled={abriendo}
      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary shadow-xs transition-colors cursor-pointer hover:bg-primary hover:text-primary-foreground hover:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {abriendo ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileText className="h-4 w-4" />
      )}
      Ver la justificación
    </button>
  );
}
