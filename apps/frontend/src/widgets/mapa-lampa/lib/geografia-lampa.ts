import L from 'leaflet';
import lampaDistritos from '@shared/assets/lampa-distritos.geojson.json';
import { normDistrito } from '@shared/lib/distrito';

/**
 * La provincia de Lampa según su GeoJSON: encuadre, máscara y polígonos.
 *
 * Todo esto se calcula una sola vez, al cargar el módulo, porque el archivo no
 * cambia en tiempo de ejecución. Vivía suelto en la cabecera de `LampaMap`,
 * mezclado con la lógica de la vista.
 */

/** Forma mínima de una feature del GeoJSON de distritos. */
export interface DistritoFeature {
  properties?: { distrito?: string } | null;
}

interface ColeccionDeDistritos {
  features: {
    properties?: { distrito?: string } | null;
    geometry: { type: string; coordinates: number[][][] | number[][][][] };
  }[];
}

const COLECCION = lampaDistritos as unknown as ColeccionDeDistritos;

/** El GeoJSON crudo, tal como lo consume `react-leaflet`. */
export const DISTRITOS_GEOJSON = lampaDistritos as never;

/** Límites de la provincia, para encuadrar y acotar el mapa. */
export const LAMPA_BOUNDS = L.geoJSON(DISTRITOS_GEOJSON).getBounds();

/** Rectángulo que cubre el mundo entero; es el contorno exterior de la máscara. */
const MUNDO: [number, number][] = [
  [-85, -180],
  [-85, 180],
  [85, 180],
  [85, -180],
];

/**
 * Contorno exterior de cada distrito, en el orden [lat, lng] que usa Leaflet.
 *
 * El GeoJSON los guarda al revés, [lng, lat], que es el orden del estándar.
 */
function anillosDeLampa(): [number, number][][] {
  const anillos: [number, number][][] = [];

  for (const feature of COLECCION.features) {
    const { type, coordinates } = feature.geometry;

    if (type === 'Polygon') {
      anillos.push((coordinates as number[][][])[0].map(([lng, lat]) => [lat, lng]));
    } else if (type === 'MultiPolygon') {
      for (const poligono of coordinates as number[][][][]) {
        anillos.push(poligono[0].map(([lng, lat]) => [lat, lng]));
      }
    }
  }

  return anillos;
}

/**
 * Rectángulo del mundo con un agujero por distrito.
 *
 * Pintado encima del mapa base, deja visible sólo la provincia: es más barato
 * que recortar los tiles y no depende del proveedor de mapas.
 */
export const MASCARA: [number, number][][] = [MUNDO, ...anillosDeLampa()];

/** Límites del distrito indicado, o nulo si el GeoJSON no lo tiene. */
export function boundsDeDistrito(distrito: string): L.LatLngBounds | null {
  const buscado = normDistrito(distrito);
  const features = COLECCION.features.filter(
    (f) => normDistrito(String(f.properties?.distrito ?? '')) === buscado,
  );

  if (features.length === 0) return null;
  return L.geoJSON({ type: 'FeatureCollection', features } as never).getBounds();
}

/** Nombre del distrito de una feature, tal como se muestra. */
export const nombreDeDistrito = (feature?: DistritoFeature): string =>
  String(feature?.properties?.distrito ?? '');
