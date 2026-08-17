import { useState } from 'react';
import { Card } from '@shared/ui/card';
import { MapPin } from 'lucide-react';
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
 * institucional además filtra por estado y por distrito.
 */

const CAJA =
  'absolute bottom-4 left-4 z-[400] p-3 shadow-md bg-card/95 backdrop-blur-sm border-border min-w-[210px] max-w-[250px]';

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

interface FiltrosDelMapaProps {
  estado: string;
  onCambiarEstado: (estado: string) => void;
  distrito: string | null;
  distritos: string[];
  onCambiarDistrito: (distrito: string | null) => void;
  conteoPorEstado?: Record<string, number>;
  conteoPorDistrito?: Map<string, number>;
}

export const FiltrosDelMapa = ({
  estado,
  onCambiarEstado,
  distrito,
  distritos,
  onCambiarDistrito,
  conteoPorEstado,
  conteoPorDistrito,
}: FiltrosDelMapaProps) => {
  const [tab, setTab] = useState<'estado' | 'distrito'>(distrito ? 'distrito' : 'estado');
  const tieneFiltroDistrito = Boolean(distrito);
  const tieneFiltroEstado = estado !== TODOS;

  return (
    <Card className={CAJA}>
      {/* Selector de Pestaña */}
      <div className="flex items-center gap-1 p-0.5 bg-muted/60 rounded-md mb-2 border border-border/50">
        <button
          type="button"
          onClick={() => setTab('estado')}
          className={`flex-1 flex items-center justify-center gap-1 py-1 px-1.5 text-[10px] font-bold rounded transition-colors cursor-pointer ${
            tab === 'estado'
              ? 'bg-background text-foreground shadow-xs'
              : 'text-text-muted hover:text-foreground'
          }`}
        >
          <span>Estado</span>
          {tieneFiltroEstado && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
        </button>
        <button
          type="button"
          onClick={() => setTab('distrito')}
          className={`flex-1 flex items-center justify-center gap-1 py-1 px-1.5 text-[10px] font-bold rounded transition-colors cursor-pointer ${
            tab === 'distrito'
              ? 'bg-background text-foreground shadow-xs'
              : 'text-text-muted hover:text-foreground'
          }`}
        >
          <span>Distrito</span>
          {tieneFiltroDistrito && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
        </button>
      </div>

      {tab === 'estado' ? (
        <div>
          <div className="flex justify-between items-center mb-1.5 gap-2">
            <h4 className={TITULO}>Filtrar por Estado</h4>
            {tieneFiltroEstado && (
              <button
                type="button"
                onClick={() => onCambiarEstado(TODOS)}
                className="text-[10px] text-primary hover:underline font-bold cursor-pointer"
              >
                Ver todos
              </button>
            )}
          </div>
          <div className="space-y-1 text-xs font-medium">
            {Object.values(ESTADOS_DEL_MAPA).map((s: EstadoDelMapa) => {
              const activo = estado === s.key;
              const count = conteoPorEstado?.[s.key];
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => onCambiarEstado(activo ? TODOS : s.key)}
                  className={`flex items-center justify-between w-full text-left px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    activo
                      ? 'bg-primary/10 font-bold text-primary border border-primary/20'
                      : 'hover:bg-muted/50 text-text-muted'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Punto color={s.color} />
                    <span className="truncate">{s.label}</span>
                  </div>
                  {count !== undefined && (
                    <span className="text-[10px] text-text-muted ml-1 tabular-nums font-semibold">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-1.5 gap-2">
            <h4 className={TITULO}>Filtrar por Distrito</h4>
            {tieneFiltroDistrito && (
              <button
                type="button"
                onClick={() => onCambiarDistrito(null)}
                className="text-[10px] text-primary hover:underline font-bold cursor-pointer"
              >
                Ver todos
              </button>
            )}
          </div>
          <div className="max-h-[170px] overflow-y-auto space-y-1 text-xs font-medium pr-1 custom-scrollbar">
            <button
              type="button"
              onClick={() => onCambiarDistrito(null)}
              className={`flex items-center justify-between w-full text-left px-2 py-1 rounded-md transition-colors cursor-pointer ${
                !distrito
                  ? 'bg-primary/10 font-bold text-primary border border-primary/20'
                  : 'hover:bg-muted/50 text-text-muted'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <MapPin className="w-3 h-3 shrink-0 text-text-muted" />
                <span className="truncate">Todos los distritos</span>
              </div>
            </button>
            {distritos.map((d) => {
              const activo = Boolean(
                distrito && d.toUpperCase() === distrito.toUpperCase(),
              );
              const count = conteoPorDistrito?.get(d.toUpperCase());
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => onCambiarDistrito(activo ? null : d)}
                  className={`flex items-center justify-between w-full text-left px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    activo
                      ? 'bg-primary/10 font-bold text-primary border border-primary/20'
                      : 'hover:bg-muted/50 text-text-muted'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MapPin
                      className={`w-3 h-3 shrink-0 ${activo ? 'text-primary' : 'text-text-muted'}`}
                    />
                    <span className="truncate">{d}</span>
                  </div>
                  {count !== undefined && (
                    <span className="text-[10px] text-text-muted ml-1 tabular-nums font-semibold">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};
