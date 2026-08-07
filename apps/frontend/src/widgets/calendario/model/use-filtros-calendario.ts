import { useCallback, useMemo, useState } from 'react';
import {
  FILTROS_INICIALES,
  aplicarCambioDeFiltro,
  hayFiltroActivo,
  type CampoDeFiltro,
  type FiltrosCalendario,
  type PerfilDeFiltrado,
} from './filtros';

/** Filtros del calendario y las operaciones que admiten. */
export interface EstadoFiltrosCalendario {
  valores: FiltrosCalendario;
  cambiar: (campo: CampoDeFiltro, valor: string) => void;
  limpiar: () => void;
  /** ¿Hay algo puesto entre los filtros que este perfil ve? */
  hayActivo: boolean;
}

/**
 * Estado de filtros del calendario en un solo lugar.
 *
 * Fase 5 de PLAN_REMEDIACION.md, hallazgo H-14. Reemplaza los seis
 * `useState` del padre y los doce props valor/setter que bajaban hasta
 * `CalendarioGrid`. Las reglas —encadenado y filtro activo— viven en
 * `filtros.ts` con cobertura propia; acá sólo se les da estado.
 */
export function useFiltrosCalendario(perfil: PerfilDeFiltrado): EstadoFiltrosCalendario {
  const [valores, setValores] = useState<FiltrosCalendario>(FILTROS_INICIALES);

  const cambiar = useCallback((campo: CampoDeFiltro, valor: string) => {
    setValores((previo) => aplicarCambioDeFiltro(previo, campo, valor));
  }, []);

  const limpiar = useCallback(() => setValores(FILTROS_INICIALES), []);

  const hayActivo = useMemo(() => hayFiltroActivo(valores, perfil), [valores, perfil]);

  return { valores, cambiar, limpiar, hayActivo };
}
