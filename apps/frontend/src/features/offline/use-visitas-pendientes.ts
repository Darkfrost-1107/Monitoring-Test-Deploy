import { useEffect, useState } from 'react';
import { cronogramasPendientes, EVENTO_CAMBIO } from './outbox';

/**
 * Conjunto de cronogramas que tienen una ficha (o firma) en la cola de envío.
 *
 * Permite marcar en la lista qué visitas quedaron "pendientes de envío" hasta que
 * suban. Se refresca al montar y cada vez que la cola cambia (evento `sm-outbox`),
 * así el rótulo aparece y desaparece solo al encolar o sincronizar.
 */
export function useVisitasPendientes(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let vivo = true;
    const refrescar = () => {
      void cronogramasPendientes().then((s) => {
        if (vivo) setIds(s);
      });
    };
    refrescar();
    window.addEventListener(EVENTO_CAMBIO, refrescar);
    return () => {
      vivo = false;
      window.removeEventListener(EVENTO_CAMBIO, refrescar);
    };
  }, []);

  return ids;
}
