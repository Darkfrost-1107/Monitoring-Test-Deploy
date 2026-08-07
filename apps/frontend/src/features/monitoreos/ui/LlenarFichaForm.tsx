import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';
import { Card } from '@/shared/ui/card';
import { HistorialChart } from './HistorialChart';
import type { Cronograma } from '@/entities/model-cronogramas';
import type { Plantilla } from '@/entities/model-plantillas';
import { useReactToPrint } from 'react-to-print';
import { FichaPrintable } from '@/widgets/reportes/ui/FichaPrintable';
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
  leerEstadoGuardado,
} from '../lib/estado-formulario';
import { validarCierreDeFicha } from '../lib/validacion-ficha';
import { ContextoDeAulaSeccion } from './ficha/ContextoDeAulaSeccion';
import { EvidenciaGeneralSeccion } from './ficha/EvidenciaGeneralSeccion';
import { PanelDesempenos } from './ficha/PanelDesempenos';
import { EjesItemsSeccion } from './ficha/EjesItemsSeccion';
import { CierreNarrativoSeccion } from './ficha/CierreNarrativoSeccion';
import { ConsolidadoSeccion } from './ficha/ConsolidadoSeccion';
import { PieDeFicha } from './ficha/PieDeFicha';
import { VistaPreviaEvidencia } from './ficha/VistaPreviaEvidencia';
import { CabeceraFicha, type PestanaFicha } from './ficha/CabeceraFicha';


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

  useEffect(() => {
    if (!isOpen || !visit) return;

    // Estado recibido, o el borrador local, o formulario en blanco. Un borrador
    // ilegible se descarta: impedir abrir la ficha sería peor que perderlo.
    const fuente =
      initialState ?? leerEstadoGuardado(localStorage.getItem(claveEstadoLocal(visit.id)));

    // El diferido es el comportamiento original y se conserva: la hidratación
    // ocurre fuera del ciclo de render que la dispara.
    setTimeout(() => hidratar(fuente), 0);
  }, [isOpen, visit, template, initialState, hidratar]);

  const { docente: evaluadoDocente, areasSugeridas } = useDocenteEvaluado({
    activo: isOpen,
    visitId: visit?.id,
    evaluadoId: visit?.evaluadoId,
    initialState,
    onAutocompletarContexto: aplicarContextoSugerido,
  });

  if (!isOpen || !visit || !template) return null;

  const isCompleted = visit.estado === 'COMPLETADO';
  const isDirectivo = template.tipoMonitoreo.toUpperCase().includes('DIRECTIVO');

  const handleSaveClick = () => {
    onSave?.(visit.id, aDatosFicha(estado, visit.tipo));
  };

  const handleFinalizeClick = () => {
    // Las cinco condiciones de cierre viven en `lib/validacion-ficha.ts`, con
    // cobertura propia; acá sólo se informa la primera que falte.
    const falta = validarCierreDeFicha(template, estado);
    if (falta) {
      alert(falta);
      return;
    }

    onFinalize?.(visit.id, aDatosFicha(estado, visit.tipo));

    // Toast indicating email automation
    toast.success('Ficha finalizada con éxito', {
      description: 'El PDF oficial se está generando y enviando por correo al docente evaluado de forma automática.',
      duration: 6000,
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />
    });
  };

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
  // El baremo es el del contrato compartido, el mismo que aplica el backend.
  const calificacion = isCompleted
    ? resolverCalificacion(
        template.desempenos.map((d) => ({ id: d.id, romano: selectedLevels[d.id] ?? '' })),
      )
    : null;

  const currentFichaState = aDatosFicha(estado, visit.tipo);

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

        {template.ejesItems && template.ejesItems.length > 0 && (
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
            ejesItems={template.ejesItems}
            niveles={template.niveles}
            nivelesElegidos={selectedLevels}
            respuestasEjeItem={respuestasEjeItem}
            calificacion={calificacion}
          />
        )}
          </>
        )} {/* fin FICHA */}
        </div> {/* fin scroll interno */}

        <PieDeFicha
          soloLectura={isCompleted}
          onCerrar={onClose}
          onGuardarBorrador={handleSaveClick}
          onFinalizar={handleFinalizeClick}
        />
      </Card>

      <VistaPreviaEvidencia url={previewImageUrl} onCerrar={() => setPreviewImageUrl(null)} />

    </div>
  );
};
