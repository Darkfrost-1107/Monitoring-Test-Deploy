import { AlertCircle } from 'lucide-react';

interface LoginFailedModalProps {
  isOpen: boolean;
  attempts: number | null;
  /** Intentos restantes según el servidor. Nulo si no los informó. */
  intentosRestantes: number | null;
  onClose: () => void;
}

export const LoginFailedModal = ({
  isOpen,
  attempts,
  intentosRestantes,
  onClose,
}: LoginFailedModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="w-[340px] bg-[#990537] rounded-xl p-6 text-center shadow-2xl border border-white/10 transform transition-all">
        {/* Icono de Alerta */}
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-white" strokeWidth={2.5} />
        </div>

        {/* El número de intento lo informa el servidor; sin dato, se omite. */}
        <h3 className="text-xl font-bold text-white mb-2">
          {attempts === 1 ? 'Primer intento fallido' : 'Intento fallido'}
        </h3>

        {/*
          Los intentos restantes también los informa el servidor, que es quien
          conoce su umbral. Antes se restaban con una constante propia de esta
          pantalla, escrita también en el backend.
        */}
        {intentosRestantes !== null && (
          <p className="text-sm text-rose-100 mb-6 font-medium">
            Le queda {intentosRestantes} {intentosRestantes === 1 ? 'intento' : 'intentos'}
          </p>
        )}

        {/* Botón de Confirmación */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-[#660324] hover:bg-[#4d0219] text-white text-xs font-bold tracking-widest rounded-lg transition-colors border-none cursor-pointer uppercase outline-none"
        >
          OK
        </button>
      </div>
    </div>
  );
};
