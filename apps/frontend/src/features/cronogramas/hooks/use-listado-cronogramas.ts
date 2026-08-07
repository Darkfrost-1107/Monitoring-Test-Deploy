import { useCallback, useMemo, useState } from 'react';
import type { Cronograma } from '@entities/model-cronogramas';
import type { FiltrosListado } from '@/pages/jefeGestion/cronograma/BarraFiltros';

/** Filas por página del listado. */
const POR_PAGINA = 5;

const FILTROS_VACIOS: FiltrosListado = {
  evaluador: '',
  docente: '',
  institucion: 'Todos',
  tipo: 'Todos',
  estado: 'Todos',
};

const contiene = (texto: string, busqueda: string) =>
  busqueda.trim() === '' || texto.toLowerCase().includes(busqueda.toLowerCase());

/**
 * Filtrado y paginación del listado de cronogramas.
 *
 * Fase 5 de PLAN_REMEDIACION.md. Vivía como cinco `useState` y cuatro `useMemo`
 * dentro de `CronogramaPage`, incluido el reinicio de página al cambiar los
 * filtros —que se hacía comparando el objeto de filtros con su valor anterior
 * guardado en otro estado—.
 *
 * Acá la página no necesita reiniciarse: se acota al total disponible al
 * calcularla, de modo que no hay un estado que corregir después.
 */
export function useListadoCronogramas(
  cronogramas: readonly Cronograma[],
  /** El director no filtra por institución: trabaja dentro de una sola. */
  esDirector: boolean,
) {
  const [filtros, setFiltros] = useState<FiltrosListado>(FILTROS_VACIOS);
  const [paginaPedida, setPaginaPedida] = useState(1);

  const cambiarFiltro = useCallback(
    <K extends keyof FiltrosListado>(campo: K, valor: string) => {
      setFiltros((previo) => ({ ...previo, [campo]: valor }));
      setPaginaPedida(1);
    },
    [],
  );

  const filtrados = useMemo(
    () =>
      cronogramas.filter((item) => {
        if (!contiene(item.especialista, filtros.evaluador)) return false;
        if (!contiene(item.docenteDirectivo, filtros.docente)) return false;

        const coincideInstitucion =
          esDirector || filtros.institucion === 'Todos' || item.institucion === filtros.institucion;
        if (!coincideInstitucion) return false;

        if (filtros.tipo !== 'Todos' && item.tipo !== filtros.tipo) return false;

        // Sin filtro de estado se ocultan las anuladas: son bajas lógicas.
        const coincideEstado =
          filtros.estado === 'Todos' ? item.estado !== 'ANULADO' : item.estado === filtros.estado;

        return coincideEstado;
      }),
    [cronogramas, filtros, esDirector],
  );

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  // Se acota en lugar de corregir el estado: si el filtro dejó menos páginas,
  // la actual pasa a ser la última sin necesidad de un efecto que la ajuste.
  const pagina = Math.min(paginaPedida, totalPaginas);

  const desde = (pagina - 1) * POR_PAGINA;
  const hasta = Math.min(pagina * POR_PAGINA, filtrados.length);

  const pagina_ = useMemo(() => filtrados.slice(desde, hasta), [filtrados, desde, hasta]);

  return {
    filtros,
    cambiarFiltro,
    filtrados,
    paginados: pagina_,
    pagina,
    totalPaginas,
    desde,
    hasta,
    irAPagina: setPaginaPedida,
  };
}
