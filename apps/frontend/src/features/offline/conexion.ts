import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@shared/config/api';

/**
 * Detección de conexión real.
 *
 * `navigator.onLine` sólo dice si hay una red conectada, no si el servidor
 * responde: en una IE con wifi sin salida a internet daría "en línea" y la
 * sincronización fallaría igual. Por eso se confirma con un ping al API —una
 * respuesta con cualquier estado HTTP (incluido 401) prueba que el backend está
 * alcanzable; sólo un error de red significa que no hay conexión—.
 */

/** ¿El backend responde? Cualquier respuesta HTTP cuenta; sólo el error de red es "offline". */
export async function apiAlcanzable(timeoutMs = 4000): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    await fetch(`${API_BASE_URL}/api/notificaciones`, {
      method: 'HEAD',
      credentials: 'include',
      signal: ctrl.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Cada cuánto se re-sondea la conexión real. Un HEAD cada 15 s es despreciable en
 * datos —y offline falla al instante— pero alcanza para que el estado no quede
 * pegado en "en línea" cuando la señal se cae sin avisar.
 */
const INTERVALO_SONDEO_MS = 15_000;

/**
 * Estado de conexión reactivo. Parte de `navigator.onLine` y lo confirma con un
 * ping real, tanto al recuperar/perder la red como cada cierto intervalo, para no
 * anunciar "en línea" sin salida real ni quedarse ciego ante una caída silenciosa.
 */
export function useEstadoConexion() {
  const [enLinea, setEnLinea] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    let vivo = true;
    const confirmar = async () => {
      const ok = await apiAlcanzable();
      if (vivo) setEnLinea(ok);
    };
    const alConectar = () => void confirmar();
    const alDesconectar = () => setEnLinea(false);
    const alCambiarVisibilidad = () => {
      if (!document.hidden) void confirmar();
    };

    window.addEventListener('online', alConectar);
    window.addEventListener('offline', alDesconectar);
    document.addEventListener('visibilitychange', alCambiarVisibilidad);

    // Se confirma con un PING real, no sólo con `navigator.onLine`: éste sólo dice
    // si hay una red conectada, y se queda en «en línea» cuando la red no tiene
    // salida —portal cautivo, backend caído, señal sin datos— o cuando se corta de
    // un modo que no dispara el evento `offline` (p. ej. el throttle "Offline" de
    // DevTools). Por eso, además de reaccionar a los eventos, se re-sondea cada
    // tanto: así «Sin conexión» aparece aunque el navegador se crea conectado.
    void confirmar();
    const idSondeo = window.setInterval(() => {
      if (!document.hidden) void confirmar();
    }, INTERVALO_SONDEO_MS);

    return () => {
      vivo = false;
      window.removeEventListener('online', alConectar);
      window.removeEventListener('offline', alDesconectar);
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      window.clearInterval(idSondeo);
    };
  }, []);

  return { enLinea };
}
