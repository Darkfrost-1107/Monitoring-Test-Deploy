/** Un número de visita con su disponibilidad. */
export interface BotonVisita {
  value: string;
  /** Etiqueta visible; llega como número desde el cálculo de huecos. */
  num: string | number;
  /** Ya existe una visita con ese número. */
  isOcupado: boolean;
  /** Su número es posterior al primero libre: no se puede saltear. */
  isFuture: boolean;
  /** Existía y fue anulada: su número queda libre para rellenar el hueco. */
  isAnulado: boolean;
}

interface SelectorNumeroVisitaProps {
  botones: BotonVisita[];
  seleccionado: string;
  onSeleccionar: (valor: string) => void;
  /** En edición el número no se cambia: la visita ya existe con ese número. */
  bloqueado: boolean;
}

const BASE = 'w-10 h-10 rounded-xl text-xs font-bold transition-all duration-200 border shrink-0 ';
const ELEGIDO = 'bg-primary text-white border-primary shadow-sm';
const INACCESIBLE = 'bg-surface text-text-muted border-border opacity-40';

/**
 * Número de la visita dentro del año.
 *
 * Los números se asignan en orden y no se saltean, salvo para rellenar el hueco
 * de una visita anulada: ese caso se distingue con borde punteado porque es la
 * única forma de reutilizar un número ya emitido.
 */
export const SelectorNumeroVisita = ({
  botones,
  seleccionado,
  onSeleccionar,
  bloqueado,
}: SelectorNumeroVisitaProps) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-bold text-text-muted">Número de Visita *</label>

    <div className="flex flex-wrap gap-2 mt-0.5">
      {botones.map((boton) => {
        const elegido = seleccionado === boton.value;
        const inhabilitado = bloqueado || boton.isOcupado || boton.isFuture;

        let clases = BASE;
        if (bloqueado) {
          clases += elegido ? ELEGIDO : INACCESIBLE;
        } else if (inhabilitado) {
          clases += `${INACCESIBLE} cursor-not-allowed`;
        } else if (elegido) {
          clases += `${ELEGIDO} cursor-pointer`;
        } else if (boton.isAnulado) {
          clases +=
            'bg-surface text-amber-600 border-2 border-dashed border-amber-300 hover:bg-amber-50 hover:border-amber-400 cursor-pointer';
        } else {
          clases += 'bg-surface text-text-muted border-border hover:bg-muted cursor-pointer';
        }

        return (
          <button
            key={boton.value}
            type="button"
            disabled={inhabilitado}
            aria-disabled={inhabilitado}
            onClick={inhabilitado ? undefined : () => onSeleccionar(boton.value)}
            className={clases}
          >
            {boton.num}
          </button>
        );
      })}
    </div>

    <span className="text-[10px] text-text-muted pl-1">
      {bloqueado
        ? 'El número de visita no se puede modificar en edición.'
        : 'Se sugiere automáticamente. Puede seleccionar un número ANULADO (borde punteado) para rellenar el espacio.'}
    </span>
  </div>
);
