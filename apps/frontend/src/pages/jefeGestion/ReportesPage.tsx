import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Grid, List } from 'lucide-react';
import { useCronogramasData } from '@features/cronogramas/hooks/use-cronogramas-data';
import { usePlantillasList } from '@entities/model-plantillas/use-plantillas-api';
import { useFichasCompletadas } from '@entities/model-reportes';
import { PageHeader } from '@shared/ui/pageHeader';
import { ReportesStats, ReportesGrid, type BackendReportVisit } from '@widgets/reportes';
import { MODALIDAD_NIVEL_MAP, RoleCode, Capability } from '@sistema-monitoreo/shared-contracts';
import { useUser } from '@entities/model-user';
import { useScope, useCan } from '@shared/auth';
import {
  reportesPropios,
  reportesVisibles,
} from '@features/reportes/lib/visibilidad-reportes';
import { calcularEstadisticas } from '@features/reportes/lib/estadisticas-reportes';
import {
  esInstrumentoEib,
  instrumentoDe,
  tipoDeVisitaDe,
  type FiltroDeInstrumento,
} from '@features/reportes/lib/instrumento';
import {
  coincideConPeriodo,
  calcularConteosPorPeriodo,
  type FiltroPeriodoTipo,
} from '@features/reportes/lib/filtro-temporal';

export const ReportesPage = () => {
  const location = useLocation();
  const isMyReportsPath = location.pathname === '/reportes';
  const { user } = useUser();
  const { isInstitution, isMonitorCampo } = useScope();
  // Vista «mis reportes»: los monitoreos hechos A esta persona. Aplica a todo el
  // personal del lado de la institución, que es a quien se evalúa.
  const isEvaluatedView = isMyReportsPath && isInstitution;

  // Quienes figuran como AUTOR de una ficha, y por tanto ven «completadas por
  // usted» en lugar de «completadas por los especialistas».
  //
  // No coincide con `isMonitorCampo`: el director de institución también firma
  // fichas, aunque no comparta con los monitores de campo el resto de reglas
  // (por ejemplo, sí decide sobre reprogramaciones y ellos no).
  const esAutorDeFichas = isMonitorCampo || user?.role === RoleCode.DIRECTOR_INSTITUCION;
  
  const { can } = useCan();
  const canReadCronogramas = can(Capability.MONITOREO_READ);

  const { cronogramas } = useCronogramasData(canReadCronogramas);
  const { data: plantillas = [] } = usePlantillasList();
  const { data: fichasCompletadasData } = useFichasCompletadas({ page: 1, limit: 50 });

  // ── Estados de Vista e Interacción ──
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // ── Filtros ──
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalidad, setFilterModalidad] = useState('Todos');
  const [filterNivel, setFilterNivel] = useState('Todos');
  const [filterAnio, setFilterAnio] = useState('Todos');
  const [filterTipo, setFilterTipo] = useState<FiltroDeInstrumento>('Todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodoTipo>('TODOS');

  // Cascading Nivel
  const nivelesDisponibles = useMemo(() => {
    if (filterModalidad === 'Todos') return [];
    return MODALIDAD_NIVEL_MAP[filterModalidad as keyof typeof MODALIDAD_NIVEL_MAP] || [];
  }, [filterModalidad]);

  const handleModalidadChange = (modalidad: string) => {
    setFilterModalidad(modalidad);
    setFilterNivel('Todos');
  };

  // ── Filtrado de Fichas Completadas (Backend con Fallback Local) ──
  const completedVisits = useMemo<BackendReportVisit[]>(() => {
    if (fichasCompletadasData?.data && fichasCompletadasData.data.length > 0) {
      const list = fichasCompletadasData.data.map((f) => ({
        id: f.id, // Ficha ID
        cronogramaId: f.cronogramaId,
        plantillaId: f.plantillaId,
        plantillaNombre: f.plantillaNombre,
        fechaHora: f.fechaEjecucion,
        especialista: f.especialistaNombre,
        especialistaInitials: f.especialistaNombre
          .split(' ')
          .map((n) => n[0] || '')
          .join('')
          .toUpperCase(),
        institucion: `${f.institucionNombre} - ${f.institucionCodigoModular}`,
        docenteDirectivo: f.evaluadoNombre,
        // `tipo` es a quién se monitorea y `instrumento` con qué ficha. Antes los
        // dos salían del mismo campo del backend, que traía uno o el otro.
        instrumento: f.instrumento,
        tipo: tipoDeVisitaDe(f.instrumento),
        nroVisita: '1',
        estado: 'COMPLETADO' as const,
        modalidad: f.modalidad,
        nivel: f.nivel,
        promedio: f.promedio,
        puntajeTotal: f.puntajeTotal,
        nivelLogro: f.nivelLogro,
        monitorId: f.especialistaId,
        institucionId: f.institucionId,
        evaluadoId: f.evaluadoId,
        correoEnviado: f.correoEnviado,
        horaInicio: f.horaInicio,
        horaFin: f.horaFin,
      }));

      // Visibilidad por identificador, no por nombre. Las reglas viven en
      // `features/reportes/lib/visibilidad-reportes.ts`, con cobertura.
      return isEvaluatedView ? reportesPropios(list, user) : reportesVisibles(list, user);
    }

    const completadas = cronogramas.filter((c) => c.estado === 'COMPLETADO');
    return isEvaluatedView
      ? reportesPropios(completadas, user)
      : reportesVisibles(completadas, user);
  }, [fichasCompletadasData, cronogramas, user, isEvaluatedView]);

  const añosDisponibles = useMemo(() => {
    const yearsSet = new Set<string>();
    completedVisits.forEach((v) => {
      try {
        const d = new Date(v.fechaHora);
        if (!isNaN(d.getTime())) {
          yearsSet.add(d.getFullYear().toString());
        } else {
          const yearPart = v.fechaHora.split('-')[0];
          if (yearPart && yearPart.length === 4 && !isNaN(Number(yearPart))) {
            yearsSet.add(yearPart);
          }
        }
      } catch {
        // ignore
      }
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [completedVisits]);

  const conteosPeriodo = useMemo(
    () => calcularConteosPorPeriodo(completedVisits),
    [completedVisits],
  );

  const conteosTipo = useMemo(() => {
    let docentes = 0;
    let docentesEib = 0;
    let directivos = 0;
    completedVisits.forEach((v) => {
      if (v.instrumento === 'DIRECTIVO') directivos++;
      else if (esInstrumentoEib(v.instrumento)) docentesEib++;
      else docentes++;
    });
    return {
      Todos: completedVisits.length,
      DOCENTE: docentes,
      DOCENTE_EIB: docentesEib,
      DIRECTIVO: directivos,
    };
  }, [completedVisits]);

  const filteredVisits = useMemo(() => {
    return completedVisits
      .filter((visit) => {
        // Filtro de período temporal (Hoy, Esta semana, Este mes, Todos)
        if (!coincideConPeriodo(visit.fechaHora, filtroPeriodo)) return false;

        // Filtro por tipo de monitoreo (Docente vs Docente EIB vs Directivo)
        // El filtro es por instrumento, que es lo que la tarjeta muestra.
        if (filterTipo !== 'Todos' && (visit.instrumento ?? 'DOCENTE') !== filterTipo) {
          return false;
        }

        // Búsqueda por texto
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchIE = visit.institucion.toLowerCase().includes(query);
          const matchDocente = visit.docenteDirectivo.toLowerCase().includes(query);
          const matchEspecialista = visit.especialista.toLowerCase().includes(query);
          if (!matchIE && !matchDocente && !matchEspecialista) return false;
        }

        if (filterModalidad !== 'Todos' && visit.modalidad !== filterModalidad) return false;
        if (filterNivel !== 'Todos' && visit.nivel !== filterNivel) return false;

        if (filterAnio !== 'Todos') {
          let visitYear = '';
          try {
            const d = new Date(visit.fechaHora);
            if (!isNaN(d.getTime())) {
              visitYear = d.getFullYear().toString();
            } else {
              const yearPart = visit.fechaHora.split('-')[0];
              if (yearPart && yearPart.length === 4 && !isNaN(Number(yearPart))) {
                visitYear = yearPart;
              }
            }
          } catch {
            // ignore
          }
          if (visitYear !== filterAnio) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime());
  }, [completedVisits, filtroPeriodo, filterTipo, searchQuery, filterModalidad, filterNivel, filterAnio]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterModalidad('Todos');
    setFilterNivel('Todos');
    setFilterAnio('Todos');
    setFilterTipo('Todos');
    setFiltroPeriodo('TODOS');
  };

  const isAnyFilterActive =
    searchQuery !== '' ||
    filterModalidad !== 'Todos' ||
    filterNivel !== 'Todos' ||
    filterAnio !== 'Todos' ||
    filterTipo !== 'Todos' ||
    filtroPeriodo !== 'TODOS';

  // ── Métricas Estadísticas (KPIs) ──
  const stats = useMemo(() => {
    // Se calculan con `nivelLogro` y `promedio`, que ya vienen del backend.
    // Antes el nivel satisfactorio se derivaba del borrador guardado en
    // `localStorage` y, cuando faltaba —lo normal, porque el borrador vive en
    // el navegador de quien llenó la ficha— caía a un relleno inventado con
    // todos los niveles en III y IV, que empujaba la métrica al 100 %.
    // El instrumento decide el segmento; las filas del camino de respaldo lo
    // derivan del tipo de la visita, que no puede ser EIB.
    const base = calcularEstadisticas(
      completedVisits.map((v) => ({ ...v, instrumento: instrumentoDe(v) })),
    );

    // Nivel de logro más reciente (último por fechaHora)
    const masReciente = [...completedVisits].sort(
      (a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime(),
    )[0];

    return {
      ...base,
      uniqueIEs: base.institucionesDistintas,
      nivelLogroMasFrecuente: masReciente?.nivelLogro,
      // Por identificador y no por nombre: dos especialistas homónimos se
      // contaban como uno solo.
      uniqueEspecialistas: new Set(completedVisits.map((v) => v.monitorId).filter(Boolean)).size,
    };
  }, [completedVisits]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Encabezado de Página ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <PageHeader
            title={
              isEvaluatedView
                ? 'Mis Reportes de Monitoreo'
                : esAutorDeFichas
                  ? 'Fichas de Monitoreo Completadas'
                  : 'Fichas Completadas en Cuadrícula'
            }
            description={
              isEvaluatedView
                ? 'Bandeja para visualizar y descargar las fichas técnicas de los monitoreos realizados a su persona.'
                : esAutorDeFichas
                  ? 'Bandeja consolidada para auditar y descargar las fichas técnicas de monitoreo completadas por usted.'
                  : 'Bandeja consolidada para auditar y descargar las fichas técnicas de monitoreo completadas por los especialistas.'
            }
          />
        </div>

        {/* Toggle Grid vs Table */}
        <div className="inline-flex rounded-xl border border-border p-1 bg-surface shadow-sm self-start md:self-auto">
          <button
            onClick={() => setViewMode('GRID')}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              viewMode === 'GRID'
                ? 'bg-primary text-white shadow-md'
                : 'text-text-muted hover:text-text hover:bg-slate-50'
            }`}
            title="Vista de Cuadrícula"
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('TABLE')}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              viewMode === 'TABLE'
                ? 'bg-primary text-white shadow-md'
                : 'text-text-muted hover:text-text hover:bg-slate-50'
            }`}
            title="Vista de Tabla"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Módulos de KPIs ── */}
      <ReportesStats stats={stats} isEvaluatedView={isEvaluatedView} />

      {/* ── Listado Principal con Filtros ── */}
      <ReportesGrid
        filteredVisits={filteredVisits}
        viewMode={viewMode}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterModalidad={filterModalidad}
        setFilterModalidad={handleModalidadChange}
        filterNivel={filterNivel}
        setFilterNivel={setFilterNivel}
        filterAnio={filterAnio}
        setFilterAnio={setFilterAnio}
        filterTipo={filterTipo}
        setFilterTipo={setFilterTipo}
        conteosTipo={conteosTipo}
        filtroPeriodo={filtroPeriodo}
        setFiltroPeriodo={setFiltroPeriodo}
        conteosPeriodo={conteosPeriodo}
        nivelesDisponibles={nivelesDisponibles}
        añosDisponibles={añosDisponibles}
        isAnyFilterActive={isAnyFilterActive}
        handleClearFilters={handleClearFilters}
        plantillas={plantillas}
        isEvaluatedView={isEvaluatedView}
      />
    </div>
  );
};
