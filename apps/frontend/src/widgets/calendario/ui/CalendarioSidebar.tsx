import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Sparkles, X, Calendar } from 'lucide-react';
import { useCronogramasData } from '@features/cronogramas/hooks/use-cronogramas-data';
import { puedeEvaluarVisita, type Cronograma } from '@entities/model-cronogramas';
import { useUser } from '@/entities/model-user';
import { useScope } from '@shared/auth';
import { puedeDecidirReprogramacion } from '@entities/model-reprogramaciones';
import { plantillasAplicables, seleccionarPlantillaActiva } from '@/entities/model-plantillas';
import { usePlantillasList } from '@/entities/model-plantillas/use-plantillas-api';
import { claveDeHoy } from '@/shared/lib/calendario/grid';
import { motivoSinInstrumento } from '../lib/instrumento';
import { useFichaPersistence } from '@/features/monitoreos/hooks/use-ficha-persistence';
import { LlenarFichaForm } from '@/features/monitoreos';
import { fichaAEstadoFormulario } from '@/features/monitoreos/lib/ficha-estado';
import {
  SolicitarReprogramacionForm,
  DecidirReprogramacionForm,
} from '@/features/reprogramaciones';
import { useQuery } from '@tanstack/react-query';
import { fichasApi } from '@/features/monitoreos/api/fichas.api';
import type { IFichaMonitoreo } from '@sistema-monitoreo/shared-contracts';
import { SelectorVisitasDelDia } from './sidebar/SelectorVisitasDelDia';
import { DetalleVisita } from './sidebar/DetalleVisita';
import { AccionesVisita } from './sidebar/AccionesVisita';
import { AvisoSolicitudPendiente } from './sidebar/AvisoSolicitudPendiente';
import { MigracionPlantillaFicha } from './sidebar/MigracionPlantillaFicha';
import { ModalSeleccionarInstrumento } from './ModalSeleccionarInstrumento';
import type { Plantilla } from '@/entities/model-plantillas';

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
  } = useCronogramasData();

  const [showFichaModal, setShowFichaModal] = useState(false);
  const [showSeleccionarInstrumentoModal, setShowSeleccionarInstrumentoModal] = useState(false);
  const [selectedTemplateOverride, setSelectedTemplateOverride] = useState<Plantilla | null>(null);
  const [showSolicitarReprogramarModal, setShowSolicitarReprogramarModal] = useState(false);
  const [showReprogramarModal, setShowReprogramarModal] = useState(false);
  const [showMigracionModal, setShowMigracionModal] = useState(false);
  const [migracionContext, setMigracionContext] = useState<{
    visitId: string;
    plantillaVigenteId: string | null;
    plantillaVigenteNombre: string;
  } | null>(null);

  // Ya vienen mapeadas al modelo Plantilla del frontend.
  const {
    data: plantillas = [],
    isLoading: cargandoPlantillas,
    isError: fallaronPlantillas,
  } = usePlantillasList();

  const selectedVisit = useMemo(
    () => (selectedVisitId ? (cronogramas.find((v) => v.id === selectedVisitId) ?? null) : null),
    [cronogramas, selectedVisitId],
  );

  // Consulta de todas las fichas levantadas para esta visita (soporte de ficha dual/múltiple)
  const { data: fichasDeVisita = [], refetch: refetchFichas } = useQuery<IFichaMonitoreo[]>({
    queryKey: ['fichas', 'visita', selectedVisit?.id],
    queryFn: async () => {
      if (!selectedVisit?.id) return [];
      return fichasApi.findAllByVisita(selectedVisit.id);
    },
    enabled: !!selectedVisit?.id,
  });

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

  /**
   * Instrumentos que se le ofrecen al evaluador para esta visita.
   *
   * La regla vive en `plantillasAplicables`, junto a la cascada que elige el
   * instrumento por defecto. Antes se filtraba acá a mano por estado y tipo, sin
   * mirar el ÁMBITO, de modo que a una especialista de UGEL se le ofrecían
   * también las copias que otra institución había hecho de la ficha oficial. El
   * clon conserva el rótulo del original: elegir el equivocado no da ningún
   * aviso, sólo una ficha evaluada con el instrumento de otra institución.
   */
  const plantillasCandidatas = useMemo(() => {
    if (!selectedVisit || !user) return [];
    return plantillasAplicables(plantillas, {
      tipoVisita: selectedVisit.tipo,
      usuarioId: user.id,
      institucionUsuarioId: user.institucion,
      esInstitucion: isInstitution,
      esMonitorCampo: isMonitorCampo,
      // El año de la VISITA, no el del calendario: una visita de 2026 que se
      // completa en 2027 se evalúa con el instrumento de 2026.
      anioVisita: new Date(selectedVisit.fechaHora).getFullYear(),
    });
  }, [selectedVisit, plantillas, user, isInstitution, isMonitorCampo]);

  // Instrumento activo: si el monitor seleccionó uno explícitamente se honra, si no se calcula por cascada
  const activeTemplate = useMemo(() => {
    if (!selectedVisit || !user) return null;
    if (selectedTemplateOverride) return selectedTemplateOverride;

    // La cascada corre sobre las plantillas YA acotadas por ámbito, no sobre
    // todas. Su último recurso es «cualquier vigente del tipo pedido», y sobre
    // el catálogo completo eso podía caer en la copia de otra institución.
    return (
      seleccionarPlantillaActiva(plantillasCandidatas, {
        tipoVisita: selectedVisit.tipo,
        usuarioId: user.id,
        institucionUsuarioId: user.institucion,
        esInstitucion: isInstitution,
        esMonitorCampo: isMonitorCampo,
      }) ||
      plantillasCandidatas[0] ||
      null
    );
  }, [
    selectedVisit,
    user,
    isInstitution,
    isMonitorCampo,
    selectedTemplateOverride,
    plantillasCandidatas,
  ]);

  const instrumentoNoDisponible = motivoSinInstrumento(activeTemplate !== null, {
    cargando: cargandoPlantillas,
    fallo: fallaronPlantillas,
    anioVisita: selectedVisit ? new Date(selectedVisit.fechaHora).getFullYear() : undefined,
  });

  const isEvaluadorAutorizado = useMemo(
    () => puedeEvaluarVisita(user, selectedVisit),
    [selectedVisit, user],
  );

  // ¿Hoy es el día programado? Restringe el inicio de la visita a su fecha.
  const isFechaCoincidente = useMemo(() => {
    if (!selectedVisit) return false;
    return claveDeHoy() === selectedVisit.fechaHora.substring(0, 10);
  }, [selectedVisit]);

  // Manejo de inicio de ficha: si hay varias fichas vigentes disponibles, se abre el selector de instrumento
  const handleIniciarFicha = () => {
    if (plantillasCandidatas.length > 1) {
      setShowSeleccionarInstrumentoModal(true);
    } else if (plantillasCandidatas.length === 1) {
      setSelectedTemplateOverride(plantillasCandidatas[0]);
      setShowFichaModal(true);
    } else if (activeTemplate) {
      setShowFichaModal(true);
    }
  };

  /**
   * Abre la ficha ya cerrada, si existe.
   */
  const abrirFichaLlena = async (visitId: string, pId?: string) => {
    if (pId) {
      const tpl = plantillas.find((p) => p.id === pId);
      if (tpl) setSelectedTemplateOverride(tpl);
    }
    const resultado = await prepararFichaLlena(visitId, pId);

    if (resultado === 'cargada') {
      setShowFichaModal(true);
      return;
    }

    toast.error(
      resultado === 'sin-respaldo'
        ? 'La visita figura como completada, pero su ficha no está registrada en el sistema. Comuníquelo a la Jefatura de Gestión Pedagógica.'
        : 'No se pudo recuperar la ficha de esta visita. Reintente en unos momentos.',
      { duration: 10_000 },
    );
  };

  const handleVerFichaLlena = (visitId: string) => {
    if (plantillasCandidatas.length > 1) {
      setShowSeleccionarInstrumentoModal(true);
    } else {
      abrirFichaLlena(visitId, activeTemplate?.id);
    }
  };

  const handleSeleccionarInstrumento = async (
    plantillaElegida: Plantilla,
    fichaExistente?: IFichaMonitoreo,
  ) => {
    setShowSeleccionarInstrumentoModal(false);

    // Quien no es el monitor asignado sólo puede consultar fichas finalizadas.
    // Una ficha sin finalizar no se abre a evaluar (el modal ya la deshabilita;
    // esto es la barrera de fondo por si se la evade).
    const esFinalizada = fichaExistente?.estado === 'FINALIZADO';
    if (!isEvaluadorAutorizado && !esFinalizada) return;

    setSelectedTemplateOverride(plantillaElegida);

    if (fichaExistente) {
      await abrirFichaLlena(selectedVisit!.id, plantillaElegida.id);
    } else {
      setShowFichaModal(true);
    }
  };

  // Escritura del resultado del monitoreo. Vive en `use-ficha-persistence`
  // porque no es maquetación; acá sólo se enlazan sus efectos con los modales.
  const { guardarBorrador, finalizar, prepararFichaLlena } = useFichaPersistence({
    plantillaId: activeTemplate?.id,
    onPersistido: () => {
      setShowFichaModal(false);
      setSelectedTemplateOverride(null);
      void refetchFichas();
    },
    onPlantillaVersionada: (contexto) => {
      // ILA-0046: la plantilla pasó a Histórico; se ofrece migrar.
      setMigracionContext(contexto);
      setShowMigracionModal(true);
    },
  });

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
            instrumentoNoDisponible={instrumentoNoDisponible}
            onIniciarFicha={handleIniciarFicha}
            onVerFichaLlena={() => handleVerFichaLlena(selectedVisit.id)}
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

      {selectedVisit && (
        <ModalSeleccionarInstrumento
          isOpen={showSeleccionarInstrumentoModal}
          onClose={() => setShowSeleccionarInstrumentoModal(false)}
          visita={selectedVisit}
          plantillas={plantillasCandidatas}
          fichasExistentes={fichasDeVisita}
          onSeleccionar={handleSeleccionarInstrumento}
          puedeLlenar={isEvaluadorAutorizado}
        />
      )}

      {selectedVisit && activeTemplate && (
        <LlenarFichaForm
          isOpen={showFichaModal}
          onClose={() => {
            setShowFichaModal(false);
            setSelectedTemplateOverride(null);
          }}
          visit={selectedVisit}
          template={activeTemplate}
          initialState={(() => {
            const fExistente = fichasDeVisita.find(
              (f) => f.plantillaId === activeTemplate.id,
            );
            return fExistente ? fichaAEstadoFormulario(fExistente) : undefined;
          })()}
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
            approveRescheduleRequest(visitId, comment);
            setShowReprogramarModal(false);
          }}
          onReject={(visitId, comment) => {
            rejectRescheduleRequest(visitId, comment);
            setShowReprogramarModal(false);
          }}
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
