import { useState, useEffect } from 'react';
import { useUser, type User } from '@entities/model-user';
import { authApi } from '@shared/api/auth.api';
import { AUTH_SECURITY } from '@shared/constants/authConfig';

// Extraemos la configuración (ej. 3 intentos, 60 segundos de bloqueo)
const { MAX_ATTEMPTS, PENALIZATION_TIME_SECONDS } = AUTH_SECURITY;

export const useLoginService = () => {
  // 1. Nos conectamos a la Entidad Global para inyectar al usuario si tiene éxito
  const { setUser } = useUser();

  // 2. Estados locales de la operación
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFailedModal, setShowFailedModal] = useState(false);

  // 3. Lógica de cálculo de penalización basada en persistencia (localStorage)
  const [timeLeft, setTimeLeft] = useState(() => {
    const penaltyExpiry = localStorage.getItem('ugel_penalty_expiry');
    if (penaltyExpiry) {
      const remaining = Math.ceil((parseInt(penaltyExpiry) - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    }
    return 0;
  });

  const isPenalized = timeLeft > 0;
  const [attempts, setAttempts] = useState(() => (isPenalized ? MAX_ATTEMPTS : 0));

  // 4. Efecto del temporizador: Corre en segundo plano si el usuario está bloqueado
  useEffect(() => {
    if (!isPenalized) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          localStorage.removeItem('ugel_penalty_expiry');
          setAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPenalized]);

  // 5. La función principal que será llamada por el formulario
  const login = async (dni: string, password: string) => {
    setLoading(true);
    setError(null);

    // Llamada a la capa shared/api
    const { ok, data, error: apiError } = await authApi.login(dni, password);

    setLoading(false);

    // Manejo de fracaso
    if (!ok || !data) {
      interface ApiLoginError {
        failedLoginAttempts?: number;
        lockedUntil?: string;
        message?: string;
      }
      const errJson = (apiError || {}) as ApiLoginError;
      const nextAttempts =
        errJson.failedLoginAttempts !== undefined ? errJson.failedLoginAttempts : attempts + 1;
      setAttempts(nextAttempts);

      if (nextAttempts >= MAX_ATTEMPTS || errJson.lockedUntil) {
        // Bloqueo total
        const expiryTime = errJson.lockedUntil
          ? new Date(errJson.lockedUntil).getTime()
          : Date.now() + PENALIZATION_TIME_SECONDS * 1000;

        const calculatedPenaltyTime =
          Math.max(0, Math.ceil((expiryTime - Date.now()) / 1000)) || PENALIZATION_TIME_SECONDS;
        localStorage.setItem('ugel_penalty_expiry', expiryTime.toString());
        setTimeLeft(calculatedPenaltyTime);
        setShowFailedModal(false);

        const blockMsg = errJson.message || 'Demasiados intentos fallidos. Acceso bloqueado.';
        setError(blockMsg);
        return { success: false, error: blockMsg };
      } else {
        // Fallo pero aún tiene intentos
        setShowFailedModal(true);
        const failMsg = errJson.message || 'Credenciales incorrectas';
        setError(failMsg);
        return { success: false, error: failMsg };
      }
    }

    // Manejo de éxito
    localStorage.removeItem('ugel_penalty_expiry');
    // Ya no guardamos el accessToken ni refreshToken en localStorage porque el backend lo envía en cookies HttpOnly
    setAttempts(0);

    // Inyectamos el usuario en el contexto global (Entidad)
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

  // Exponemos las herramientas que el Widget/Formulario van a necesitar
  return {
    login,
    loading,
    error,
    attempts,
    isPenalized,
    timeLeft,
    showFailedModal,
    setShowFailedModal,
    MAX_ATTEMPTS,
  };
};
