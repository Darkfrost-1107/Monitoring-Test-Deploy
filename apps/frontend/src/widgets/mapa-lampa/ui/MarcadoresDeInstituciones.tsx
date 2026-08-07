import { CircleMarker, Popup, Pane } from 'react-leaflet';
import type { IUgelDashboardIeMapa } from '@sistema-monitoreo/shared-contracts';
import { estadoDelMarcador } from '../lib/vista-del-mapa';

/**
 * Los puntos de las II.EE. sobre el mapa.
 *
 * Se muestran siempre, en los dos modos: ubicar los colegios es informativo
 * también para el Director UGEL. Lo que cambia es qué pasa al pulsarlos —abrir
 * el panel lateral o desplegar el globo— y eso depende de si el contenedor
 * quiere hacerse cargo de la selección.
 */

interface Props {
  instituciones: readonly IUgelDashboardIeMapa[];
  seleccionada?: string | null;
  /** Si se provee, el clic selecciona la IE en vez de abrir el globo. */
  onSeleccionar?: (institucionId: string) => void;
}

export const MarcadoresDeInstituciones = ({
  instituciones,
  seleccionada,
  onSeleccionar,
}: Props) => {
  if (instituciones.length === 0) return null;

  return (
    // Por encima de los polígonos de distrito, que están en el panel de overlays.
    <Pane name="focos-markers" style={{ zIndex: 450 }}>
      {instituciones.map((ie) => {
        const estado = estadoDelMarcador(ie.estado);
        const activa = seleccionada === ie.institucionId;

        return (
          <CircleMarker
            key={ie.institucionId}
            center={[ie.latitud, ie.longitud]}
            radius={activa ? 8 : 5}
            pathOptions={{
              fillColor: estado.color,
              fillOpacity: 0.95,
              color: activa ? '#4338ca' : 'white',
              weight: activa ? 3 : 1.5,
            }}
            eventHandlers={
              onSeleccionar ? { click: () => onSeleccionar(ie.institucionId) } : undefined
            }
          >
            {!onSeleccionar && (
              <Popup>
                <div className="text-xs space-y-1">
                  <div className="font-bold text-foreground">{ie.nombre}</div>
                  <div className="flex items-center gap-2 text-text-muted">
                    <span>{ie.distrito}</span>
                    <span>·</span>
                    <span className="font-medium text-foreground">{ie.nivelEducativo}</span>
                  </div>
                  <div style={{ color: estado.color }} className="font-semibold pt-1">
                    {estado.label}
                  </div>
                </div>
              </Popup>
            )}
          </CircleMarker>
        );
      })}
    </Pane>
  );
};
