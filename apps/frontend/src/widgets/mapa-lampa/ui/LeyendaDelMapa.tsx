import { Card } from '@shared/ui/card';
import {
  COBERTURA_LEYENDA,
  ESTADOS_DEL_MAPA,
  TODOS,
  type EstadoDelMapa,
} from '../lib/vista-del-mapa';

/**
 * La leyenda del mapa, que cambia de naturaleza según el modo.
 *
 * En vista distrital sólo explica los colores del coroplético. En vista
 * institucional además filtra: cada estado del semáforo es un botón. Son dos
 * componentes distintos aunque compartan la caja.
 */

const CAJA =
  'absolute bottom-4 left-4 z-[400] p-3 shadow-md bg-card/95 backdrop-blur-sm border-border';

const TITULO = 'text-[10px] font-bold text-text-muted uppercase tracking-wider';

const Punto = ({ color }: { color: string }) => (
  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
);

export const LeyendaDeCobertura = () => (
  <Card className={CAJA}>
    <h4 className={`${TITULO} mb-2`}>Cobertura por Distrito</h4>
    <div className="space-y-1.5 text-xs font-medium">
      {COBERTURA_LEYENDA.map((tramo) => (
        <div
          key={tramo.label}
          className="flex items-center gap-2 px-1.5 py-0.5 text-text-muted"
        >
          <Punto color={tramo.color} />
          {tramo.label}
        </div>
      ))}
    </div>
  </Card>
);

interface FiltroProps {
  estado: string;
  onCambiar: (estado: string) => void;
}

export const FiltroDeEstado = ({ estado, onCambiar }: FiltroProps) => (
  <Card className={CAJA}>
    <div className="flex justify-between items-center mb-2 gap-4">
      <h4 className={TITULO}>Filtrar por Estado</h4>
      {estado !== TODOS && (
        <button
          type="button"
          onClick={() => onCambiar(TODOS)}
          className="text-[10px] text-primary hover:underline font-bold cursor-pointer"
        >
          Ver todos
        </button>
      )}
    </div>
    <div className="space-y-1.5 text-xs font-medium">
      {Object.values(ESTADOS_DEL_MAPA).map((s: EstadoDelMapa) => {
        const activo = estado === s.key;
        return (
          <button
            key={s.key}
            type="button"
            // Volver a pulsar el estado activo lo desactiva: es el único modo
            // de limpiar el filtro sin apuntar al enlace de arriba.
            onClick={() => onCambiar(activo ? TODOS : s.key)}
            className={`flex items-center gap-2 w-full text-left px-1.5 py-0.5 rounded-md transition-colors cursor-pointer ${
              activo ? 'bg-muted font-bold text-foreground' : 'hover:bg-muted/50 text-text-muted'
            }`}
          >
            <Punto color={s.color} />
            {s.label}
          </button>
        );
      })}
    </div>
  </Card>
);
