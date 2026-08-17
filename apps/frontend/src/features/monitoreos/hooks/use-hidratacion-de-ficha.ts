import { useState } from 'react';
import { claveEstadoLocal, leerEstadoGuardado } from '../lib/estado-formulario';
import type { FuenteDeEstado } from '../lib/estado-formulario';

/**
 * Carga la ficha una vez por visita abierta.
 *
 * La fuente es el estado recibido, o el borrador local, o el formulario en
 * blanco. Un borrador ilegible se descarta: impedir abrir la ficha sería peor
 * que perderlo.
 *
 * Se ajusta durante el render en vez de diferirse con `setTimeout(…, 0)` dentro
 * de un efecto. La condición de «una vez por visita» queda escrita en el código
 * y no depende de que las dependencias de un efecto se mantengan estables: hoy
 * lo son —`initialState` viene memoizado desde `ReportesGrid`— pero nada lo
 * garantizaba, y volver a hidratar borraría lo que el evaluador llevara escrito.
 */

interface Opciones {
  abierta: boolean;
  visitaId?: string;
  templateId?: string;
  /** Estado con el que abrir la ficha, si se reabre una ya cargada. */
  initialState?: FuenteDeEstado | null;
  hidratar: (fuente: FuenteDeEstado | null) => void;
}

export function useHidratacionDeFicha({
  abierta,
  visitaId,
  templateId,
  initialState,
  hidratar,
}: Opciones) {
  const [hidratadaPara, setHidratadaPara] = useState<string | null>(null);
  const claveHidratacion = `${visitaId ?? ''}:${templateId ?? ''}`;

  if (abierta && visitaId && hidratadaPara !== claveHidratacion) {
    setHidratadaPara(claveHidratacion);
    hidratar(
      initialState ??
        leerEstadoGuardado(localStorage.getItem(claveEstadoLocal(visitaId, templateId))),
    );
  }

  // Al cerrar se olvida, para que la próxima apertura vuelva a cargar.
  if (!abierta && hidratadaPara !== null) {
    setHidratadaPara(null);
  }
}
