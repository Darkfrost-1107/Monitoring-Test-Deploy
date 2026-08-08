import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  prefillDeSolicitud,
  type CatalogosDePrefill,
  type SolicitudAAtender,
} from '../lib/prefill-de-solicitud';
import type { FormularioCronograma } from '../lib/formulario';

/**
 * Abre el formulario ya cargado al entrar desde «Atender» una solicitud.
 *
 * Era un efecto de veintisiete líneas dentro de `useProgramacionCronograma`,
 * con un `setTimeout(…, 0)` para escapar de la advertencia de renders en
 * cascada. Acá el estado se ajusta durante el render —que es lo que React
 * recomienda para esto— y el efecto conserva sólo lo que de verdad es un
 * efecto: limpiar el `state` de la navegación.
 */

interface Opciones {
  catalogos: CatalogosDePrefill;
  /** Carga el formulario de una vez, sin disparar la cascada. */
  reiniciar: (campos: Partial<FormularioCronograma>) => void;
  onAbrir: (solicitudId: string | null) => void;
  onAviso: (mensaje: string | null) => void;
}

export function usePrefillDeSolicitud({ catalogos, reiniciar, onAbrir, onAviso }: Opciones) {
  const location = useLocation();
  const navigate = useNavigate();

  const solicitud = (location.state as { prefillSolicitud?: SolicitudAAtender } | null)
    ?.prefillSolicitud;

  // Los catálogos llegan por consulta: hasta que estén no se puede resolver la
  // modalidad ni el nivel, que encabezan la cascada.
  const catalogosListos = catalogos.instituciones.length > 0 && catalogos.docentes.length > 0;

  const [aplicado, setAplicado] = useState<string | null>(null);
  const clave = solicitud ? `${solicitud.solicitudId ?? ''}:${solicitud.institucionId}` : null;

  if (solicitud && clave && catalogosListos && aplicado !== clave) {
    setAplicado(clave);

    const { campos, faltante } = prefillDeSolicitud(solicitud, catalogos);
    reiniciar(campos);
    onAviso(faltante);
    onAbrir(solicitud.solicitudId ?? null);
  }

  // Limpiar el `state` es navegar, y navegar es un efecto. Sin esto el modal se
  // reabriría en cada render.
  useEffect(() => {
    if (!solicitud || aplicado !== clave) return;
    navigate(location.pathname, { replace: true });
  }, [solicitud, aplicado, clave, location.pathname, navigate]);
}
