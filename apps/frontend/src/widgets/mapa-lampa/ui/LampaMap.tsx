import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Polygon, useMap } from 'react-leaflet';
import type { Layer, PathOptions } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card } from '@shared/ui/card';
import { useUser } from '@entities/model-user';
import { normDistrito } from '@shared/lib/distrito';
import {
  RoleCode,
  type IUgelDashboardDistrito,
  type IUgelDashboardIeMapa,
} from '@sistema-monitoreo/shared-contracts';
import {
  LAMPA_BOUNDS,
  MASCARA,
  DISTRITOS_GEOJSON,
  boundsDeDistrito,
  nombreDeDistrito,
  type DistritoFeature,
} from '../lib/geografia-lampa';
import {
  MODO_DISTRITAL,
  MODO_INSTITUCIONAL,
  SIN_FILTRO_DE_NIVEL,
  TODOS,
  colorDeCobertura,
  coberturaSegunFiltro,
  conteoPorDistrito,
  conteoPorEstado,
  extraerDistritos,
  firmaDeCobertura,
  institucionesVisibles,
  modalidadesDisponibles,
  nivelesDelFiltro,
  type FiltroDeNivel,
} from '../lib/vista-del-mapa';
import { CabeceraDelMapa } from './CabeceraDelMapa';
import { LeyendaDeCobertura, FiltrosDelMapa } from './LeyendaDelMapa';
import { MarcadoresDeInstituciones } from './MarcadoresDeInstituciones';

/**
 * Mapa georreferencial de la provincia de Lampa.
 *
 * Eran 358 líneas donde convivían la geometría de la provincia, los umbrales
 * del coroplético, los filtros, la leyenda y los marcadores. Vivía además en
 * `pages/directorUgel/components/` y lo importaba otra página cruzando la
 * frontera; por eso ahora es un widget.
 */

/** Recentra el mapa al distrito seleccionado, o a toda la provincia si no hay. */
const VistaDelMapa = ({ distrito }: { distrito?: string | null }) => {
  const map = useMap();

  useEffect(() => {
    const bounds = distrito ? boundsDeDistrito(distrito) : null;
    map.fitBounds(bounds ? bounds.pad(0.15) : LAMPA_BOUNDS);
  }, [distrito, map]);

  return null;
};

interface LampaMapProps {
  coberturaPorDistrito: IUgelDashboardDistrito[];
  instituciones: IUgelDashboardIeMapa[];
  selected?: string | null;
  onSelectDistrito?: (distrito: string | null) => void;
  /** Si se provee, al pulsar un punto se selecciona la IE en vez de abrir el globo. */
  onSelectInstitucion?: (institucionId: string) => void;
  /** IE seleccionada actualmente, para resaltar su marcador. */
  selectedInstitucionId?: string | null;
  /**
   * Avisa qué modalidad y nivel quedaron filtrados.
   *
   * El filtro vivía sólo acá adentro, de modo que elegir «Secundaria» acotaba el
   * mapa y dejaba intacta la lista de al lado: dos vistas del mismo recorte
   * mostrando cosas distintas.
   */
  onFiltroDeNivelChange?: (filtro: FiltroDeNivel) => void;
}

export const LampaMap = ({
  coberturaPorDistrito,
  instituciones,
  selected,
  onSelectDistrito,
  onSelectInstitucion,
  selectedInstitucionId,
  onFiltroDeNivelChange,
}: LampaMapProps) => {
  const { user } = useUser();

  // El Director UGEL supervisa a nivel distrital; el resto de roles trabaja el
  // detalle por institución.
  const modo =
    user?.role === RoleCode.DIRECTOR_UGEL ? MODO_DISTRITAL : MODO_INSTITUCIONAL;

  const [filtroDeNivel, setFiltroDeNivelInterno] = useState<FiltroDeNivel>(SIN_FILTRO_DE_NIVEL);
  const cambiarFiltroDeNivel = (siguiente: FiltroDeNivel) => {
    setFiltroDeNivelInterno(siguiente);
    onFiltroDeNivelChange?.(siguiente);
  };
  // Cambiar de modalidad descarta el nivel: «Inicial» de EBR no es el de EBA.
  const elegirModalidad = (modalidad: string) =>
    cambiarFiltroDeNivel({ modalidad, nivel: TODOS });
  const elegirNivel = (nivel: string) => cambiarFiltroDeNivel({ ...filtroDeNivel, nivel });
  const [estado, setEstado] = useState<string>(TODOS);

  // Quien ve toda la provincia recibe las modalidades y niveles completos del
  // dominio (EBE = CEBE y PRITE aunque hoy sólo haya CEBE); el resto, sólo lo
  // que tiene, para no ofrecerle botones que dejan el mapa vacío.
  const veTodaLaProvincia =
    user?.role === RoleCode.DIRECTOR_UGEL || user?.role === RoleCode.JEFE_GESTION;

  const modalidades = useMemo(
    () => modalidadesDisponibles(instituciones, { delDominio: veTodaLaProvincia }),
    [instituciones, veTodaLaProvincia],
  );
  const niveles = useMemo(
    () =>
      nivelesDelFiltro(instituciones, filtroDeNivel.modalidad, { delDominio: veTodaLaProvincia }),
    [instituciones, filtroDeNivel.modalidad, veTodaLaProvincia],
  );

  // En la vista distrital el filtro repinta los distritos, no sólo los puntos:
  // elegir «EBA» y seguir viendo los colores de toda la provincia engañaría.
  const coberturaFiltrada = useMemo(
    () => coberturaSegunFiltro(coberturaPorDistrito, filtroDeNivel),
    [coberturaPorDistrito, filtroDeNivel],
  );

  const listaDistritos = useMemo(
    () => extraerDistritos(instituciones, coberturaPorDistrito),
    [instituciones, coberturaPorDistrito],
  );

  // Los conteos de la leyenda siguen el filtro por modalidad y nivel: con EBA
  // elegida se ven 4 puntos y la leyenda no puede seguir diciendo 223.
  const conteoDeDistritos = useMemo(
    () =>
      conteoPorDistrito(instituciones, {
        modalidad: filtroDeNivel.modalidad,
        nivel: filtroDeNivel.nivel,
      }),
    [instituciones, filtroDeNivel],
  );

  const conteoDeEstados = useMemo(
    () =>
      conteoPorEstado(instituciones, {
        distrito: selected,
        modalidad: filtroDeNivel.modalidad,
        nivel: filtroDeNivel.nivel,
      }),
    [instituciones, selected, filtroDeNivel],
  );

  const porDistrito = useMemo(
    () => new Map(coberturaFiltrada.map((d) => [normDistrito(d.distrito), d])),
    [coberturaFiltrada],
  );
  const seleccionado = selected ? normDistrito(selected) : null;

  const visibles = useMemo(
    () =>
      institucionesVisibles(instituciones, {
        distrito: selected,
        modalidad: filtroDeNivel.modalidad,
        nivel: filtroDeNivel.nivel,
        estado,
      }),
    [instituciones, selected, filtroDeNivel, estado],
  );

  const estiloDeDistrito = (feature?: DistritoFeature): PathOptions => {
    const nombre = normDistrito(nombreDeDistrito(feature));
    const datos = porDistrito.get(nombre);
    const activo = seleccionado === nombre;

    if (modo === MODO_DISTRITAL) {
      return {
        fillColor: colorDeCobertura(datos?.porcentajeCobertura ?? null),
        fillOpacity: activo ? 0.75 : 0.45,
        color: activo ? '#1e1b4b' : '#334155',
        weight: activo ? 2.5 : 1,
      };
    }

    return {
      fillColor: activo ? '#6366f1' : '#cbd5e1',
      fillOpacity: activo ? 0.35 : 0.15,
      color: activo ? '#4338ca' : '#94a3b8',
      weight: activo ? 2.5 : 1,
    };
  };

  const prepararDistrito = (feature: DistritoFeature, capa: Layer) => {
    const nombre = nombreDeDistrito(feature);
    const datos = porDistrito.get(normDistrito(nombre));
    const cobertura = datos
      ? `${datos.porcentajeCobertura}% (${datos.monitoreadas}/${datos.totalInstituciones} II.EE.)`
      : 'sin datos';

    capa.bindTooltip(`<b>${nombre}</b><br/>Cobertura: ${cobertura}`, { sticky: true });
    // Pulsar el distrito ya seleccionado lo deselecciona.
    capa.on('click', () =>
      onSelectDistrito?.(seleccionado === normDistrito(nombre) ? null : nombre),
    );
  };

  return (
    <Card className="h-full flex flex-col relative overflow-hidden border-border shadow-xs">
      <CabeceraDelMapa
        modo={modo}
        totalDistritos={coberturaPorDistrito.length}
        visibles={visibles.length}
        totalInstituciones={instituciones.length}
        distritoSeleccionado={selected}
        onLimpiarDistrito={() => onSelectDistrito?.(null)}
        modalidades={modalidades}
        niveles={niveles}
        filtro={filtroDeNivel}
        onCambiarModalidad={elegirModalidad}
        onCambiarNivel={elegirNivel}
      />

      <div className="flex-1 w-full bg-muted/20 relative z-0 h-[420px] md:h-auto">
        <MapContainer
          bounds={LAMPA_BOUNDS}
          maxBounds={LAMPA_BOUNDS.pad(0.15)}
          maxBoundsViscosity={1}
          minZoom={9}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
        >
          <VistaDelMapa distrito={selected} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          {/* Oculta todo lo que queda fuera de la provincia. */}
          <Polygon
            positions={MASCARA}
            pathOptions={{ fillColor: '#eef1f5', fillOpacity: 1, stroke: false, interactive: false }}
          />
          {/* La firma de cobertura entra en la clave porque `onEachFeature` corre
              una sola vez: sin ella los tooltips se quedan con los porcentajes
              del primer render mientras los colores sí se actualizan. */}
          <GeoJSON
            key={`${seleccionado ?? 'ninguno'}-${modo}-${firmaDeCobertura(coberturaFiltrada)}`}
            data={DISTRITOS_GEOJSON}
            style={estiloDeDistrito as never}
            onEachFeature={prepararDistrito}
          />
          <MarcadoresDeInstituciones
            instituciones={visibles}
            seleccionada={selectedInstitucionId}
            onSeleccionar={onSelectInstitucion}
          />
        </MapContainer>

        {modo === MODO_DISTRITAL ? (
          <LeyendaDeCobertura />
        ) : (
          <FiltrosDelMapa
            estado={estado}
            onCambiarEstado={setEstado}
            distrito={selected ?? null}
            distritos={listaDistritos}
            onCambiarDistrito={(d) => onSelectDistrito?.(d)}
            conteoPorEstado={conteoDeEstados}
            conteoPorDistrito={conteoDeDistritos}
          />
        )}
      </div>
    </Card>
  );
};
