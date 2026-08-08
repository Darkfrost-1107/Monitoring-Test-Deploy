import { AlertCircle } from 'lucide-react';

/**
 * Aviso a la vista y descartable.
 *
 * Reemplaza a los `alert()` del navegador: el mensaje se queda hasta que el
 * usuario lo cierre, en vez de bloquear la pestaña y desaparecer.
 *
 * El tono distingue dos cosas que no son iguales: algo que falló —una baja que
 * el servidor rechazó— de algo que falta —una ficha que todavía no se puede
 * cerrar—. La segunda no es un error de nadie.
 */

const TONOS = {
  error: 'bg-destructive/10 border-destructive/20 text-destructive',
  advertencia: 'bg-amber-50 border-amber-200 text-amber-800',
} as const;

interface Props {
  mensaje: string | null;
  onCerrar: () => void;
  tono?: keyof typeof TONOS;
  className?: string;
}

export const AvisoDeError = ({ mensaje, onCerrar, tono = 'error', className = 'mb-4' }: Props) => {
  if (!mensaje) return null;

  return (
    <div
      role="alert"
      className={`flex items-start gap-2 border rounded-xl p-3.5 text-sm font-medium ${TONOS[tono]} ${className}`}
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
