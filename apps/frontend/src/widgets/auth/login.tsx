import { AlertCircle, Clock } from 'lucide-react';
import { BaseLoginForm } from '@features/login/ui/formLoginBase';
import { useLoginService } from '@features/login/login-service';
import { useNavigate } from 'react-router-dom';

/**
 * Tarjeta de ingreso.
 *
 * ── El estado del acceso va debajo del botón ──
 * Un intento fallido abría un modal que había que cerrar para volver a
 * escribir, y el bloqueo reemplazaba la tarjeta entera por una pantalla con un
 * cronómetro grande: el formulario desaparecía y con él el enlace para
 * recuperar la contraseña, que es lo que corresponde hacer en ese momento.
 *
 * Ahora los dos estados viven en el mismo lugar, debajo del botón, donde ya
 * estaba el mensaje de error. Nada tapa ni reemplaza al formulario.
 */

const LOGO_SRC = '/logo-ugel.png';

/** Segundos → «MM:SS». */
const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const segun = (n: number, singular: string, plural: string) => (n === 1 ? singular : plural);

export const LoginCardWidget = () => {
  const navigate = useNavigate();

  const {
    login,
    limpiarAviso,
    senalDeFallo,
    loading,
    error,
    intentosRestantes,
    isPenalized,
    timeLeft,
  } = useLoginService();

  /**
   * El último intento se anuncia más fuerte.
   *
   * «Le quedan 2» y «le queda 1» se veían idénticos, cuando el segundo es el que
   * decide si la cuenta se bloquea media hora.
   */
  const esUltimoIntento = intentosRestantes === 1;

  const handleLoginSubmit = async (dni: string, password: string) => {
    const result = await login(dni, password);
    if (result.success) {
      navigate('/', { replace: true });
    }
  };

  return (
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
          bloqueado={isPenalized}
          onEditar={limpiarAviso}
          senalDeFallo={senalDeFallo}
        />

        {/*
          Bloqueo. La cuenta regresiva sale de `lockedUntil`, que informa el
          servidor: acá sólo se muestra cuánto falta de un bloqueo ya declarado.
        */}
        {isPenalized && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mt-4 animate-fade-in"
          >
            <Clock className="w-[15px] h-[15px] text-amber-600 mt-0.5 shrink-0" strokeWidth={2} />
            <div className="text-xs">
              <p className="font-bold text-amber-800">Cuenta bloqueada temporalmente</p>
              <p className="text-amber-700 mt-0.5">
                Demasiados intentos fallidos. Podrá intentar de nuevo en{' '}
                <span className="font-mono font-bold tabular-nums">{formatTime(timeLeft)}</span>.
              </p>
              <p className="text-amber-700/80 mt-1">
                Si no recuerda su contraseña, puede recuperarla ahora.
              </p>
            </div>
          </div>
        )}

        {/*
          Intento fallido: el motivo y cuántos quedan. El número lo informa el
          servidor, que es quien conoce su umbral; sin ese dato se muestra sólo
          el motivo, en vez de inventar una cuenta.
        */}
        {error && !isPenalized && (
          <div
            role="alert"
            className={`flex items-start gap-2 rounded-xl p-3 mt-4 animate-fade-in border ${
              esUltimoIntento ? 'bg-red-100 border-red-400' : 'bg-red-50 border-red-200'
            }`}
          >
            <AlertCircle
              className={`w-[15px] h-[15px] mt-0.5 shrink-0 ${
                esUltimoIntento ? 'text-red-700' : 'text-red-600'
              }`}
              strokeWidth={2}
            />
            <div className="text-xs">
              <p className={esUltimoIntento ? 'font-bold text-red-800' : 'font-semibold text-red-700'}>
                {error}
              </p>

              {esUltimoIntento && (
                <p className="font-bold text-red-800 mt-1">
                  Último intento: si vuelve a fallar, la cuenta se bloqueará por 30 minutos.
                </p>
              )}

              {intentosRestantes !== null && intentosRestantes > 1 && (
                <p className="text-red-600/90 mt-0.5">
                  Le quedan <span className="font-bold">{intentosRestantes}</span>{' '}
                  {segun(intentosRestantes, 'intento', 'intentos')} antes de que la cuenta se
                  bloquee.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-slate-400 text-xs mt-6">
        Plataforma de Desempeño Escolar © Puno, Perú
      </p>
    </div>
  );
};
