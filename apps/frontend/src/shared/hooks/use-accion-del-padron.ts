import { useState } from 'react';
import {
  mensajeDeFallo,
  SIN_CONEXION,
  type ResultadoDeAccion,
} from '@shared/lib/resultado-de-accion';

/**
 * Ejecuta una acción sobre el padrón y deja su error a la vista.
 *
 * Las cinco tablas de padrón repetían este mismo `try/catch` dos veces cada
 * una, y mostraban el resultado con `alert()`. El error ahora vive en estado y
 * se dibuja sobre la tabla: se puede leer, releer y cerrar cuando se quiera.
 */
export function useAccionDelPadron() {
  const [error, setError] = useState<string | null>(null);

  /**
   * Devuelve `true` sólo si la acción salió bien, para que quien llama decida
   * si actualiza su lista.
   */
  const ejecutar = async (
    accion: () => Promise<ResultadoDeAccion>,
    respaldo: string,
    alTerminar?: () => void,
  ): Promise<boolean> => {
    setError(null);
    try {
      const respuesta = await accion();
      const fallo = mensajeDeFallo(respuesta, respaldo);

      if (!fallo) return true;
      setError(fallo);
    } catch (err) {
      setError(SIN_CONEXION);
      console.error(respaldo, err);
    } finally {
      alTerminar?.();
    }
    return false;
  };

  return { error, setError, ejecutar };
}
