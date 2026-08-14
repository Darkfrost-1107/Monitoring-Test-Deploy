import { useState, useCallback } from 'react';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';
import { useUser } from '@entities/model-user';
import { Card } from '@/shared/ui/card';
import { AvisoDeError } from '@shared/ui/AvisoDeError';
import { useHidratacionDeFicha } from '../hooks/use-hidratacion-de-ficha';
import { useAccionesDeFicha } from '../hooks/use-acciones-de-ficha';
import { HistorialChart } from './HistorialChart';
import { puedeEvaluarVisita, type Cronograma } from '@/entities/model-cronogramas';
import type { Plantilla } from '@/entities/model-plantillas';
import { useReactToPrint } from 'react-to-print';
import { FichaPrintable } from '@/widgets/reportes/ui/FichaPrintable';
import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import { safeSetLocalStorage } from '@/shared/lib/utils';
import { useFormularioFicha } from '../hooks/use-formulario-ficha';
import { useDocenteEvaluado } from '../hooks/use-docente-evaluado';
import { resolverCalificacion } from '../lib/calificacion-presentacion';
import type { DatosFicha } from '../lib/ficha-estado';
import type { ContextoDeAula } from '../lib/estado-formulario';
import {
  aDatosFicha,
  claveEstadoLocal,
} from '../lib/estado-formulario';
import { ContextoDeAulaSeccion } from './ficha/ContextoDeAulaSeccion';
import { EvidenciaGeneralSeccion } from './ficha/EvidenciaGeneralSeccion';
import { PanelDesempenos } from './ficha/PanelDesempenos';
import { EjesItemsSeccion } from './ficha/EjesItemsSeccion';
import { CierreNarrativoSeccion } from './ficha/CierreNarrativoSeccion';
import { ConsolidadoSeccion } from './ficha/ConsolidadoSeccion';
import { PieDeFicha } from './ficha/PieDeFicha';
import { VistaPreviaEvidencia } from './ficha/VistaPreviaEvidencia';
import { CabeceraFicha, type PestanaFicha } from './ficha/CabeceraFicha';
import { firmasApi } from '@/shared/api/firmas.api';
import { toast } from 'sonner';


/**
 * Los tres campos que describían la ficha repetían la misma forma de dieciocho
 * líneas, una por cada uno. Es `DatosFicha`, que ya está declarado y es lo que
 * consume la persistencia.
 */
interface LlenarFichaFormProps {
  isOpen: boolean;
  onClose: () => void;
  visit: Cronograma;
  template: Plantilla;
  onSave?: (visitId: string, datos: DatosFicha) => void;
  onFinalize?: (visitId: string, datos: DatosFicha) => void;
  /** Estado con el que abrir el formulario, si se reabre una ficha ya cargada. */
  initialState?: DatosFicha;
}

export const LlenarFichaForm = ({
  isOpen,
  onClose,
  visit,
  template,
  onSave,
  onFinalize,
  initialState,
}: LlenarFichaFormProps) => {
  const { user } = useUser();
  // Una sola pieza de estado; los actualizadores conservan la firma de
  // `useState` para que los sitios de uso del formulario no cambien.
  const {
    estado,
    hidratar,
    setSelectedLevels,
    setGeneralComments,
    setSugerencias,
    setCompromisos,
    setRubricComments,
    setPreguntaExtraAnswers,
    setRespuestasEjeItem,
    setEvidenciaUrls,
    setObservacionesEjeItem,
    setContextoCampo,
  } = useFormularioFicha();

  const {
    selectedLevels,
    generalComments,
    sugerencias,
    compromisos,
    rubricComments,
    preguntaExtraAnswers,
    respuestasEjeItem,
    evidenciaUrls,
    observacionesEjeItem,
  } = estado;

  /** Escribe el contexto que sugiere la ficha del docente evaluado. */
  const aplicarContextoSugerido = useCallback(
    (sugerido: Partial<ContextoDeAula>) => {
      for (const [campo, valor] of Object.entries(sugerido)) {
        setContextoCampo(campo as keyof ContextoDeAula, valor as never);
      }
    },
    [setContextoCampo],
  );



  const [activeTab, setActiveTab] = useState<PestanaFicha>('FICHA');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  useHidratacionDeFicha({
    abierta: isOpen,
    visitaId: visit?.id,
    initialState,
    hidratar,
  });

  const { docente: evaluadoDocente, areasSugeridas } = useDocenteEvaluado({
    activo: isOpen,
    visitId: visit?.id,
    evaluadoId: visit?.evaluadoId,
    initialState,
    onAutocompletarContexto: aplicarContextoSugerido,
  });

  const { guardarBorrador, finalizar, faltaParaCerrar, olvidarFalta } = useAccionesDeFicha({
    visit,
    template,
    estado,
    onSave,
    onFinalize,
  });

  const isCompleted = visit?.estado === 'COMPLETADO';
  const isDirectivo = template?.tipoMonitoreo.toUpperCase().includes('DIRECTIVO');

  const { data: firmasData, refetch: refetchFirmas } = useQuery({
    queryKey: ['ficha-firmas', visit?.id],
    queryFn: () => firmasApi.getFirmasDeFicha(visit.id),
    enabled: !!visit?.id && isCompleted,
    staleTime: 30_000,
  });

  if (!isOpen || !visit || !template) return null;



  /**
   * Calificación consolidada que se muestra al cerrar la ficha.
   *
   * Usa el baremo del contrato compartido, que es el mismo que aplica el
   * backend al persistir. Antes esta pantalla tenía su propia tabla sobre el
   * puntaje total: coincidía con el backend sólo para plantillas de cinco
   * desempeños y discrepaba en cualquier otra, de modo que el evaluador podía
   * ver un nivel de logro y guardarse otro distinto. Ver H-28 de
   * PLAN_REMEDIACION.md.
   */
  const calificacion = isCompleted
    ? resolverCalificacion(
        template.desempenos.map((d) => ({ id: d.id, romano: selectedLevels[d.id] ?? '' })),
        // La escala que declara la plantilla, la misma que el backend consulta
        // al persistir: sin ella la pantalla volvería a mostrar un nivel y el
        // servidor a guardar otro.
        template.niveles.map((n) => ({
          nivelRomano: n.nivel,
          rangoMin: n.rangoMin,
          denominacion: n.denominacion,
        })),
        // Y cómo leerlos: la rúbrica docente corta sobre el puntaje, la
        // directiva sobre el porcentaje de avance.
        template.baremo,
      )
    : null;

  const currentFichaState = aDatosFicha(estado, visit.tipo);


  const esEvaluado =
    (!!user?.docenteId && !!visit?.evaluadoId && user.docenteId === visit.evaluadoId) ||
    user?.id === visit?.evaluadoId ||
    user?.role === RoleCode.DOCENTE;
  const esEvaluador = puedeEvaluarVisita(user, visit);
  const puedeFirmar = isCompleted && (esEvaluado || esEvaluador);
  const rolEsperado = esEvaluado ? 'EVALUADO' : 'EVALUADOR';
  const yaFirmo = firmasData?.firmas?.some((f) => f.rolFirmante === rolEsperado);

  const handleFirmar = async () => {
    try {
      await firmasApi.signFicha(visit.id, {
        rolFirmante: rolEsperado,
        consentimiento: true,
      });
      toast.success('Ficha firmada con éxito');
      refetchFirmas();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al firmar la ficha');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-200">
      <div style={{ display: 'none' }}>
        <FichaPrintable ref={printRef} visit={visit} template={template} fichaState={currentFichaState} />
      </div>
      <Card className="bg-surface w-full max-w-[1250px] border border-border rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        <CabeceraFicha
          visit={visit}
          template={template}
          soloLectura={isCompleted}
          pestana={visit.tipo === 'DOCENTE' ? activeTab : null}
          onPestana={setActiveTab}
          onImprimir={() => handlePrint()}
          onCerrar={onClose}
        />

        {visit.tipo === 'DOCENTE' && (
          <ContextoDeAulaSeccion
            contexto={estado.contexto}
            onCambiar={setContextoCampo}
            sugerencias={{
              areas: areasSugeridas,
              secciones: evaluadoDocente?.secciones ?? [],
            }}
            soloLectura={isCompleted}
          />
        )}

        {/* Contenedor con scroll interno — engloba cuerpo + comentarios + calificación */}
        <div className="flex-1 overflow-y-auto min-h-0">
        
        {activeTab === 'HISTORIAL' && visit.evaluadoId && (
          <div className="p-6">
            <HistorialChart evaluadoId={visit.evaluadoId} />
          </div>
        )}

        {activeTab === 'FICHA' && (
          <>
            <PanelDesempenos
              template={template}
              respuestas={{
                niveles: selectedLevels,
                preguntasExtra: preguntaExtraAnswers,
                observaciones: rubricComments,
              }}
              onElegirNivel={(id, nivel) => setSelectedLevels((prev) => ({ ...prev, [id]: nivel }))}
              onResponderExtra={(id, valor) =>
                setPreguntaExtraAnswers((prev) => ({ ...prev, [id]: valor }))
              }
              onObservar={(id, texto) => setRubricComments((prev) => ({ ...prev, [id]: texto }))}
              mostrarAspectos={!isDirectivo}
              soloLectura={isCompleted}
            />

        {/* Planificación y diseño de evaluación existe sólo en el instrumento
            docente. Se condiciona al tipo y no sólo a que haya ítems: una
            plantilla directiva que los tenga cargados —el formulario ya no lo
            permite, pero la base puede traerlos— le mostraría al evaluador una
            sección que su ficha no lleva. */}
        {!isDirectivo && template.ejesItems && template.ejesItems.length > 0 && (
          <EjesItemsSeccion
            items={template.ejesItems}
            niveles={template.niveles}
            respuestas={respuestasEjeItem}
            observaciones={observacionesEjeItem}
            onResponder={(itemId, nivel) =>
              setRespuestasEjeItem((prev) => ({ ...prev, [itemId]: nivel }))
            }
            onObservar={(itemId, texto) =>
              setObservacionesEjeItem((prev) => ({ ...prev, [itemId]: texto }))
            }
            soloLectura={isCompleted}
          />
        )}

        <CierreNarrativoSeccion
          observaciones={generalComments}
          onObservaciones={setGeneralComments}
          sugerencias={sugerencias}
          compromisos={compromisos}
          onSugerencias={setSugerencias}
          onCompromisos={setCompromisos}
          soloLectura={isCompleted}
        />

        <EvidenciaGeneralSeccion
          evidencias={evidenciaUrls}
          onCambiar={(siguientes) => {
            setEvidenciaUrls(siguientes);
            // Se persiste el estado completo: antes se armaba a mano y perdía
            // las observaciones de ejes y el contexto de aula.
            safeSetLocalStorage(
              claveEstadoLocal(visit.id),
              JSON.stringify(aDatosFicha({ ...estado, evidenciaUrls: siguientes }, visit.tipo)),
            );
          }}
          onVerImagen={setPreviewImageUrl}
          soloLectura={isCompleted}
        />

        {calificacion && (
          <ConsolidadoSeccion
            desempenos={template.desempenos}
            // Una ficha directiva no lleva esta sección, y su consolidado
            // tampoco debe listarla.
            ejesItems={isDirectivo ? [] : template.ejesItems}
            niveles={template.niveles}
            nivelesElegidos={selectedLevels}
            respuestasEjeItem={respuestasEjeItem}
            calificacion={calificacion}
          />
        )}
          </>
        )} {/* fin FICHA */}
        </div> {/* fin scroll interno */}

        <AvisoDeError
          mensaje={faltaParaCerrar}
          onCerrar={olvidarFalta}
          tono="advertencia"
          className="mx-6 mb-3"
        />

        <PieDeFicha
          soloLectura={isCompleted}
          onCerrar={onClose}
          onGuardarBorrador={guardarBorrador}
          onFinalizar={finalizar}
          onFirmar={puedeFirmar ? handleFirmar : undefined}
          yaFirmo={yaFirmo}
        />
      </Card>

      <VistaPreviaEvidencia url={previewImageUrl} onCerrar={() => setPreviewImageUrl(null)} />

    </div>
  );
};
