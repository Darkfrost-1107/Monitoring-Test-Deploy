import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { paginar } from '@shared/lib/paginacion';

/**
 * Paginación y filtrado de las tablas de padrón, con la página en la URL.
 *
 * El corte lo hace `paginar`, que ya acota la página pedida y está probado.
 * Antes se calculaba acá con `Math.min(pageParam, totalPages)` y sin cota
 * inferior: `?page=0` daba un recorte desde el índice -10, y `?page=abc` dejaba
 * `parseInt` en NaN y la tabla vacía sin explicación. La página viaja en la URL,
 * de modo que no hacía falta un enlace mal formado para llegar ahí: bastaba con
 * borrar el último registro de la última página.
 */

interface UseEntityTableOptions<T> {
  data: T[];
  filterFn?: (item: T, params: URLSearchParams) => boolean;
  defaultPageSize?: number;
}

export interface UseEntityTableReturn<T> {
  pageItems: T[];
  filteredTotal: number;
  currentPage: number;
  totalPages: number;
  /** Índice humano del primer registro de la página; 0 si no hay ninguno. */
  from: number;
  to: number;
  setPage: (page: number) => void;
}

export function useEntityTable<T>({
  data,
  filterFn,
  defaultPageSize = 10,
}: UseEntityTableOptions<T>): UseEntityTableReturn<T> {
  const [searchParams, setSearchParams] = useSearchParams();

  const filtered = useMemo(() => {
    if (!filterFn) return data;
    return data.filter((item) => filterFn(item, searchParams));
  }, [data, filterFn, searchParams]);

  const pagina = paginar(filtered, Number(searchParams.get('page')), defaultPageSize);

  const desde = (pagina.paginaActual - 1) * defaultPageSize;

  const setPage = (nueva: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(nueva));
    setSearchParams(params);
  };

  return {
    pageItems: pagina.elementos,
    filteredTotal: filtered.length,
    currentPage: pagina.paginaActual,
    totalPages: pagina.totalPaginas,
    from: filtered.length === 0 ? 0 : desde + 1,
    to: desde + pagina.elementos.length,
    setPage,
  };
}
