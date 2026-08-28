import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spinner } from '@shared/ui/Spinner';
import { type Plantilla } from '@entities/model-plantillas';
import { useUser } from '@entities/model-user';
import { useScope } from '@shared/auth';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';
import { usePlantillasList } from '@entities/model-plantillas/use-plantillas-api';
import { useCuposDePlantilla } from '@features/solicitudes-plantilla';
import { plantillasVisibles, type FiltroDeOrigen } from '@features/plantillas/lib/visibilidad-plantillas';
import {
  FILTROS_VACIOS,
  aniosDisponibles,
  filtrarPlantillas,
  type FiltrosDePlantillas,
} from '@features/plantillas/lib/filtros-plantillas';
import {
  puedeClonarLaDelDirector,
  puedeCopiarParaSuInstitucion,
  puedeGestionar,
} from '@features/plantillas/lib/permisos-plantilla';
import { useAccionesPlantilla } from '@features/plantillas/hooks/use-acciones-plantilla';
import { PlantillaPreviewModal } from './PlantillaPreviewModal';
import { FiltrosPlantillas } from './catalogo/FiltrosPlantillas';
import { TarjetaPlantilla } from './catalogo/TarjetaPlantilla';
import { ModalClonarPlantilla } from './catalogo/ModalClonarPlantilla';
import { ModalCambiarEstado } from './catalogo/ModalCambiarEstado';
import { ModalEliminarPlantilla } from './catalogo/ModalEliminarPlantilla';
import { AvisoDeAccion, CatalogoVacio, ErrorDeCarga } from './catalogo/AvisosCatalogo';
import type { EstadoDePlantilla } from '@features/plantillas/lib/estado-plantilla';

/**
 * Catálogo de plantillas de monitoreo.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Tenía 695 líneas: las reglas de visibilidad
 * por rol, los filtros, el ciclo de estados —escrito dos veces—, los permisos
 * de cada tarjeta, tres modales y nueve `useState`, todo en un solo archivo.
 * Cada pieza vive ahora donde se puede probar; acá queda el armado.
 */

interface PlantillasCatalogProps {
  /** Cuando se muestra dentro de la ficha de una institución, acota a la suya. */
  institucionId?: string;
}

export const PlantillasCatalog = ({ institucionId }: PlantillasCatalogProps = {}) => {
  const navigate = useNavigate();
  const { user } = useUser();
  const alcance = useScope();
  const [searchParams] = useSearchParams();

  const { data: plantillas = [], isLoading, isError, error, refetch } = usePlantillasList({
    institucionId,
  });

  const acciones = useAccionesPlantilla(plantillas);

  const [filtros, setFiltros] = useState<FiltrosDePlantillas>(FILTROS_VACIOS);
  const [enPrevisualizacion, setEnPrevisualizacion] = useState<Plantilla | null>(null);

  const visibles = useMemo(
    () =>
      plantillasVisibles(plantillas, user, alcance, {
        institucionId,
        filtroUrl: searchParams.get('filtro') as FiltroDeOrigen,
      }),
    [plantillas, user, alcance, institucionId, searchParams],
  );

  const anios = useMemo(() => aniosDisponibles(visibles), [visibles]);
  const filtradas = useMemo(() => filtrarPlantillas(visibles, filtros), [visibles, filtros]);

  const esDirector = user?.role === RoleCode.DIRECTOR_INSTITUCION;

  /**
   * Autorizaciones aprobadas y sin usar de esta persona.
   *
   * Copiar la ficha oficial sólo tiene sentido para materializar una plantilla
   * que la Jefatura aprobó: el catálogo de la UGEL ya se usa tal cual para
   * monitorear. Sin esto, el botón se ofrecía siempre y el servidor lo
   * rechazaba con un 403.
   */
  const { data: cuposLibres = [] } = useCuposDePlantilla(new Date().getFullYear());

  return (
    <div className="flex flex-col w-full gap-6 animate-in fade-in duration-300">
      <FiltrosPlantillas
        filtros={filtros}
        onCambiar={(cambio) => setFiltros((previos) => ({ ...previos, ...cambio }))}
        onLimpiar={() => setFiltros(FILTROS_VACIOS)}
        onRecargar={() => refetch()}
        anios={anios}
        mostrarTipo={!institucionId && !esDirector}
      />

      {isError && <ErrorDeCarga error={error} onReintentar={() => refetch()} />}

      {acciones.aviso && (
        <AvisoDeAccion
          mensaje={acciones.aviso.mensaje}
          tono={acciones.aviso.tono}
          onCerrar={acciones.limpiarAviso}
        />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner />
          <span className="ml-3 text-sm text-text-muted">Cargando plantillas...</span>
        </div>
      ) : !isError && filtradas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtradas.map((plantilla) => (
            <TarjetaPlantilla
              key={plantilla.id}
              plantilla={plantilla}
              puedeCopiarParaSuIE={puedeCopiarParaSuInstitucion(plantilla, user, cuposLibres)}
              puedeGestionar={puedeGestionar(plantilla, user, alcance)}
              puedeClonarLaDelDirector={puedeClonarLaDelDirector(plantilla, user, alcance)}
              clonando={acciones.clonar.enCurso}
              cambiandoEstado={acciones.estado.enCurso}
              onVerEstructura={() => setEnPrevisualizacion(plantilla)}
              onEditar={() => navigate(`/plantillas/${plantilla.id}/editar`)}
              onClonar={() => acciones.clonar.abrir(plantilla)}
              onCambiarEstado={() => acciones.estado.abrir(plantilla)}
              onEliminar={() => acciones.eliminar.abrir(plantilla)}
            />
          ))}
        </div>
      ) : (
        !isError && <CatalogoVacio />
      )}

      {enPrevisualizacion && (
        <PlantillaPreviewModal
          plantilla={enPrevisualizacion}
          onClose={() => setEnPrevisualizacion(null)}
        />
      )}

      {acciones.clonar.objetivo && (
        <ModalClonarPlantilla
          anio={acciones.clonar.anio}
          onAnioChange={acciones.clonar.setAnio}
          onConfirmar={acciones.clonar.confirmar}
          onCancelar={acciones.clonar.cerrar}
          error={acciones.clonar.error}
        />
      )}

      {acciones.estado.objetivo && (
        <ModalCambiarEstado
          nombre={`${acciones.estado.objetivo.tipoMonitoreo} ${acciones.estado.objetivo.anioAcademico}`}
          estado={acciones.estado.objetivo.estado as EstadoDePlantilla}
          onConfirmar={acciones.estado.confirmar}
          onCancelar={acciones.estado.cerrar}
          error={acciones.estado.error}
        />
      )}

      {acciones.eliminar.abierto && (
        <ModalEliminarPlantilla
          nombre={`${acciones.eliminar.objetivo?.tipoMonitoreo ?? ''} ${acciones.eliminar.objetivo?.anioAcademico ?? ''}`.trim()}
          fichasAsociadas={acciones.eliminar.fichasAsociadas}
          cargandoInfo={acciones.eliminar.cargandoInfo}
          esDestructivo={acciones.eliminar.esDestructivo}
          eliminando={acciones.eliminar.enCurso}
          onConfirmar={acciones.eliminar.confirmar}
          onCancelar={acciones.eliminar.cerrar}
          error={acciones.eliminar.error}
        />
      )}
    </div>
  );
};
