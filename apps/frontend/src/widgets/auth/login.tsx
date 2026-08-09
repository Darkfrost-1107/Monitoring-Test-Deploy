import { AlertCircle } from 'lucide-react';
import { BaseLoginForm } from '@features/login/ui/formLoginBase';
import { useLoginService } from '@features/login/login-service';
import { useNavigate } from 'react-router-dom';
import { LoginFailedModal } from './loginFailedModal';

const LOGO_SRC = '/logo-ugel.png';

// Formatea segundos → "MM:SS"
const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export const LoginCardWidget = () => {
  const navigate = useNavigate();

  const {
    login,
    loading,
    error,
    showFailedModal,
    setShowFailedModal,
    attempts,
    intentosRestantes,
    isPenalized,
    timeLeft,
  } = useLoginService();

  const handleLoginSubmit = async (dni: string, password: string) => {
    const result = await login(dni, password);
    if (result.success) {
      navigate('/', { replace: true });
    }
  };

  // ── Vista de penalización ──────────────────────────────────────────────────
  if (isPenalized) {
    return (
      <div className="w-full max-w-[400px]">
        {/* Encabezado */}
        <div className="text-center mb-6">
          <img
            src={LOGO_SRC}
            alt="Logo UGEL Lampa"
            className="w-[88px] h-[88px] mx-auto mb-3 object-contain"
          />
          <h1 className="text-3xl font-black text-slate-800 tracking-wide">UGEL Lampa</h1>
          <p className="text-xs text-slate-500 mt-1">Sistema de Monitoreo</p>
        </div>

        {/* Card de penalización */}
        <div className="w-full bg-[#1a3152] border border-[#2d5a8e]/40 rounded-2xl p-8 shadow-xl text-center">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <span className="bg-[#e05a46] text-white text-[0.72rem] font-bold tracking-widest px-6 py-2 rounded-full uppercase shadow-sm">
              Acceso de Sistema
            </span>
          </div>

          {/* Timer */}
          <p className="text-[0.65rem] font-bold tracking-[0.2em] text-slate-400 uppercase mb-3">
            Tiempo de Penalización
          </p>
          <div className="bg-[#0f2340] border border-[#2d5a8e]/50 rounded-xl px-8 py-4 inline-block mb-6">
            <span className="text-white font-mono text-4xl font-bold tracking-widest">
              {formatTime(timeLeft)}
            </span>
          </div>

          {/* Mensaje */}
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            La opción de inicio de sesión está desactivada por{' '}
            <span className="text-white font-semibold">muchos intentos fallidos.</span>
            <br />
            Intenta el inicio de sesión más tarde.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-400 text-xs mt-6">
          Plataforma de Desempeño Escolar © Puno, Perú
        </p>
      </div>
    );
  }

  // ── Vista normal de login ──────────────────────────────────────────────────
  return (
    <>
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-6">
          <img
            src={LOGO_SRC}
            alt="Logo UGEL Lampa"
            className="w-[88px] h-[88px] mx-auto mb-3 object-contain"
          />
          <h1 className="text-3xl font-black text-slate-800 tracking-wide">UGEL Lampa</h1>
          <p className="text-xs text-slate-500 mt-1">Sistema de Monitoreo</p>
        </div>

        <div className="w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-xl">
          <div className="flex justify-center mb-5">
            <span className="bg-[#990537] text-white text-[0.72rem] font-bold tracking-widest px-6 py-2 rounded-full uppercase shadow-sm">
              Acceso de Sistema
            </span>
          </div>

          <BaseLoginForm
            onSubmit={handleLoginSubmit}
            onForgotPassword={() => navigate('/recuperar-password')}
            isLoading={loading}
          />

          {error && !showFailedModal && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-xs animate-fade-in font-medium mt-4">
              <AlertCircle className="w-[15px] h-[15px]" strokeWidth={2} />
              {error}
            </div>
          )}
        </div>
      </div>

      <LoginFailedModal
        isOpen={showFailedModal}
        attempts={attempts}
        intentosRestantes={intentosRestantes}
        onClose={() => setShowFailedModal(false)}
      />
    </>
  );
};
