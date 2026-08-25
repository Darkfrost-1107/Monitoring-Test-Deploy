import { useState, useCallback } from 'react';
import { RoleCode, Capability } from '@sistema-monitoreo/shared-contracts';
import { useCan } from '@shared/auth';
import { CarpetaDelDocente } from '@features/carpeta-pedagogica';
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
import { esDirectorDeLaVisita, rolDeFirma } from '../lib/rol-de-firma';
import type { DatosFicha } from '../lib/ficha-estado';
import type { ContextoDeAula } from '../lib/estado-formulario';
import {
  aDatosFicha,
  claveEstadoLocal,
} from '../lib/estado-formulario';
import { ContextoDeAulaSeccion } from './ficha/ContextoDeAulaSeccion';
import { PanelDesempenos } from './ficha/PanelDesempenos';
import { EjesItemsSeccion } from './ficha/EjesItemsSeccion';
import { ConsolidadoSeccion } from './ficha/ConsolidadoSeccion';
import { PieDeFicha } from './ficha/PieDeFicha';
import { VistaPreviaEvidencia } from './ficha/VistaPreviaEvidencia';
import { CabeceraFicha, type PestanaFicha } from './ficha/CabeceraFicha';
import { BannerDatosVisita } from './ficha/BannerDatosVisita';
import { firmasApi } from '@/shared/api/firmas.api';
import { encolar } from '@features/offline/outbox';
import { esErrorDeRed } from '@features/offline/errores';
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
  // Firma hecha sin conexión: quedó en cola, aún no confirmada por el servidor.
  const [firmaPendiente, setFirmaPendiente] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  useHidratacionDeFicha({
    abierta: isOpen,
    visitaId: visit?.id,
    templateId: template?.id,
    initialState,
    hidratar,
  });

  // Autocompletar el contexto del aula lee el docente por id (`docentes:read`),
  // capacidad que el propio evaluado no tiene. Un docente que abre su ficha ya
  // finalizada no necesita ese autocompletado: sin la guarda solo obtendría 403.
  const { can } = useCan();
  const { docente: evaluadoDocente, areasSugeridas } = useDocenteEvaluado({
    activo: isOpen && can(Capability.DOCENTES_READ),
    visitId: visit?.id,
    templateId: template?.id,
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

  const isCompleted = initialState?.estado === 'FINALIZADO';
  const isDirectivo = template?.tipoMonitoreo.toUpperCase().includes('DIRECTIVO');
  const esFichaDirectiva = !!isDirectivo;

  /**
   * `visit.id` es el id del CRONOGRAMA, y una visita docente puede llevar la
   * ficha regular y la EIB. Se manda la plantilla del formulario abierto para
   * que el servidor sepa de qué instrumento se piden las firmas: sin ella
   * resolvía a una ficha arbitraria de las dos.
   */
  const { data: firmasData, refetch: refetchFirmas } = useQuery({
    queryKey: ['ficha-firmas', visit?.id, template?.id],
    queryFn: () => firmasApi.getFirmasDeFicha(visit.id, template.id),
    enabled: !!visit?.id && !!template?.id && isCompleted,
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

  /**
   * Si se ofrece la pestaña de la carpeta pedagógica.
   *
   * Exige las dos cosas: que la visita tenga un docente evaluado —el portafolio
   * es suyo— y que quien mira pueda consultarlo. Sin la capacidad, el backend
   * responde 403 y la pestaña sería una promesa incumplible.
   */
  const puedeVerCarpeta =
    !!visit.evaluadoId && can(Capability.CARPETA_PEDAGOGICA_READ);

  /**
   * Año escolar de la visita, no el año en curso.
   *
   * Una visita de 2026 evalúa el portafolio de 2026, aunque la ficha se reabra
   * más adelante para consultarla.
   */
  const anioDeLaVisita = new Date(visit.fechaHora).getFullYear();


  const esEvaluado =
    (!!user?.docenteId && !!visit?.evaluadoId && user.docenteId === visit.evaluadoId) ||
    user?.id === visit?.evaluadoId ||
    user?.role === RoleCode.DOCENTE;
  const esEvaluador = puedeEvaluarVisita(user, visit);
  /**
   * El director de la I.E. firma la ficha docente al final, como visto bueno.
   * No es parte del cronograma: se lo reconoce por su rol y por la institución
   * de la visita. En la ficha directiva no corresponde —ahí es el evaluado—.
   */
  const esDirectorDeLaIE =
    !esFichaDirectiva && esDirectorDeLaVisita(user, visit);
  const rolEsperado = rolDeFirma({ esEvaluado, esEvaluador, esDirectorDeLaIE });
  const puedeFirmar = isCompleted && rolEsperado !== null;
  const yaFirmo =
    firmaPendiente || (firmasData?.firmas?.some((f) => f.rolFirmante === rolEsperado) ?? false);

  const handleFirmar = async () => {
    try {
      // La plantilla identifica el instrumento que se está firmando: la firma
      // atesta el contenido de una ficha concreta, no de la visita.
      await firmasApi.signFicha(visit.id, {
        consentimiento: true,
        plantillaId: template.id,
      });
      toast.success('Ficha firmada con éxito');
      refetchFirmas();
    } catch (error: unknown) {
      // Sin señal, la firma se encola y sube al reconectar (idempotente: firmar
      // dos veces con el mismo rol el backend lo resuelve como éxito).
      if (esErrorDeRed(error)) {
        await encolar('firmar-ficha', { cronogramaId: visit.id, plantillaId: template.id });
        setFirmaPendiente(true);
        toast.info('Sin conexión: la firma quedó guardada y se enviará al recuperar internet.', {
          duration: 8000,
        });
      } else {
        toast.error(error instanceof Error ? error.message : 'Error al firmar la ficha');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-200">
      <div style={{ display: 'none' }}>
        <FichaPrintable ref={printRef} visit={visit} template={template} fichaState={currentFichaState} />
      </div>
      <Card className="bg-surface w-full max-w-[1250px] border border-border rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        <CabeceraFicha
          template={template}
          soloLectura={isCompleted}
          pestana={visit.tipo !== 'DIRECTIVO' ? activeTab : null}
          onPestana={setActiveTab}
          conCarpeta={puedeVerCarpeta}
          onImprimir={() => handlePrint()}
          onCerrar={onClose}
        />

        {/* Contenedor con scroll interno — engloba metadatos + cuerpo + comentarios + calificación */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <BannerDatosVisita visit={visit} />

          {visit.tipo !== 'DIRECTIVO' && (
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
        
        {activeTab === 'HISTORIAL' && visit.evaluadoId && (
          <div className="p-6">
            <HistorialChart evaluadoId={visit.evaluadoId} />
          </div>
        )}

        {activeTab === 'CARPETA' && puedeVerCarpeta && visit.evaluadoId && (
          <div className="p-6">
            <CarpetaDelDocente docenteId={visit.evaluadoId} anio={anioDeLaVisita} />
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
              cierre={{
                observaciones: generalComments,
                sugerencias,
                compromisos,
                onObservaciones: setGeneralComments,
                onSugerencias: setSugerencias,
                onCompromisos: setCompromisos,
                evidencias: evidenciaUrls,
                onEvidencias: (siguientes) => {
                  setEvidenciaUrls(siguientes);
                  // Se persiste el estado completo: antes se armaba a mano y
                  // perdía las observaciones de ejes y el contexto de aula.
                  safeSetLocalStorage(
                    claveEstadoLocal(visit.id, template.id),
                    JSON.stringify(
                      aDatosFicha({ ...estado, evidenciaUrls: siguientes }, visit.tipo),
                    ),
                  );
                },
                onVerImagen: setPreviewImageUrl,
              }}
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
