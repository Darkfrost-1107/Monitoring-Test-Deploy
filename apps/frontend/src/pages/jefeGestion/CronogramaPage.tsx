import { useState, useMemo } from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { useListadoCronogramas } from '@features/cronogramas/hooks/use-listado-cronogramas';
import { useProgramacionCronograma } from '@features/cronogramas/hooks/use-programacion-cronograma';
import { cronogramasVisibles } from '@features/cronogramas/lib/visibilidad';
import {
  colorDeIniciales,
  estiloDeEstado,
  estiloDeTipo,
  fechaYHoraDeTabla,
} from './cronograma/presentacion';
import { BarraFiltros } from './cronograma/BarraFiltros';
import { ModalCronograma } from './cronograma/ModalCronograma';
import { TablaCronogramas } from './cronograma/TablaCronogramas';
import { ModalDetalleCronograma } from './cronograma/ModalDetalleCronograma';
import { PageHeader } from '@shared/ui/pageHeader';
import { ConfirmModal } from '@shared/ui/ConfirmModal';
import { useUser } from '@entities/model-user';
import { useCronogramasData } from '@features/cronogramas/hooks/use-cronogramas-data';
import type { Cronograma } from '@entities/model-cronogramas';
import {
} from '@sistema-monitoreo/shared-contracts';
import { useScope } from '@shared/auth';

export const CronogramaPage = () => {
  const { user } = useUser();
  const { isInstitution, isMonitorCampo } = useScope();

  // Se llamaba `isDirector`, pero incluía al coordinador pedagógico y al jefe de
  // taller: es todo el personal del lado de la institución educativa. Se conserva
  // el identificador para no tocar sus 32 usos en este archivo; el nombre honesto
  // es el de la derecha.
  const isDirector = isInstitution;

  const isCoordOrTaller = isMonitorCampo && isInstitution;

  const {
    cronogramas,
    especialistas,
    instituciones,
    docentes,
    createCronograma,
    updateCronograma,
    deleteCronograma: deleteFromContext,
  } = useCronogramasData();

  // --- Estados de Filtro ---


  // Programar una visita: estado del formulario, cascada de opciones y
  // guardado. En `use-programacion-cronograma`.
  const programacion = useProgramacionCronograma({
    usuario: user,
    esDeInstitucion: isDirector,
    catalogos: { cronogramas, especialistas, instituciones, docentes },
    crear: createCronograma,
    actualizar: updateCronograma,
  });

  // --- Estados de Detalles / Ver ---
  const [viewCronograma, setViewCronograma] = useState<Cronograma | null>(null);

  // --- Estado de Eliminado / Desactivación ---
  const [deleteCronogramaId, setDeleteCronogramaId] = useState<string | null>(null);

  // Regla unica de visibilidad, compartida con CalendarioPage y con cobertura
  // en `features/cronogramas/lib/visibilidad.test.ts`.
  const filteredBaseCronogramas = useMemo(
    () => cronogramasVisibles(cronogramas, user),
    [cronogramas, user],
  );

  // Filtrado y paginacion del listado, en `use-listado-cronogramas`.
  const listado = useListadoCronogramas(filteredBaseCronogramas, isDirector);

  const uniqueInstituciones = useMemo(
    () => [...new Set(cronogramas.map((c) => c.institucion))].sort(),
    [cronogramas],
  );

  // --- Confirmar Eliminado ---
  const handleDeleteConfirm = () => {
    if (!deleteCronogramaId) return;
    deleteFromContext(deleteCronogramaId);
    setDeleteCronogramaId(null);
  };

  // --- Estilos de Badge ---
  return (
    <div className="flex flex-col w-full gap-6 animate-in fade-in-0 duration-300">
      {/* ── Cabecera ── */}
      <PageHeader
        title="Cronogramas de Monitoreo"
        description="Programación de visitas de monitoreo pedagógico y administrativo."
        action={
          <Button
            onClick={programacion.abrirCreacion}
            className="flex items-center gap-2 font-bold cursor-pointer bg-primary hover:bg-primary/90 text-white transition-colors"
          >
            <PlusCircle className="w-[18px] h-[18px]" strokeWidth={2} />
            Registrar cronograma
          </Button>
        }
      />

      <BarraFiltros
        filtros={listado.filtros}
        onCambiar={listado.cambiarFiltro}
        instituciones={uniqueInstituciones}
        esDirector={isDirector}
      />

      <TablaCronogramas
        cronogramas={listado.paginados}
        esDirector={isDirector}
        paginacion={{
          desde: listado.desde,
          hasta: listado.hasta,
          total: listado.filtrados.length,
          pagina: listado.pagina,
          totalPaginas: listado.totalPaginas,
          onPagina: listado.irAPagina,
        }}
        onVer={setViewCronograma}
        onEditar={programacion.abrirEdicion}
        onEliminar={setDeleteCronogramaId}
        formatearFechaHora={fechaYHoraDeTabla}
        colorDeIniciales={colorDeIniciales}
        estiloTipo={estiloDeTipo}
        estiloEstado={estiloDeEstado}
      />

      {programacion.abierto && (
        <ModalCronograma
          form={programacion.form}
          onCambiar={programacion.cambiar}
          opciones={programacion.opciones}
          perfil={{
            esDirector: isDirector,
            esSecundaria: programacion.esSecundaria,
            esCoordinadorOTaller: isCoordOrTaller,
          }}
          esEdicion={programacion.esEdicion}
          envio={programacion.envio}
          onEnviar={programacion.guardar}
          onCerrar={programacion.cerrar}
        />
      )}

      {viewCronograma && (
        <ModalDetalleCronograma
          cronograma={viewCronograma}
          esDirector={isDirector}
          onCerrar={() => setViewCronograma(null)}
          formatearFechaHora={fechaYHoraDeTabla}
          colorDeIniciales={colorDeIniciales}
          estiloTipo={estiloDeTipo}
          estiloEstado={estiloDeEstado}
        />
      )}

      {/* ── Modal de Confirmación para Eliminado ── */}
      {deleteCronogramaId && (
        <ConfirmModal
          title="¿Desea anular este cronograma?"
          message={
            <span>
              Esta acción marcará la visita como ANULADA. El número de visita quedará como evidencia de auditoría.
            </span>
          }
          confirmLabel="Anular Cronograma"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteCronogramaId(null)}
          danger
        />
      )}
    </div>
  );
};
