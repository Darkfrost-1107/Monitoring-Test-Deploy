import { AlertCircle, Clock, ShieldCheck } from 'lucide-react';
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
    <div className="w-full max-w-[460px] rounded-3xl overflow-hidden bg-white border border-slate-200/80 shadow-2xl shadow-slate-900/10 relative">
      <div className="px-8 sm:px-10 pt-9 pb-8">
        {/* Isotipo institucional en vez de un bloque de color a pantalla
            completa: el logo real es más creíble que un ícono inventado. */}
        <div className="flex items-center gap-4 mb-5">
          <img src="/logo-ugel-lampa.webp" alt="" aria-hidden="true" className="h-14 w-14 object-contain shrink-0" />
          <div className="min-w-0">
            <p className="text-[1.75rem] font-black text-primary tracking-tight leading-none">UGEL LAMPA</p>
            <p className="text-sm text-slate-600 mt-1.5 leading-tight">
              Sistema de Monitoreo Docente y Directivo
            </p>
          </div>
        </div>

        {/* Acento en tramos guinda y dorado, que se afina en una línea. */}
        <div className="flex items-center gap-1 mb-7" aria-hidden="true">
          <span className="h-[3px] w-16 rounded-full bg-primary" />
          <span className="h-[3px] w-6 rounded-full bg-yellow-400" />
          <span className="h-[3px] w-6 rounded-full bg-primary" />
          <span className="h-[3px] w-6 rounded-full bg-yellow-400/70" />
          <span className="h-px flex-1 bg-primary/30" />
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-1">Iniciar sesión</h2>
        <p className="text-sm text-slate-500 mb-6">Ingresa tus credenciales para continuar</p>

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

        <div className="flex items-center gap-3 my-6">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4" strokeWidth={2} />
            Acceso seguro
          </span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="flex items-center justify-center gap-2 bg-slate-100/80 rounded-xl px-3 py-3">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0" strokeWidth={2} />
          <p className="text-xs text-slate-600">Solo personal autorizado de la UGEL Lampa</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-8 sm:px-10 py-3 bg-slate-50 border-t border-slate-100">
        <p className="text-slate-400 text-[10px]">Plataforma de Desempeño Escolar © Puno, Perú</p>
        <img src="/logo-agp.webp" alt="AGP" className="h-5 object-contain opacity-80" />
      </div>
    </div>
  );
};
