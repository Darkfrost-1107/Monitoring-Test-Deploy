import { useState, useEffect, useMemo } from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { PageHeader } from '@shared/ui/pageHeader';
import { Paginacion } from '@shared/ui/Paginacion';
import { paginar } from '@shared/lib/paginacion';
import { usePlanesMonitoreo } from '@features/planes-monitoreo/planes-monitoreo-service';
import { puedeGestionarPlan } from '@features/planes-monitoreo/lib/permisos-plan';
import { useFormularioPlan } from '@features/planes-monitoreo/hooks/use-formulario-plan';
import { useUser } from '@entities/model-user';
import { useScope } from '@shared/auth';
import {
  FiltrosPlanes,
  SelectorDeVista,
  CargandoPlanes,
  SinPlanes,
} from '@widgets/planes-monitoreo/ui/FiltrosPlanes';
import {
  FILTROS_DE_PLANES_VACIOS,
  type FiltrosDePlanes,
  type ModoDeVista,
} from '@features/planes-monitoreo/lib/vista-planes';
import { TarjetaPlan } from '@widgets/planes-monitoreo/ui/TarjetaPlan';
import { FilaPlan } from '@widgets/planes-monitoreo/ui/FilaPlan';
import { ModalSubirPlan } from '@widgets/planes-monitoreo/ui/ModalSubirPlan';
import {
  ModalCambiarEstadoPlan,
  ModalEliminarPlan,
} from '@widgets/planes-monitoreo/ui/ModalesDePlan';

/**
 * Repositorio de planes de monitoreo en PDF.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Tenía 770 líneas: los filtros, dos vistas del
 * mismo listado con las acciones copiadas palabra por palabra, la paginación
 * escrita a mano, el formulario de subida con su validación y tres modales.
 */

// Años generados desde el actual en adelante, para no depender de una lista
// fija que quede desactualizada cada año nuevo.
const OPCIONES_ANIO = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map(
  (a) => ({ value: String(a), label: String(a) }),
);

const POR_PAGINA = 6;

export const PlanMonitoreoAnualPage = () => {
  const { user } = useUser();
  // Personal del lado de la institución educativa: su plan por defecto es el de
  // la I.E., no el de la UGEL.
  const { isInstitution } = useScope();
  const entidadPorDefecto: 'UGEL' | 'IE' = isInstitution ? 'IE' : 'UGEL';

  const {
    planes,
    loading,
    error,
    actionLoading,
    fetchPlanes,
    uploadPlan,
    toggleEstado,
    hardDeletePlan,
    viewPlanPdf,
  } = usePlanesMonitoreo();

  const [modoDeVista, setModoDeVista] = useState<ModoDeVista>('grid');
  const [filtros, setFiltros] = useState<FiltrosDePlanes>(FILTROS_DE_PLANES_VACIOS);
  const [pagina, setPagina] = useState(1);

  const [planACambiarEstado, setPlanACambiarEstado] = useState<string | null>(null);
  const [planAEliminar, setPlanAEliminar] = useState<string | null>(null);
  const [errorDeEstado, setErrorDeEstado] = useState<string | null>(null);
  const [errorDeEliminacion, setErrorDeEliminacion] = useState<string | null>(null);

  const formulario = useFormularioPlan({ entidad: entidadPorDefecto, onEnviar: uploadPlan });

  const filtrosDeConsulta = useMemo(
    () => ({
      search: filtros.busqueda.trim() || undefined,
      anioAcademico: filtros.anio !== 'Todos' ? Number(filtros.anio) : undefined,
      tipoEntidad: entidadPorDefecto,
      estado: filtros.estado !== 'Todos' ? filtros.estado : undefined,
    }),
    [filtros, entidadPorDefecto],
  );

  useEffect(() => {
    fetchPlanes(filtrosDeConsulta);
  }, [fetchPlanes, filtrosDeConsulta]);

  const cambiarFiltros = (cambio: Partial<FiltrosDePlanes>) => {
    setFiltros((previos) => ({ ...previos, ...cambio }));
    setPagina(1);
  };

  // `paginar` acota la página al total disponible: al eliminar el último
  // elemento de la última página, antes quedaba apuntando a una que ya no
  // existe y el listado aparecía vacío.
  const paginado = useMemo(() => paginar(planes, pagina, POR_PAGINA), [planes, pagina]);

  const planACambiar = planes.find((p) => p.id === planACambiarEstado);

  const confirmarCambioDeEstado = async () => {
    if (!planACambiarEstado) return;
    setErrorDeEstado(null);

    const resultado = await toggleEstado(planACambiarEstado);
    if (resultado.success) setPlanACambiarEstado(null);
    else setErrorDeEstado(resultado.error || 'Error al cambiar estado.');
  };

  const confirmarEliminacion = async () => {
    if (!planAEliminar) return;
    setErrorDeEliminacion(null);

    const resultado = await hardDeletePlan(planAEliminar);
    if (resultado.success) setPlanAEliminar(null);
    else setErrorDeEliminacion(resultado.error || 'Error al eliminar plan.');
  };

  const accionesSobre = (id: string, tipoEntidad: string) => ({
    puedeGestionar: puedeGestionarPlan({ tipoEntidad }, user),
    ocupado: actionLoading,
    onVer: () => viewPlanPdf(id),
    onCambiarEstado: () => {
      setErrorDeEstado(null);
      setPlanACambiarEstado(id);
    },
    onEliminar: () => {
      setErrorDeEliminacion(null);
      setPlanAEliminar(id);
    },
  });

  return (
    <div className="flex flex-col w-full gap-6 animate-in fade-in-0 duration-300">
      <PageHeader
        title="Gestión de Plan de Monitoreo"
        description="Repositorio centralizado de planes de monitoreo en formato PDF. Revise el historial y el estado actual de las planificaciones."
        action={
          <Button
            onClick={formulario.abrir}
            className="flex items-center gap-2 font-bold cursor-pointer bg-primary hover:bg-primary/90 text-white transition-colors"
          >
            <PlusCircle className="w-[18px] h-[18px]" strokeWidth={2} />
            Registrar Plan de Monitoreo
          </Button>
        }
      />

      <FiltrosPlanes filtros={filtros} onCambiar={cambiarFiltros} opcionesAnio={OPCIONES_ANIO} />

      {loading ? (
        <CargandoPlanes />
      ) : planes.length === 0 ? (
        <SinPlanes />
      ) : (
        <>
          <SelectorDeVista modo={modoDeVista} onCambiar={setModoDeVista} />

          {modoDeVista === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in-50 duration-200">
              {paginado.elementos.map((plan) => (
                <TarjetaPlan
                  key={plan.id}
                  plan={plan}
                  {...accionesSobre(plan.id, plan.tipoEntidad)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3.5 animate-in fade-in-50 duration-200">
              {paginado.elementos.map((plan) => (
                <FilaPlan key={plan.id} plan={plan} {...accionesSobre(plan.id, plan.tipoEntidad)} />
              ))}
            </div>
          )}

          <Paginacion
            paginaActual={paginado.paginaActual}
            totalPaginas={paginado.totalPaginas}
            rango={paginado.rango}
            onCambiarPagina={setPagina}
          />
        </>
      )}

      {formulario.abierto && (
        <ModalSubirPlan
          titulo={formulario.titulo}
          onTituloChange={formulario.setTitulo}
          anio={formulario.anio}
          onAnioChange={formulario.setAnio}
          opcionesAnio={OPCIONES_ANIO}
          entidad={entidadPorDefecto}
          estado={formulario.estado}
          onEstadoChange={formulario.setEstado}
          archivo={formulario.archivo}
          onArchivoChange={formulario.elegirArchivo}
          intentoDeEnvio={formulario.intentoDeEnvio}
          error={formulario.error || error}
          guardando={actionLoading}
          onEnviar={formulario.enviar}
          onCerrar={formulario.cerrar}
        />
      )}

      {planACambiarEstado && (
        <ModalCambiarEstadoPlan
          reactivando={planACambiar?.estado === 'Inactivo'}
          procesando={actionLoading}
          error={errorDeEstado}
          onConfirmar={confirmarCambioDeEstado}
          onCancelar={() => setPlanACambiarEstado(null)}
        />
      )}

      {planAEliminar && (
        <ModalEliminarPlan
          procesando={actionLoading}
          error={errorDeEliminacion}
          onConfirmar={confirmarEliminacion}
          onCancelar={() => setPlanAEliminar(null)}
        />
      )}
    </div>
  );
};
