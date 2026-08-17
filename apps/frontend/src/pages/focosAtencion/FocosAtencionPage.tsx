import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUgelDashboard } from '@features/dashboard';
import { useUser } from '@entities/model-user';
import { PageHeader } from '@shared/ui/pageHeader';
import { Spinner } from '@shared/ui/Spinner';
import { LampaMap } from '@widgets/mapa-lampa';
import { RequierenAtencionCard } from '@/pages/directorUgel/components/RequierenAtencionCard';
import { RequierenAtencionInstitucionalCard } from './components/RequierenAtencionInstitucionalCard';
import { InstitucionDetalleCard } from './components/InstitucionDetalleCard';
import { normDistrito } from '@shared/lib/distrito';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';

/**
 * Vista de "Focos de Atención": reutiliza el mapa georreferencial del dashboard
 * UGEL y muestra las II.EE. con docentes/directivos en nivel crítico.
 * Para Director UGEL muestra el resumen distrital con colegios y promedios distritales.
 * Para Jefe de Gestión y otros muestra el detalle institucional/docente.
 */
export const FocosAtencionPage = () => {
  const { user } = useUser();
  const isDirectorUgel = user?.role === RoleCode.DIRECTOR_UGEL;

  const { data, isLoading, isError, error } = useUgelDashboard();
  const [searchParams, setSearchParams] = useSearchParams();

  const distrito = searchParams.get('distrito') || null;
  const institucionSel = searchParams.get('institucionId') || null;

  /**
   * Nivel educativo elegido en el mapa.
   *
   * El filtro acotaba sólo los puntos y dejaba la lista de al lado completa:
   * elegir «Secundaria» mostraba un mapa de secundaria junto a instituciones de
   * primaria. Las dos vistas son del mismo recorte y deben moverse juntas.
   */
  const [nivelFiltrado, setNivelFiltrado] = useState<string>('Todos');

  const handleSelectDistrito = (nuevoDistrito: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nuevoDistrito) {
        next.set('distrito', nuevoDistrito);
      } else {
        next.delete('distrito');
      }
      next.delete('institucionId');
      return next;
    });
  };

  const handleSelectInstitucion = (ieId: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (ieId) {
        next.set('institucionId', ieId);
      } else {
        next.delete('institucionId');
      }
      return next;
    });
  };

  const sel = distrito ? normDistrito(distrito) : null;
  const atencionDocente = sel
    ? (data?.requierenAtencion ?? []).filter((ie) => normDistrito(ie.distrito) === sel)
    : (data?.requierenAtencion ?? []);

  const atencionVisible =
    nivelFiltrado === 'Todos'
      ? atencionDocente
      : atencionDocente.filter(
          (ie) => ie.nivelEducativo?.toUpperCase() === nivelFiltrado.toUpperCase(),
        );

  const atencionDistrito = sel
    ? (data?.distritosCriticos ?? []).filter((d) => normDistrito(d.distrito) === sel)
    : (data?.distritosCriticos ?? []);

  return (
    <div className="flex flex-col gap-6 lg:h-full">
      <PageHeader
        title="Focos de Atención"
        description="Instituciones con docentes o directivos en nivel crítico. Notifica o solicita una visita de acompañamiento prioritaria."
      />

      {isLoading ? (
        <div className="w-full h-[40vh] flex flex-col justify-center items-center gap-3">
          <Spinner />
          <span className="text-text-muted text-sm font-medium">Cargando focos de atención…</span>
        </div>
      ) : isError ? (
        <div className="text-center py-10 text-danger font-medium">
          No se pudo cargar la información: {(error as Error)?.message ?? 'error desconocido'}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-1 gap-6 min-h-[440px] lg:min-h-0 lg:flex-1">
          <div className="lg:col-span-2">
            <LampaMap
              coberturaPorDistrito={data?.coberturaPorDistrito ?? []}
              instituciones={data?.institucionesMapa ?? []}
              selected={distrito}
              onSelectDistrito={handleSelectDistrito}
              onSelectInstitucion={handleSelectInstitucion}
              selectedInstitucionId={institucionSel}
              onNivelChange={setNivelFiltrado}
            />
          </div>
          <div className="lg:col-span-1">
            {institucionSel ? (
              <InstitucionDetalleCard
                institucionId={institucionSel}
                onBack={() => handleSelectInstitucion(null)}
              />
            ) : isDirectorUgel ? (
              <RequierenAtencionCard items={atencionDistrito} />
            ) : (
              <RequierenAtencionInstitucionalCard
                items={atencionVisible}
                distritoFiltrado={distrito}
                onLimpiarDistrito={() => handleSelectDistrito(null)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
