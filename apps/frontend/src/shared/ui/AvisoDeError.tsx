import { AlertCircle } from 'lucide-react';

/**
 * Error de una acción, a la vista y descartable.
 *
 * Reemplaza a los `alert()` del navegador: el mensaje se queda hasta que el
 * usuario lo cierre, en vez de bloquear la pestaña y desaparecer.
 */
export const AvisoDeError = ({
  mensaje,
  onCerrar,
}: {
  mensaje: string | null;
  onCerrar: () => void;
}) => {
  if (!mensaje) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive text-sm font-medium mb-4"
    >
      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
      <span className="flex-1">{mensaje}</span>
      <button
        type="button"
        onClick={onCerrar}
        className="text-xs font-bold underline cursor-pointer shrink-0"
      >
        Cerrar
      </button>
    </div>
  );
};
