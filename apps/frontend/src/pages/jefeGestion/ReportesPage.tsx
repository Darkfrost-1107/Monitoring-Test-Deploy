import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Grid, List } from 'lucide-react';
import { useCronogramasData } from '@features/cronogramas/hooks/use-cronogramas-data';
import { usePlantillasList } from '@entities/model-plantillas/use-plantillas-api';
import { useFichasCompletadas } from '@entities/model-reportes';
import { PageHeader } from '@shared/ui/pageHeader';
import { ReportesStats, ReportesGrid, type BackendReportVisit } from '@widgets/reportes';
import { MODALIDAD_NIVEL_MAP, RoleCode } from '@sistema-monitoreo/shared-contracts';
import { useUser } from '@entities/model-user';
import { useScope } from '@shared/auth';

const getFichaState = (visitId: string) => {
  const saved = localStorage.getItem(`sistema-monitoreo:ficha-state:${visitId}`);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (err) {
      console.warn('Invalid JSON in localStorage', err);
    }
  }
  
  // Mock pre-filled state for completed mock visits
  const defaultComments = 'Se evidencia un óptimo desempeño de las actividades. El plan de trabajo institucional está alineado con las directrices de la UGEL. Se recomienda reforzar el acompañamiento en aula para asegurar la continuidad pedagógica e incrementar el monitoreo formativo.';
  const defaultAspects: Record<string, boolean> = {
    'd1_a1': true, 'd1_a2': true, 'd1_a3': true,
    'd2_a1': true, 'd2_a2': true, 'd2_a3': false,
    'd3_a1': true, 'd3_a2': true, 'd3_a3': true,
    'a1_1': true, 'a1_2': true, 'a1_3': true,
    'a2_1': true, 'a2_2': true, 'a2_3': true,
    'a3_1': true, 'a3_2': true, 'a3_3': false,
    'dd1_a1': true, 'dd1_a2': true, 'dd1_a3': true,
    'dd2_a1': true, 'dd2_a2': true, 'dd2_a3': true,
    'dd3_a1': true, 'dd3_a2': true, 'dd3_a3': true,
    'ad1_1': true, 'ad1_2': true, 'ad1_3': true,
    'ad2_1': true, 'ad2_2': true, 'ad2_3': true,
    'ad3_1': true, 'ad3_2': true, 'ad3_3': true,
  };
  
  const defaultLevels: Record<string, string> = {
    'd1': 'III', 'd2': 'III', 'd3': 'IV',
    'a1': 'III', 'a2': 'III', 'a3': 'IV',
    'dd1': 'III', 'dd2': 'III', 'dd3': 'IV',
    'ad1': 'III', 'ad2': 'III', 'ad3': 'IV',
  };
  
  return {
    checkedAspects: defaultAspects,
    selectedLevels: defaultLevels,
    generalComments: defaultComments
  };
};

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

  const { cronogramas } = useCronogramasData();
  const { data: plantillas = [] } = usePlantillasList();
  const { data: fichasCompletadasData } = useFichasCompletadas({ page: 1, limit: 50 });

  // ── Estados de Vista e Interacción ──
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // ── Filtros ──
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalidad, setFilterModalidad] = useState('Todos');
  const [filterNivel, setFilterNivel] = useState('Todos');
  const [filterAnio, setFilterAnio] = useState('Todos');

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
      let list = fichasCompletadasData.data.map((f) => ({
        id: f.id, // Ficha ID
        cronogramaId: f.cronogramaId,
        fechaHora: f.fechaEjecucion,
        especialista: f.especialistaNombre,
        especialistaInitials: f.especialistaNombre
          .split(' ')
          .map((n) => n[0] || '')
          .join('')
          .toUpperCase(),
        institucion: `${f.institucionNombre} - ${f.institucionCodigoModular}`,
        docenteDirectivo: f.evaluadoNombre,
        tipo: f.tipoMonitoreo,
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
      }));

      if (isEvaluatedView) {
        const userFullName = `${user?.nombres} ${user?.apellidos}`.toLowerCase();
        list = list.filter((v) => {
          const visitDocente = v.docenteDirectivo.toLowerCase();
          return (
            userFullName.includes(visitDocente) ||
            visitDocente.includes(userFullName)
          );
        });
      } else {
        const userFullName = `${user?.nombres} ${user?.apellidos}`.toLowerCase();
        list = list.filter((v) => {
          const visitDocente = v.docenteDirectivo.toLowerCase();
          return !(
            userFullName.includes(visitDocente) ||
            visitDocente.includes(userFullName)
          );
        });
      }
      return list;
    }

    let list = cronogramas.filter((c) => c.estado === 'COMPLETADO');
    const userFullName = `${user?.nombres} ${user?.apellidos}`.toLowerCase();

    if (isEvaluatedView) {
      list = list.filter((v) => {
        const visitDocente = v.docenteDirectivo.toLowerCase();
        return (
          userFullName.includes(visitDocente) ||
          visitDocente.includes(userFullName)
        );
      });
    } else {
      // Exclude own reports from completed sheets list for school evaluators
      list = list.filter((v) => {
        const visitDocente = v.docenteDirectivo.toLowerCase();
        return !(
          userFullName.includes(visitDocente) ||
          visitDocente.includes(userFullName)
        );
      });

      // Quien puede figurar como evaluador asignado de una visita filtra por sí
      // mismo; el director de institución filtra por su colegio (rama de abajo).
      // El jefe de área se suma a los monitores de campo porque su cargo de
      // especialista le concede `monitoreo:execute` y puede quedar asignado.
      // El `user &&` no es defensivo de más: antes, la comparación `user?.role`
      // estrechaba el tipo a no nulo dentro de la rama, y `isMonitorCampo` no lo
      // hace. Sin él, el acceso a `user.nombres` de abajo queda sin garantía.
      if (user && (isMonitorCampo || user.role === RoleCode.JEFE_AREA)) {
        const nombrePila = user.nombres.toLowerCase();
        list = list.filter((v) => {
          const visitEspecialista = v.especialista.toLowerCase();
          return (
            userFullName.includes(visitEspecialista) ||
            visitEspecialista.includes(userFullName) ||
            visitEspecialista.includes(nombrePila)
          );
        });
      } else if (user?.role === RoleCode.DIRECTOR_INSTITUCION) {
        list = list.filter((v) => {
          const userSchool = (user.institucionNombre || '').toLowerCase();
          const visitSchool = v.institucion.toLowerCase();
          return visitSchool.includes(userSchool) || userSchool.includes(visitSchool);
        });
      }
    }
    return list;
  }, [fichasCompletadasData, cronogramas, user, isEvaluatedView, isMonitorCampo]);

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

  const filteredVisits = useMemo(() => {
    return completedVisits.filter((visit) => {
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
    });
  }, [completedVisits, searchQuery, filterModalidad, filterNivel, filterAnio]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterModalidad('Todos');
    setFilterNivel('Todos');
    setFilterAnio('Todos');
  };

  const isAnyFilterActive =
    searchQuery !== '' || filterModalidad !== 'Todos' || filterNivel !== 'Todos' || filterAnio !== 'Todos';

  // ── Métricas Estadísticas (KPIs) ──
  const stats = useMemo(() => {
    const total = completedVisits.length;
    const docentes = completedVisits.filter((v) => v.tipo === 'DOCENTE').length;
    const directivos = completedVisits.filter((v) => v.tipo === 'DIRECTIVO').length;

    // Calcular promedios de calificación simulados / cargados
    let totalLevelsCount = 0;
    let highLevelsCount = 0; // Niveles III y IV

    completedVisits.forEach((v) => {
      const fichaState = getFichaState(v.id);
      Object.values(fichaState.selectedLevels).forEach((level) => {
        totalLevelsCount++;
        if (level === 'III' || level === 'IV') {
          highLevelsCount++;
        }
      });
    });

    const satisfactionPercent =
      totalLevelsCount > 0 ? Math.round((highLevelsCount / totalLevelsCount) * 100) : 85;

    // Contar IEs únicas
    const uniqueIEs = new Set(completedVisits.map((v) => v.institucion.split(' - ')[0])).size;

    // ── Métricas exclusivas para vista de evaluado (docente) ──
    const promedioGeneral =
      total > 0
        ? Number(
            (
              completedVisits.reduce((acc, v) => acc + (v.promedio ?? 0), 0) / total
            ).toFixed(2),
          )
        : undefined;

    // Nivel logro más reciente (último por fechaHora)
    const sorted = [...completedVisits].sort(
      (a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime(),
    );
    const nivelLogroMasFrecuente = sorted[0]?.nivelLogro ?? undefined;

    // Especialistas únicos que evaluaron al docente
    const uniqueEspecialistas = new Set(
      completedVisits.map((v) => v.especialista).filter(Boolean),
    ).size;

    return {
      total,
      docentes,
      directivos,
      satisfactionPercent,
      uniqueIEs,
      promedioGeneral,
      nivelLogroMasFrecuente,
      uniqueEspecialistas,
    };
  }, [completedVisits]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Encabezado de Página ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <PageHeader
            title={
              isMyReportsPath
                ? 'Mis Reportes de Monitoreo'
                : esAutorDeFichas
                  ? 'Fichas de Monitoreo Completadas'
                  : 'Fichas Completadas en Cuadrícula'
            }
            description={
              isMyReportsPath
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
