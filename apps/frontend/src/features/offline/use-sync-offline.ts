import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useEstadoConexion } from './conexion';
import { listarOperaciones, limpiarEnviadas, EVENTO_CAMBIO } from './outbox';
import { contarPendientes } from './outbox-logica';
import { sincronizarCola } from './sync';
import { solicitarPersistencia } from './almacenamiento';

/**
 * Mantiene la cola de envío drenándose sola: sincroniza al abrir la app y cada
 * vez que se recupera la conexión, y expone cuántas fichas quedan por enviar para
 * que la UI lo muestre. Al terminar, descarta las ya enviadas.
 */
export function useSyncOffline() {
  const { enLinea } = useEstadoConexion();
  const [pendientes, setPendientes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);

  const refrescar = useCallback(async () => {
    setPendientes(contarPendientes(await listarOperaciones()));
  }, []);

  const sincronizarAhora = useCallback(async () => {
    setSincronizando(true);
    try {
      const enviadas = await sincronizarCola();
      await limpiarEnviadas();
      await refrescar();
      if (enviadas > 0) toast.success(`${enviadas} ficha(s) sincronizada(s).`, { id: 'sync' });
    } finally {
      setSincronizando(false);
    }
  }, [refrescar]);

  useEffect(() => {
    // Pide storage persistente para que no desalojen la cola.
    void solicitarPersistencia();
    // El setState ocurre async, tras leer IndexedDB: sincroniza con un sistema
    // externo (la cola), no es un render en cascada síncrono.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refrescar();
    // La cola puede cambiar desde otra pantalla (al encolar una ficha): mantener
    // el contador al día.
    window.addEventListener(EVENTO_CAMBIO, refrescar);
    return () => window.removeEventListener(EVENTO_CAMBIO, refrescar);
  }, [refrescar]);

  // Cada vez que hay conexión, se intenta vaciar la cola.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (enLinea) void sincronizarAhora();
  }, [enLinea, sincronizarAhora]);

  return { enLinea, pendientes, sincronizando, sincronizarAhora, refrescar };
}
