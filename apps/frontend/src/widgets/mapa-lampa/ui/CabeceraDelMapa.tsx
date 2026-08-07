import { MODO_DISTRITAL, NIVELES_DEL_FILTRO, type ModoDelMapa } from '../lib/vista-del-mapa';

/**
 * Título, recuento y filtros rápidos del mapa.
 *
 * El recuento dice cosas distintas según el modo: en distrital cuántos
 * distritos abarca el coroplético, en institucional cuántas II.EE. sobreviven
 * a los filtros sobre el total.
 */

interface Props {
  modo: ModoDelMapa;
  totalDistritos: number;
  visibles: number;
  totalInstituciones: number;
  distritoSeleccionado?: string | null;
  onLimpiarDistrito: () => void;
  /** El filtro de nivel se oculta cuando no aporta; lo decide el contenedor. */
  mostrarFiltroDeNivel: boolean;
  nivel: string;
  onCambiarNivel: (nivel: string) => void;
}

export const CabeceraDelMapa = ({
  modo,
  totalDistritos,
  visibles,
  totalInstituciones,
  distritoSeleccionado,
  onLimpiarDistrito,
  mostrarFiltroDeNivel,
  nivel,
  onCambiarNivel,
}: Props) => (
  <div className="p-4 flex flex-wrap gap-3 justify-between items-center border-b border-border bg-card z-10">
    <div>
      <h3 className="text-lg font-bold">Mapa Georreferencial - Lampa</h3>
      <p className="text-xs text-text-muted">
        {modo === MODO_DISTRITAL
          ? `Vista Distrital Coroplética · ${totalDistritos} Distritos`
          : `Mostrando ${visibles} de ${totalInstituciones} II.EE.`}
        {distritoSeleccionado && ` · Distrito: ${distritoSeleccionado}`}
      </p>
    </div>

    <div className="flex flex-wrap items-center gap-2">
      {mostrarFiltroDeNivel && (
        <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-lg border border-border">
          {NIVELES_DEL_FILTRO.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onCambiarNivel(n)}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                nivel === n
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-text-muted hover:text-foreground'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {distritoSeleccionado && (
        <button
          type="button"
          className="text-xs font-bold text-primary hover:underline cursor-pointer"
          onClick={onLimpiarDistrito}
        >
          Limpiar distrito ✕
        </button>
      )}
    </div>
  </div>
);
