import { CloudOff, RefreshCw, UploadCloud } from 'lucide-react';
import { useSyncOffline } from './use-sync-offline';

/**
 * Estado del trabajo sin conexión, en la barra superior.
 *
 * Le da al especialista la certeza de que nada se pierde: avisa cuando está sin
 * señal y cuántas fichas quedan por enviar, con un botón para forzar el envío
 * apenas vuelve la conexión. Cuando está en línea y sin pendientes, no muestra
 * nada: no hay ruido cuando no hay nada que informar.
 */
export const EstadoOffline = () => {
  const { enLinea, pendientes, sincronizando, sincronizarAhora } = useSyncOffline();

  if (enLinea && pendientes === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {!enLinea && (
        <span
          title="Trabajando sin conexión"
          className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700"
        >
          <CloudOff className="h-4 w-4" />
          <span className="hidden sm:inline">Sin conexión</span>
        </span>
      )}

      {pendientes > 0 && (
        <button
          type="button"
          onClick={() => void sincronizarAhora()}
          disabled={!enLinea || sincronizando}
          title={
            enLinea ? 'Enviar las fichas pendientes' : 'Se enviarán al recuperar la conexión'
          }
          className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-text-muted transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {sincronizando ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <UploadCloud className="h-4 w-4" />
          )}
          <span>
            {pendientes} <span className="hidden sm:inline">por enviar</span>
          </span>
        </button>
      )}
    </div>
  );
};
