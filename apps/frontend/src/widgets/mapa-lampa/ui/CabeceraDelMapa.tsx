import {
  MODO_DISTRITAL,
  NOMBRE_DE_MODALIDAD,
  TODOS,
  type FiltroDeNivel,
  type ModoDelMapa,
} from '../lib/vista-del-mapa';

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
  /** Modalidades entre las que elegir; con una sola no hay nada que elegir y la fila se oculta. */
  modalidades: readonly string[];
  /** Niveles de la modalidad elegida; con uno solo la fila se oculta. */
  niveles: readonly string[];
  filtro: FiltroDeNivel;
  onCambiarModalidad: (modalidad: string) => void;
  onCambiarNivel: (nivel: string) => void;
}

interface Opcion {
  valor: string;
  texto: string;
  ayuda?: string;
}

interface ControlProps {
  etiqueta: string;
  opciones: readonly Opcion[];
  valor: string;
  onCambiar: (valor: string) => void;
}

const ControlSegmentado = ({ etiqueta, opciones, valor, onCambiar }: ControlProps) => (
  <div
    role="group"
    aria-label={etiqueta}
    className="flex flex-wrap items-center gap-1.5 bg-muted/50 p-1 rounded-lg border border-border"
  >
    <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted pl-1.5 pr-0.5">
      {etiqueta}
    </span>
    {opciones.map((opcion) => (
      <button
        key={opcion.valor}
        type="button"
        title={opcion.ayuda}
        aria-pressed={valor === opcion.valor}
        onClick={() => onCambiar(opcion.valor)}
        className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
          valor === opcion.valor
            ? 'bg-primary text-white font-semibold shadow-sm'
            : 'text-text-muted hover:text-foreground hover:bg-background/70'
        }`}
      >
        {opcion.texto}
      </button>
    ))}
  </div>
);

export const CabeceraDelMapa = ({
  modo,
  totalDistritos,
  visibles,
  totalInstituciones,
  distritoSeleccionado,
  onLimpiarDistrito,
  modalidades,
  niveles,
  filtro,
  onCambiarModalidad,
  onCambiarNivel,
}: Props) => {
  const hayFiltro = filtro.modalidad !== TODOS || filtro.nivel !== TODOS;
  const recuento = `${visibles} de ${totalInstituciones} II.EE.`;

  return (
    <div className="p-4 flex flex-wrap gap-3 justify-between items-center border-b border-border bg-card z-10">
      <div>
        <h3 className="text-lg font-bold">Mapa Georreferencial - Lampa</h3>
        <p className="text-xs text-text-muted">
          {modo === MODO_DISTRITAL
            ? `Vista Distrital Coroplética · ${totalDistritos} Distritos${hayFiltro ? ` · ${recuento}` : ''}`
            : `Mostrando ${recuento}`}
          {distritoSeleccionado && ` · Distrito: ${distritoSeleccionado}`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {modalidades.length > 1 && (
          <ControlSegmentado
            etiqueta="Modalidad"
            valor={filtro.modalidad}
            onCambiar={onCambiarModalidad}
            opciones={[
              { valor: TODOS, texto: 'Todas' },
              ...modalidades.map((m) => ({ valor: m, texto: m, ayuda: NOMBRE_DE_MODALIDAD[m] })),
            ]}
          />
        )}

        {niveles.length > 1 && (
          <ControlSegmentado
            etiqueta="Nivel"
            valor={filtro.nivel}
            onCambiar={onCambiarNivel}
            opciones={[
              { valor: TODOS, texto: 'Todos' },
              ...niveles.map((n) => ({ valor: n, texto: n })),
            ]}
          />
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
};
