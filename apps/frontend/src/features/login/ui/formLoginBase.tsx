import { useEffect, useRef, useState } from 'react';
import { UserRound, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

interface BaseLoginFormProps {
  onSubmit: (dni: string, password: string) => void;
  onForgotPassword: () => void;
  isLoading?: boolean;
  /**
   * La cuenta está bloqueada por intentos fallidos.
   *
   * Deshabilita sin cambiar el rótulo del botón: «Verificando…» diría que algo
   * está pasando cuando en realidad no se envió nada.
   */
  bloqueado?: boolean;
  /**
   * Avisa que el usuario empezó a corregir.
   *
   * El aviso de error quedaba en pantalla mientras se reescribía la contraseña,
   * contradiciendo lo que la persona estaba haciendo.
   */
  onEditar?: () => void;
  /**
   * Cambia con cada intento fallido.
   *
   * Sirve de disparador para devolver el foco a la contraseña: no es un dato que
   * se muestre, es la señal de que hubo un fallo nuevo. Un booleano no alcanza,
   * porque dos fallos seguidos no lo harían cambiar.
   */
  senalDeFallo?: number;
}

export const BaseLoginForm = ({
  onSubmit,
  onForgotPassword,
  isLoading,
  bloqueado = false,
  onEditar,
  senalDeFallo = 0,
}: BaseLoginFormProps) => {
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const campoPassword = useRef<HTMLInputElement>(null);

  // Tras fallar, el cursor quedaba donde estaba y había que ir al campo con el
  // mouse. Se devuelve el foco con el texto seleccionado, para reescribir de una.
  useEffect(() => {
    if (senalDeFallo === 0) return;
    campoPassword.current?.focus();
    campoPassword.current?.select();
  }, [senalDeFallo]);

  /** Cada tecla en cualquiera de los dos campos limpia el aviso anterior. */
  const alEditar = () => onEditar?.();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Emitimos los datos puros hacia arriba
    onSubmit(dni, password);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Campo Usuario. El rótulo queda para lectores de pantalla: a la vista
          lo reemplazan el ícono y el placeholder, como en el diseño. */}
      <div>
        <label htmlFor="login-dni" className="sr-only">
          Usuario
        </label>
        <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-colors">
          <span className="pl-4 text-slate-500">
            <UserRound className="w-[18px] h-[18px]" strokeWidth={2} />
          </span>
          <input
            id="login-dni"
            name="username"
            type="text"
            inputMode="numeric"
            autoComplete="username"
            aria-describedby="login-dni-ayuda"
            placeholder="Usuario"
            value={dni}
            onChange={(e) => {
              setDni(e.target.value.replace(/\D/g, '').slice(0, 8));
              alEditar();
            }}
            maxLength={8}
            disabled={isLoading || bloqueado}
            className="w-full bg-transparent border-none outline-none text-slate-800 text-[15px] px-3 py-3.5 disabled:opacity-50"
          />
        </div>
        <p id="login-dni-ayuda" className="text-[11px] text-slate-500 mt-1.5 pl-11">
          Ingresa tu DNI de 8 dígitos
        </p>
      </div>

      {/* Campo Contraseña */}
      <div>
        <label htmlFor="login-password" className="sr-only">
          Contraseña
        </label>
        <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-colors">
          <span className="pl-4 text-slate-500">
            <Lock className="w-[18px] h-[18px]" strokeWidth={2} />
          </span>
          <input
            id="login-password"
            name="password"
            type={showPass ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Contraseña"
            ref={campoPassword}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              alEditar();
            }}
            disabled={isLoading || bloqueado}
            className="w-full bg-transparent border-none outline-none text-slate-800 text-[15px] px-3 py-3.5 disabled:opacity-50"
          />
          {/*
            Va después del input y no en la fila del rótulo: en el DOM estaba
            entre los dos campos, de modo que tabular desde Usuario caía acá y
            no en Contraseña.
          */}
          <button
            type="button"
            onClick={() => setShowPass((p) => !p)}
            disabled={isLoading || bloqueado}
            aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={showPass}
            className="shrink-0 px-4 text-slate-500 hover:text-primary flex items-center cursor-pointer bg-transparent border-none disabled:opacity-50"
          >
            {showPass ? (
              <EyeOff className="w-[18px] h-[18px]" />
            ) : (
              <Eye className="w-[18px] h-[18px]" />
            )}
          </button>
        </div>

        <div className="flex justify-end mt-2">
          {/* Sigue disponible con la cuenta bloqueada: recuperar la contraseña es
              justamente lo que corresponde hacer en ese momento. */}
          <button
            type="button"
            onClick={onForgotPassword}
            disabled={isLoading}
            className="text-primary underline underline-offset-2 hover:text-primary-hover text-xs cursor-pointer bg-transparent border-none outline-none font-medium disabled:opacity-50"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </div>

      {/* Botón de Envío (Integrado al form para disparar el onSubmit nativo) */}
      <button
        type="submit"
        disabled={isLoading || bloqueado || dni.length < 8 || password.length < 6}
        className="w-full py-3.5 bg-primary-dark hover:bg-primary disabled:bg-primary-dark/75 text-white font-semibold text-[15px] rounded-xl transition-all shadow-md shadow-primary-dark/20 mt-1 cursor-pointer disabled:cursor-not-allowed border-none flex items-center justify-center gap-2"
      >
        {!isLoading && <ArrowRight className="w-[18px] h-[18px]" strokeWidth={2.25} />}
        {isLoading ? 'Verificando...' : 'Iniciar sesión'}
      </button>
    </form>
  );
};
