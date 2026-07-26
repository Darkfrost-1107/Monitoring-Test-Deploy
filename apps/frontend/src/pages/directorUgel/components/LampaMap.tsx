import { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Popup,
  Polygon,
  Pane,
  useMap,
} from 'react-leaflet';
import L, { type Layer, type PathOptions } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card } from '@shared/ui/card';
import { useUser } from '@entities/model-user';
import lampaDistritos from '@shared/assets/lampa-distritos.geojson.json';
import type {
  IUgelDashboardDistrito,
  IUgelDashboardIeMapa,
} from '@sistema-monitoreo/shared-contracts';
import { normDistrito } from '../utils/norm-distrito';

/** Forma mínima de una feature del GeoJSON de distritos. */
interface DistritoFeature {
  properties?: { distrito?: string } | null;
}

/** Límites geográficos de la provincia de Lampa (para encuadrar y acotar el mapa). */
const LAMPA_BOUNDS = L.geoJSON(lampaDistritos as never).getBounds();

// Máscara: rectángulo "mundo" con agujeros con la forma de cada distrito, para
// pintar todo lo que está FUERA de Lampa y dejar visible solo la provincia.
const MUNDO: [number, number][] = [
  [-85, -180],
  [-85, 180],
  [85, 180],
  [85, -180],
];
function anillosDeLampa(): [number, number][][] {
  const col = lampaDistritos as unknown as {
    features: { geometry: { type: string; coordinates: number[][][] | number[][][][] } }[];
  };
  const anillos: [number, number][][] = [];
  for (const f of col.features) {
    const g = f.geometry;
    if (g.type === 'Polygon') {
      anillos.push((g.coordinates as number[][][])[0].map(([lng, lat]) => [lat, lng]));
    } else if (g.type === 'MultiPolygon') {
      for (const poly of g.coordinates as number[][][][]) {
        anillos.push(poly[0].map(([lng, lat]) => [lat, lng]));
      }
    }
  }
  return anillos;
}
const MASCARA: [number, number][][] = [MUNDO, ...anillosDeLampa()];

/** Bounds del polígono de un distrito (para centrar el mapa al filtrarlo). */
function boundsDistrito(sel: string): L.LatLngBounds | null {
  const col = lampaDistritos as unknown as { features: { properties?: { distrito?: string } }[] };
  const feats = col.features.filter(
    (f) => normDistrito(String(f.properties?.distrito ?? '')) === normDistrito(sel),
  );
  if (feats.length === 0) return null;
  return L.geoJSON({ type: 'FeatureCollection', features: feats } as never).getBounds();
}

/** Recentra el mapa al distrito seleccionado (o a toda Lampa si no hay). */
function VistaMapa({ selected }: { selected?: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (selected) {
      const b = boundsDistrito(selected);
      if (b) {
        map.fitBounds(b.pad(0.15));
        return;
      }
    }
    map.fitBounds(LAMPA_BOUNDS);
  }, [selected, map]);
  return null;
}

const ESTADO_UI: Record<string, { key: string; color: string; label: string }> = {
  critico: { key: 'critico', color: '#ef4444', label: 'Crítico' },
  enProceso: { key: 'enProceso', color: '#f59e0b', label: 'En proceso' },
  logroPrevisto: { key: 'logroPrevisto', color: '#22c55e', label: 'Logro previsto' },
  sinRegistro: { key: 'sinRegistro', color: '#94a3b8', label: 'Sin registro' },
};

/** Leyenda del coroplético distrital: refleja los umbrales de cobertura. */
const COBERTURA_LEYENDA = [
  { color: '#22c55e', label: 'Cobertura ≥ 75%' },
  { color: '#f59e0b', label: 'Cobertura 40–74%' },
  { color: '#ef4444', label: 'Cobertura < 40%' },
  { color: '#94a3b8', label: 'Sin registro' },
];

const NIVELES_EDUCATIVOS = ['Todos', 'Inicial', 'Primaria', 'Secundaria'];

interface LampaMapProps {
  coberturaPorDistrito: IUgelDashboardDistrito[];
  instituciones: IUgelDashboardIeMapa[];
  selected?: string | null;
  onSelectDistrito?: (distrito: string | null) => void;
  /** Si se provee, al hacer clic en un punto se selecciona la IE (en vez de mostrar el popup). */
  onSelectInstitucion?: (institucionId: string) => void;
  /** IE seleccionada actualmente (para resaltar su marcador). */
  selectedInstitucionId?: string | null;
}
export const LampaMap = ({
  coberturaPorDistrito,
  instituciones,
  selected,
  onSelectDistrito,
  onSelectInstitucion,
  selectedInstitucionId,
}: LampaMapProps) => {
  const { user } = useUser();
  const isDirectorUgel = user?.role === 'director_ugel';

  // El Director UGEL supervisa a nivel distrital (coroplético de cobertura); el
  // resto de roles (Jefe de Gestión/Área, Especialista) trabaja el detalle por IE.
  const viewMode: 'distrital' | 'institucional' = isDirectorUgel ? 'distrital' : 'institucional';
  const [nivelFilter, setNivelFilter] = useState<string>('Todos');
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');

  const porDistrito = new Map(coberturaPorDistrito.map((d) => [normDistrito(d.distrito), d]));
  const selNorm = selected ? normDistrito(selected) : null;

  // El filtro por nivel solo aporta si la data abarca más de un nivel (p. ej.
  // Jefe de Gestión). El especialista recibe solo IEs de su nivel → se oculta
  // para no ofrecer botones que dejarían el mapa vacío.
  const mostrarFiltroNivel = new Set(instituciones.map((ie) => ie.nivelEducativo)).size > 1;

  const marcadores = instituciones.filter((ie) => {
    if (selNorm && normDistrito(ie.distrito) !== selNorm) return false;
    if (nivelFilter !== 'Todos' && ie.nivelEducativo !== nivelFilter) return false;
    if (estadoFilter !== 'todos' && ie.estado !== estadoFilter) return false;
    return true;
  });

  // Los puntos de las IE se muestran siempre (ubicación). Al hacer clic abren el
  // detalle de la IE en el panel lateral —informativo también para el Director
  // UGEL—, siempre que el contenedor provea `onSelectInstitucion`.
  const marcadoresSeleccionables = !!onSelectInstitucion;

  const styleFeature = (feature?: DistritoFeature): PathOptions => {
    const nombreRaw = String(feature?.properties?.distrito ?? '');
    const nombre = normDistrito(nombreRaw);
    const data = porDistrito.get(nombre);
    const isSel = selNorm === nombre;

    if (viewMode === 'distrital') {
      let fillColor = '#94a3b8'; // Sin registro / por defecto
      if (data) {
        const cob = data.porcentajeCobertura;
        if (cob >= 75) fillColor = '#22c55e'; // Verde - Logro previsto
        else if (cob >= 40) fillColor = '#f59e0b'; // Amarillo - En proceso
        else fillColor = '#ef4444'; // Rojo - Crítico
      }
      return {
        fillColor,
        fillOpacity: isSel ? 0.75 : 0.45,
        color: isSel ? '#1e1b4b' : '#334155',
        weight: isSel ? 2.5 : 1,
      };
    }

    return {
      fillColor: isSel ? '#6366f1' : '#cbd5e1',
      fillOpacity: isSel ? 0.35 : 0.15,
      color: isSel ? '#4338ca' : '#94a3b8',
      weight: isSel ? 2.5 : 1,
    };
  };

  const onEach = (feature: DistritoFeature, layer: Layer) => {
    const nombreRaw = String(feature.properties?.distrito ?? '');
    const nombre = normDistrito(nombreRaw);
    const data = porDistrito.get(nombre);
    const cob = data
      ? `${data.porcentajeCobertura}% (${data.monitoreadas}/${data.totalInstituciones} II.EE.)`
      : 'sin datos';
    layer.bindTooltip(`<b>${nombreRaw}</b><br/>Cobertura: ${cob}`, { sticky: true });
    layer.on('click', () => onSelectDistrito?.(selNorm === nombre ? null : nombreRaw));
  };

  return (
    <Card className="h-full flex flex-col relative overflow-hidden border-border shadow-xs">
      {/* Header con título y barra de filtros avanzables */}
      <div className="p-4 flex flex-wrap gap-3 justify-between items-center border-b border-border bg-card z-10">
        <div>
          <h3 className="text-lg font-bold">Mapa Georreferencial - Lampa</h3>
          <p className="text-xs text-text-muted">
            {viewMode === 'distrital'
              ? `Vista Distrital Coroplética · ${coberturaPorDistrito.length} Distritos`
              : `Mostrando ${marcadores.length} de ${instituciones.length} II.EE.`}
            {selected && ` · Distrito: ${selected}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtros rápidos: Nivel Educativo */}
          {viewMode === 'institucional' && mostrarFiltroNivel && (
            <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-lg border border-border">
              {NIVELES_EDUCATIVOS.map((n) => (
                <button
                  key={n}
                  onClick={() => setNivelFilter(n)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    nivelFilter === n
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-text-muted hover:text-foreground'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}

          {selected && (
            <button
              className="text-xs font-bold text-primary hover:underline cursor-pointer"
              onClick={() => onSelectDistrito?.(null)}
            >
              Limpiar distrito ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 w-full bg-muted/20 relative z-0 h-[420px] md:h-auto">
        <MapContainer
          bounds={LAMPA_BOUNDS}
          maxBounds={LAMPA_BOUNDS.pad(0.15)}
          maxBoundsViscosity={1}
          minZoom={9}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
        >
          <VistaMapa selected={selected} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          {/* Máscara: oculta todo lo que está fuera de la provincia de Lampa. */}
          <Polygon
            positions={MASCARA}
            pathOptions={{ fillColor: '#eef1f5', fillOpacity: 1, stroke: false, interactive: false }}
          />
          <GeoJSON
            key={`${selNorm ?? 'none'}-${viewMode}`}
            data={lampaDistritos as never}
            style={styleFeature as never}
            onEachFeature={onEach}
          />
          {/* Marcadores de IE: siempre visibles para ubicar los colegios. */}
          {marcadores.length > 0 && (
            <Pane name="focos-markers" style={{ zIndex: 450 }}>
              {marcadores.map((ie) => {
                const ui = ESTADO_UI[ie.estado] ?? ESTADO_UI.sinRegistro;
                const isSelectedIe = selectedInstitucionId === ie.institucionId;
                return (
                  <CircleMarker
                    key={ie.institucionId}
                    center={[ie.latitud, ie.longitud]}
                    radius={isSelectedIe ? 8 : 5}
                    pathOptions={{
                      fillColor: ui.color,
                      fillOpacity: 0.95,
                      color: isSelectedIe ? '#4338ca' : 'white',
                      weight: isSelectedIe ? 3 : 1.5,
                    }}
                    eventHandlers={
                      marcadoresSeleccionables && onSelectInstitucion
                        ? { click: () => onSelectInstitucion(ie.institucionId) }
                        : undefined
                    }
                  >
                    {!marcadoresSeleccionables && (
                      <Popup>
                        <div className="text-xs space-y-1">
                          <div className="font-bold text-foreground">{ie.nombre}</div>
                          <div className="flex items-center gap-2 text-text-muted">
                            <span>{ie.distrito}</span>
                            <span>·</span>
                            <span className="font-medium text-foreground">{ie.nivelEducativo}</span>
                          </div>
                          <div style={{ color: ui.color }} className="font-semibold pt-1">
                            {ui.label}
                          </div>
                        </div>
                      </Popup>
                    )}
                  </CircleMarker>
                );
              })}
            </Pane>
          )}
        </MapContainer>

        {/* Leyenda: en distrital es estática (cobertura); en institucional es un
            filtro interactivo por estado de monitoreo de las IE. */}
        <Card className="absolute bottom-4 left-4 z-[400] p-3 shadow-md bg-card/95 backdrop-blur-sm border-border">
          {viewMode === 'distrital' ? (
            <>
              <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                Cobertura por Distrito
              </h4>
              <div className="space-y-1.5 text-xs font-medium">
                {COBERTURA_LEYENDA.map((s) => (
                  <div key={s.label} className="flex items-center gap-2 px-1.5 py-0.5 text-text-muted">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.label}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  Filtrar por Estado
                </h4>
                {estadoFilter !== 'todos' && (
                  <button
                    onClick={() => setEstadoFilter('todos')}
                    className="text-[10px] text-primary hover:underline font-bold"
                  >
                    Ver todos
                  </button>
                )}
              </div>
              <div className="space-y-1.5 text-xs font-medium">
                {Object.values(ESTADO_UI).map((s) => {
                  const active = estadoFilter === s.key;
                  return (
                    <button
                      key={s.key}
                      onClick={() => setEstadoFilter(active ? 'todos' : s.key)}
                      className={`flex items-center gap-2 w-full text-left px-1.5 py-0.5 rounded-md transition-colors ${active ? 'bg-muted font-bold text-foreground' : 'hover:bg-muted/50 text-text-muted'
                        }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      </div>
    </Card>
  );
};
