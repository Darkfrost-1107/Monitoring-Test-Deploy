import { useState, useMemo } from 'react';
import { Sparkles, X, Calendar } from 'lucide-react';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { useCronogramasData } from '@features/cronogramas/hooks/use-cronogramas-data';
import { puedeEvaluarVisita, type Cronograma } from '@entities/model-cronogramas';
import { useUser } from '@/entities/model-user';
import { useScope } from '@shared/auth';
import { puedeDecidirReprogramacion } from '@entities/model-reprogramaciones';
import { seleccionarPlantillaActiva } from '@/entities/model-plantillas';
import { usePlantillasList } from '@/entities/model-plantillas/use-plantillas-api';
import { claveDeHoy } from '@/shared/lib/calendario/grid';
import { useFichaPersistence } from '@/features/monitoreos/hooks/use-ficha-persistence';
import { LlenarFichaForm } from '@/features/monitoreos';
import {
  SolicitarReprogramacionForm,
  DecidirReprogramacionForm,
} from '@/features/reprogramaciones';
import { SelectorVisitasDelDia } from './sidebar/SelectorVisitasDelDia';
import { DetalleVisita } from './sidebar/DetalleVisita';
import { AccionesVisita } from './sidebar/AccionesVisita';
import { AvisoSolicitudPendiente } from './sidebar/AvisoSolicitudPendiente';
import { MigracionPlantillaFicha } from './sidebar/MigracionPlantillaFicha';

interface CalendarioSidebarProps {
  selectedVisitId: string | null;
  setSelectedVisitId: (id: string | null) => void;
  selectedDateStr: string;
  onClose: () => void;
  filteredVisits: Cronograma[];
}

/**
 * Panel de detalle de la visita seleccionada en el calendario.
 *
 * Contenedor: resuelve datos y estado, y compone los componentes de
 * presentación de `./sidebar`. Las reglas de negocio que antes vivían acá están
 * en `entities/` y `features/monitoreos/lib`, cada una con cobertura propia.
 */
export const CalendarioSidebar = ({
  selectedVisitId,
  setSelectedVisitId,
  selectedDateStr,
  onClose,
  filteredVisits,
}: CalendarioSidebarProps) => {
  const { user } = useUser();
  // Quien levanta la ficha en el aula. Se llamaba `isEspecialista`, pero incluía
  // también al coordinador pedagógico y al jefe de taller, que son personal de
  // institución: los une la tarea, no el ámbito.
  const { isMonitorCampo, isInstitution } = useScope();

  const {
    cronogramas,
    reprogramaciones,
    submitRescheduleRequest,
    approveRescheduleRequest,
    rejectRescheduleRequest,
    deleteCronograma,
  } = useCronogramasData();

  const [showFichaModal, setShowFichaModal] = useState(false);
  const [showSolicitarReprogramarModal, setShowSolicitarReprogramarModal] = useState(false);
  const [showReprogramarModal, setShowReprogramarModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showMigracionModal, setShowMigracionModal] = useState(false);
  const [migracionContext, setMigracionContext] = useState<{
    visitId: string;
    plantillaVigenteId: string | null;
    plantillaVigenteNombre: string;
  } | null>(null);

  // Ya vienen mapeadas al modelo Plantilla del frontend.
  const { data: plantillas = [] } = usePlantillasList();

  const selectedVisit = useMemo(
    () => (selectedVisitId ? (cronogramas.find((v) => v.id === selectedVisitId) ?? null) : null),
    [cronogramas, selectedVisitId],
  );

  const activeRequest = useMemo(
    () => (selectedVisit ? (reprogramaciones[selectedVisit.id] ?? null) : null),
    [reprogramaciones, selectedVisit],
  );

  // Regla única, compartida con `BandejaReprogramaciones` y con cobertura propia
  // en `entities/model-reprogramaciones/decision.test.ts`.
  const canDecide = useMemo(
    () => puedeDecidirReprogramacion(user, selectedVisit, activeRequest?.solicitanteRolAlCrear),
    [selectedVisit, user, activeRequest],
  );

  const visitsOnSelectedDate = useMemo(
    () => filteredVisits.filter((v) => v.fechaHora.substring(0, 10) === selectedDateStr),
    [filteredVisits, selectedDateStr],
  );

  // Reglas de negocio extraídas a `entities/`, con cobertura propia: qué
  // instrumento se aplica (`seleccion.test.ts`) y quién puede levantar la ficha
  // (`evaluador.test.ts`). Acá sólo queda el enlace con el estado del widget.
  const activeTemplate = useMemo(() => {
    if (!selectedVisit || !user) return null;
    return seleccionarPlantillaActiva(plantillas, {
      tipoVisita: selectedVisit.tipo,
      usuarioId: user.id,
      institucionUsuarioId: user.institucion,
      esInstitucion: isInstitution,
      esMonitorCampo: isMonitorCampo,
    });
  }, [selectedVisit, plantillas, user, isInstitution, isMonitorCampo]);

  const isEvaluadorAutorizado = useMemo(
    () => puedeEvaluarVisita(user, selectedVisit),
    [selectedVisit, user],
  );

  // ¿Hoy es el día programado? Restringe el inicio de la visita a su fecha.
  const isFechaCoincidente = useMemo(() => {
    if (!selectedVisit) return false;
    return claveDeHoy() === selectedVisit.fechaHora.substring(0, 10);
  }, [selectedVisit]);

  // Escritura del resultado del monitoreo. Vive en `use-ficha-persistence`
  // porque no es maquetación; acá sólo se enlazan sus efectos con los modales.
  const { guardarBorrador, finalizar, prepararFichaLlena } = useFichaPersistence({
    plantillaId: activeTemplate?.id,
    onPersistido: () => setShowFichaModal(false),
    onPlantillaVersionada: (contexto) => {
      // ILA-0046: la plantilla pasó a Histórico; se ofrece migrar.
      setMigracionContext(contexto);
      setShowMigracionModal(true);
    },
  });

  const abrirFichaLlena = async (visitId: string) => {
    await prepararFichaLlena(visitId);
    setShowFichaModal(true);
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirmId) return;
    deleteCronograma(deleteConfirmId);
    setDeleteConfirmId(null);
    setSelectedVisitId(null);
  };

  /** Descarta la migración: vuelve al formulario de ficha sin cerrarlo. */
  const descartarMigracion = () => {
    setShowMigracionModal(false);
    setMigracionContext(null);
  };

  /** La migración se resolvió; el formulario de ficha ya no tiene qué guardar. */
  const resolverMigracion = () => {
    descartarMigracion();
    setShowFichaModal(false);
  };

  const nombreUsuario = user ? `${user.nombres} ${user.apellidos}` : 'Carlos Mendoza';

  return (
    <div className="lg:col-span-4 bg-surface border border-border rounded-xl p-5 shadow-sm relative transition-all duration-300 animate-in fade-in slide-in-from-right-5">
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
        <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-1.5">
          <Sparkles className="h-4.5 w-4.5 text-primary" />
          <span>Detalles del Cronograma</span>
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          title="Cerrar Detalles"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {selectedVisit ? (
        <div className="space-y-4">
          <SelectorVisitasDelDia
            visitas={visitsOnSelectedDate}
            visitaSeleccionadaId={selectedVisitId}
            onSeleccionar={setSelectedVisitId}
          />

          <AvisoSolicitudPendiente solicitud={activeRequest} puedeDecidir={canDecide} />

          <DetalleVisita visita={selectedVisit} solicitud={activeRequest} />

          <AccionesVisita
            visita={selectedVisit}
            solicitud={activeRequest}
            evaluador={{
              puedeEvaluar: isEvaluadorAutorizado,
              esMonitorCampo: isMonitorCampo,
              esFechaCoincidente: isFechaCoincidente,
            }}
            onIniciarFicha={() => setShowFichaModal(true)}
            onVerFichaLlena={() => abrirFichaLlena(selectedVisit.id)}
            onSolicitarReprogramacion={() => setShowSolicitarReprogramarModal(true)}
            onVerSolicitud={() => setShowReprogramarModal(true)}
          />
        </div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center text-slate-300">
          <Calendar className="h-10 w-10 mb-2 stroke-1" />
          <span className="text-xs font-semibold">Selecciona un día en el calendario</span>
        </div>
      )}

      {selectedVisit && activeTemplate && (
        <LlenarFichaForm
          isOpen={showFichaModal}
          onClose={() => setShowFichaModal(false)}
          visit={selectedVisit}
          template={activeTemplate}
          onSave={guardarBorrador}
          onFinalize={finalizar}
        />
      )}

      {selectedVisit && (
        <SolicitarReprogramacionForm
          isOpen={showSolicitarReprogramarModal}
          onClose={() => setShowSolicitarReprogramarModal(false)}
          visit={selectedVisit}
          onSubmit={(data) => {
            submitRescheduleRequest(selectedVisit.id, {
              fechaOriginal: selectedVisit.fechaHora,
              fechaNueva: data.fechaNueva,
              motivo: data.motivo,
            });
            setShowSolicitarReprogramarModal(false);
          }}
        />
      )}

      {selectedVisit && activeRequest && (
        <DecidirReprogramacionForm
          isOpen={showReprogramarModal}
          onClose={() => setShowReprogramarModal(false)}
          visit={selectedVisit}
          request={activeRequest}
          canDecide={canDecide}
          onApprove={(visitId, comment) => {
            approveRescheduleRequest(visitId, nombreUsuario, comment);
            setShowReprogramarModal(false);
          }}
          onReject={(visitId, comment) => {
            rejectRescheduleRequest(visitId, nombreUsuario, comment);
            setShowReprogramarModal(false);
          }}
        />
      )}

      {deleteConfirmId && (
        <ConfirmModal
          title="¿Desea eliminar este cronograma?"
          message={
            <span>
              Esta acción eliminará de forma lógica el cronograma de visita programada para esta
              institución.
            </span>
          }
          confirmLabel="Eliminar Cronograma"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirmId(null)}
          danger
        />
      )}

      <MigracionPlantillaFicha
        contexto={migracionContext}
        abierto={showMigracionModal}
        onDescartar={descartarMigracion}
        onResuelto={resolverMigracion}
      />
    </div>
  );
};
