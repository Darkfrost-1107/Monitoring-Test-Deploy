import { CloudDownload, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { usePrepararOffline } from './use-preparar-offline';

/**
 * Descarga por adelantado los datos del especialista para trabajar sin conexión.
 *
 * Se muestra en la barra superior. Al pulsarlo, pre-carga los monitoreos, el
 * padrón y las plantillas en el cache que persiste en IndexedDB; luego, en la IE
 * sin señal, la app los encuentra ahí.
 */
export const BotonPrepararOffline = () => {
  const { estado, preparar } = usePrepararOffline();

  const alPulsar = async () => {
    // El especialista tiene que SABER que sus datos ya están (o que falló).
    const ok = await preparar();
    if (ok) toast.success('Listo para trabajar sin conexión.', { id: 'offline' });
    else toast.error('No se pudieron descargar los datos. Reintente con señal.', { id: 'offline' });
  };

  const preparando = estado === 'preparando';

  return (
    <button
      type="button"
      onClick={alPulsar}
      disabled={preparando}
      title="Descargar mis datos para trabajar sin conexión"
      className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-text-muted transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {preparando ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : estado === 'listo' ? (
        <Check className="h-4 w-4 text-emerald-600" />
      ) : (
        <CloudDownload className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">
        {preparando ? 'Descargando…' : estado === 'listo' ? 'Offline listo' : 'Preparar offline'}
      </span>
    </button>
  );
};
