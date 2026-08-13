import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Cronograma } from '@/entities/model-cronogramas';
import type { Plantilla } from '@/entities/model-plantillas';
import { usePlantilla } from '@/entities/model-plantillas/use-plantillas-api';
import { LlenarFichaForm } from '@/features/monitoreos';
import { fichasApi } from '@/features/monitoreos/api/fichas.api';
import { fichaAEstadoFormulario } from '@/features/monitoreos/lib/ficha-estado';
import { FiltrosReportes } from './grid/FiltrosReportes';
import { TarjetaReporte } from './grid/TarjetaReporte';
import { TablaReportes } from './grid/TablaReportes';
import { FichaNoDisponible, SinReportes } from './grid/EstadosDelListado';
import { reportesApi } from '@/shared/api/reportes.api';
import { toast } from 'sonner';

/**
 * Listado de fichas de monitoreo completadas.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Tenía 616 líneas: los filtros, la vista de
 * cuadrícula, la de tabla —cada una con su copia del cálculo de la
 * calificación—, la traducción de la ficha del backend y una función que
 * devolvía una evaluación inventada cuando la ficha no llegaba.
 */

export interface BackendReportVisit extends Cronograma {
  nivelLogro?: string;
  promedio?: number;
  puntajeTotal?: number;
  correoEnviado?: boolean;
}

interface ReportesGridProps {
  filteredVisits: BackendReportVisit[];
  viewMode: 'GRID' | 'TABLE';
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterModalidad: string;
  setFilterModalidad: (m: string) => void;
  filterNivel: string;
  setFilterNivel: (n: string) => void;
  filterAnio: string;
  setFilterAnio: (a: string) => void;
  nivelesDisponibles: string[];
  añosDisponibles: string[];
  isAnyFilterActive: boolean;
  handleClearFilters: () => void;
  plantillas: Plantilla[];
  /** Cuando true, ajusta filtros y tarjetas para la perspectiva del docente evaluado */
  isEvaluatedView?: boolean;
}

export const ReportesGrid = ({
  filteredVisits,
  viewMode,
  plantillas,
  isEvaluatedView = false,
  ...filtros
}: ReportesGridProps) => {
  const [visitaAbierta, setVisitaAbierta] = useState<BackendReportVisit | null>(null);
  const queryClient = useQueryClient();

  const {
    data: fichaDelBackend,
    isLoading: cargandoFicha,
    isError: errorDeFicha,
  } = useQuery({
    queryKey: ['ficha-completada', visitaAbierta?.id],
    queryFn: () => {
      if (!visitaAbierta) return null;
      // El listado del backend trae el id de la FICHA; el respaldo local trae
      // el del cronograma, y hay que buscarla por la visita.
      return 'nivelLogro' in visitaAbierta
        ? fichasApi.findById(visitaAbierta.id)
        : fichasApi.findByVisita(visitaAbierta.id);
    },
    enabled: !!visitaAbierta,
  });

  // La plantilla se carga por id de la ficha, lo que funciona con `monitoreo:read`
  // y por lo tanto también para el docente evaluado.
  const plantillaDeLaFicha = usePlantilla(fichaDelBackend?.plantillaId).data;

  const plantillaActiva = useMemo(() => {
    if (!visitaAbierta) return null;
    if (plantillaDeLaFicha) return plantillaDeLaFicha;

    const tipoBuscado =
      visitaAbierta.tipo === 'DOCENTE' ? 'Monitoreo Docente' : 'Monitoreo Directivo';
    return plantillas.find((p) => p.tipoMonitoreo === tipoBuscado) || plantillas[0] || null;
  }, [plantillaDeLaFicha, visitaAbierta, plantillas]);

  /**
   * El estado del formulario sale de la ficha del backend, o no sale.
   *
   * Antes, cuando la ficha no llegaba, se caía a `getFichaState`, que devolvía
   * una evaluación **inventada**: treinta y cinco aspectos marcados, todos los
   * niveles en III y IV y un párrafo de observaciones escrito a mano. Eso se le
   * mostraba al usuario como si fuera la ficha real de esa visita.
   */
  const estadoDeLaFicha = useMemo(
    () => (fichaDelBackend ? fichaAEstadoFormulario(fichaDelBackend) : null),
    [fichaDelBackend],
  );

  const cerrarFicha = () => setVisitaAbierta(null);

  // El PDF se genera desde el modal, que es donde se carga la ficha completa.
  const abrirParaDescargar = (visita: BackendReportVisit, e: React.MouseEvent) => {
    e.stopPropagation();
    setVisitaAbierta(visita);
  };

  const [enviandoCorreoId, setEnviandoCorreoId] = useState<string | null>(null);
  const handleEnviarCorreo = async (visita: BackendReportVisit, e: React.MouseEvent) => {
    e.stopPropagation();
    setEnviandoCorreoId(visita.id);
    try {
      await reportesApi.enviarFichaCorreo(visita.id);
      toast.success('Correo enviado con éxito.');
      await queryClient.invalidateQueries({ queryKey: ['reportes', 'fichas-completadas'] });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al enviar el correo.');
    } finally {
      setEnviandoCorreoId(null);
    }
  };

  const fichaLista = !!visitaAbierta && !!plantillaActiva && !!estadoDeLaFicha;

  return (
    <div className="space-y-6">
      <FiltrosReportes {...filtros} isEvaluatedView={isEvaluatedView} />

      {filteredVisits.length === 0 ? (
        <SinReportes />
      ) : viewMode === 'GRID' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVisits.map((visita) => (
            <TarjetaReporte
              key={visita.id}
              visita={visita}
              isEvaluatedView={isEvaluatedView}
              onAbrir={() => setVisitaAbierta(visita)}
              onDescargar={(e) => abrirParaDescargar(visita, e)}
              onEnviarCorreo={(e) => handleEnviarCorreo(visita, e)}
              isEnviandoCorreo={enviandoCorreoId === visita.id}
            />
          ))}
        </div>
      ) : (
        <TablaReportes
          visitas={filteredVisits}
          onAbrir={setVisitaAbierta}
          onDescargar={abrirParaDescargar}
        />
      )}

      {fichaLista && (
        <LlenarFichaForm
          isOpen
          onClose={cerrarFicha}
          visit={visitaAbierta}
          template={plantillaActiva}
          initialState={estadoDeLaFicha}
        />
      )}

      {!!visitaAbierta && !fichaLista && (
        <FichaNoDisponible
          cargando={cargandoFicha && !errorDeFicha}
          onCerrar={cerrarFicha}
        />
      )}
    </div>
  );
};
