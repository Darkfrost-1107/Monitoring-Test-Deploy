import { useState, useEffect } from 'react';
import { useUser, type User } from '@entities/model-user';
import { authApi } from '@shared/api/auth.api';
import { ErrorDeApi } from '@shared/config/api';

/**
 * Inicio de sesión.
 *
 * ── El bloqueo lo decide el servidor ──
 * Esta pantalla llevaba su propia cuenta de intentos fallidos y su propio
 * bloqueo, con el vencimiento guardado en `localStorage`. Eso tenía tres
 * problemas:
 *
 * 1. Un bloqueo en `localStorage` no bloquea nada. Borrar la clave desde las
 *    herramientas del navegador devolvía el formulario al instante.
 * 2. Cuando la respuesta no traía los datos, la pantalla los inventaba:
 *    sumaba uno a su propio contador y calculaba el vencimiento con una
 *    constante propia. Podía anunciar un bloqueo que el servidor no aplicó, o
 *    dejar pasar uno que sí.
 * 3. El umbral y la duración estaban escritos en los dos lados. Coincidían,
 *    hasta que alguien cambiara uno.
 *
 * El servidor es la única autoridad: rechaza la credencial, cuenta los fallos,
 * bloquea la cuenta y responde `failedLoginAttempts` y `lockedUntil`. Acá sólo
 * se muestra lo que llegó.
 *
 * Al recargar la página el bloqueo se olvida, y está bien: el próximo intento lo
 * rechaza el servidor con el tiempo real que falta. Recordarlo en el navegador
 * era simular una barrera que no existía.
 */

/** Lo que el servidor responde cuando rechaza el ingreso. */
interface RespuestaDeRechazo {
  failedLoginAttempts?: number;
  /** Cuántos quedan antes del bloqueo. Lo dice quien conoce el umbral. */
  intentosRestantes?: number;
  lockedUntil?: string;
  message?: string;
}

/** Segundos que faltan para que venza un bloqueo, o cero si ya venció. */
const segundosHasta = (lockedUntil: string): number => {
  const restante = Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 1000);
  return restante > 0 ? restante : 0;
};

export const useLoginService = () => {
  const { setUser } = useUser();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Intentos restantes que informó el servidor.
   *
   * Es lo que la pantalla muestra. El total de fallos acumulados
   * —`failedLoginAttempts`— lo consumía el modal que se retiró, y sin nadie que
   * lo lea sólo confundiría a quien lo encuentre.
   */
  const [intentosRestantes, setIntentosRestantes] = useState<number | null>(null);
  /** Segundos restantes del bloqueo que informó el servidor. */
  const [timeLeft, setTimeLeft] = useState(0);

  const isPenalized = timeLeft > 0;

  // Cuenta regresiva de lo que el servidor informó. No decide el bloqueo: sólo
  // muestra cuánto falta de uno ya declarado.
  useEffect(() => {
    if (!isPenalized) return;

    const timer = setInterval(() => {
      setTimeLeft((previo) => (previo <= 1 ? 0 : previo - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isPenalized]);

  const login = async (dni: string, password: string) => {
    setLoading(true);
    setError(null);

    const { ok, data, error: apiError } = await authApi.login(dni, password);

    setLoading(false);

    if (!ok || !data) {
      // Los datos vienen en el cuerpo de la respuesta, no en el error: el
      // wrapper conservaba sólo el mensaje y `intentosRestantes` y `lockedUntil`
      // se perdían antes de llegar acá.
      const rechazo = (apiError instanceof ErrorDeApi ? (apiError.cuerpo ?? {}) : {}) as
        RespuestaDeRechazo;
      const mensaje = rechazo.message || (apiError as Error)?.message || 'Credenciales incorrectas';

      // Sólo lo que informó el servidor. Sin dato, no se cuenta nada: mostrar un
      // número inventado es peor que no mostrar ninguno.
      setIntentosRestantes(rechazo.intentosRestantes ?? null);

      const restante = rechazo.lockedUntil ? segundosHasta(rechazo.lockedUntil) : 0;
      setTimeLeft(restante);
      setError(mensaje);

      return { success: false, error: mensaje };
    }

    setIntentosRestantes(null);
    setTimeLeft(0);

    setUser({
      id: data.user.id,
      dni: data.user.dni,
      nombres: data.user.nombres,
      apellidos: data.user.apellidos,
      role: data.user.role as User['role'],
      permissions: data.user.permissions ?? [],
      firstLogin: data.user.firstLogin,
      institucion: data.user.institucion,
      institucionNombre: data.user.institucionNombre,
      institucionNivel: data.user.institucionNivel,
      docenteId: data.user.docenteId,
      especialistaId: data.user.especialistaId,
      especialistaNivel: data.user.especialistaNivel,
      especialistaModalidad: data.user.especialistaModalidad,
      especialistaEspecialidades: data.user.especialistaEspecialidades,
      distrito: data.user.distrito,
    });

    return { success: true };
  };

  return {
    login,
    loading,
    error,
    intentosRestantes,
    isPenalized,
    timeLeft,
  };
};
