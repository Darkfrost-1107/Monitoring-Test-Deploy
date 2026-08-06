import { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, RefreshCw } from 'lucide-react';
import { PageHeader } from '@shared/ui/pageHeader';
import { useUser } from '@entities/model-user';
import { useScope } from '@shared/auth';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';
import { useCronogramasData } from '@features/cronogramas/hooks/use-cronogramas-data';
import { CalendarioGrid, CalendarioSidebar } from '@widgets/calendario';
import { BandejaReprogramaciones } from '@widgets/reprogramaciones';

export const CalendarioPage = () => {
  const { user } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  // Quien levanta la ficha en el aula. El nombre anterior, `isEspecialista`,
  // incluía además al coordinador pedagógico y al jefe de taller.
  const { isMonitorCampo } = useScope();
  const isEspecialista = isMonitorCampo;
  const { cronogramas, reprogramaciones } = useCronogramasData();

  // ── Estados de Navegación ──
  // Deep-link: si la URL trae ?tab=solicitudes (p. ej. desde la notificación de
  // solicitud de reprogramación), abrir directo la Bandeja de Reprogramaciones.
  const [activeTab, setActiveTab] = useState<'CALENDARIO' | 'SOLICITUDES'>(() =>
    new URLSearchParams(location.search).get('tab') === 'solicitudes' ? 'SOLICITUDES' : 'CALENDARIO',
  );
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [activeView, setActiveView] = useState<'MENSUAL' | 'SEMANAL' | 'DIARIO' | 'ANUAL' | 'LISTA'>('MENSUAL');

  // ── Selección activa de fecha y visita ──
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState<boolean>(true);

  // ── Auto-navegación tras crear/editar cronograma ──
  // Si llegamos desde CronogramaPage con state.newDate (YYYY-MM-DD),
  // navegamos el calendario a esa fecha y limpiamos el state.
  useEffect(() => {
    const newDate = (location.state as { newDate?: string } | null)?.newDate;
    if (newDate) {
      const parts = newDate.split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts.map(Number);
        const target = new Date(y, m - 1, d, 12);
        if (!isNaN(target.getTime())) {
          setTimeout(() => setCurrentDate(target), 0);
          setTimeout(() => setSelectedDateStr(newDate), 0);
        }
      }
      // Limpia el state para no re-navegar al refrescar la página
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  // ── Filtros del Calendario ──
  const [filterModalidad, setFilterModalidad] = useState('Todos');
  const [filterNivel, setFilterNivel] = useState('Todos');
  const [filterEspecialista, setFilterEspecialista] = useState('Todos');
  const [filterTipo, setFilterTipo] = useState('Todos');
  const [filterNroVisita, setFilterNroVisita] = useState('Todos');
  const [filterEstado, setFilterEstado] = useState('Todos');

  const isDirector = user?.role === RoleCode.DIRECTOR_INSTITUCION;

  const showBandeja = useMemo(() => {
    if (isDirector) {
      return user?.institucionNivel === 'Secundaria';
    }
    return true;
  }, [isDirector, user]);

  // Nombre del especialista logueado para filtro
  const specialistFilterName = useMemo(() => {
    if (!isEspecialista || !user) return '';
    return `${user.nombres} ${user.apellidos}`;
  }, [isEspecialista, user]);

  // Base visits for the user
  const filterBaseVisits = useMemo(() => {
    return cronogramas.filter((visit) => {
      if (isEspecialista && specialistFilterName) {
        return visit.especialista === specialistFilterName;
      }
      return true;
    });
  }, [cronogramas, isEspecialista, specialistFilterName]);

  const modalidadesUnicas = useMemo(() => {
    const list = new Set<string>();
    filterBaseVisits.forEach((c) => {
      if (c.modalidad) list.add(c.modalidad);
    });
    return Array.from(list);
  }, [filterBaseVisits]);

  // Cascading Nivel Options
  const nivelesDisponibles = useMemo(() => {
    const list = new Set<string>();
    if (filterModalidad === 'Todos') {
      filterBaseVisits.forEach((c) => {
        if (c.nivel) list.add(c.nivel);
      });
    } else {
      filterBaseVisits.forEach((c) => {
        if (c.modalidad === filterModalidad && c.nivel) list.add(c.nivel);
      });
    }
    return Array.from(list);
  }, [filterBaseVisits, filterModalidad]);

  const handleModalidadChange = (modalidad: string) => {
    setFilterModalidad(modalidad);
    setFilterNivel('Todos');
  };

  const isAnyFilterActive = isDirector
    ? filterTipo !== 'Todos' ||
      filterEspecialista !== 'Todos' ||
      filterNroVisita !== 'Todos' ||
      filterEstado !== 'Todos'
    : filterModalidad !== 'Todos' ||
      filterNivel !== 'Todos' ||
      filterEspecialista !== 'Todos' ||
      filterTipo !== 'Todos';

  const handleClearFilters = () => {
    setFilterModalidad('Todos');
    setFilterNivel('Todos');
    setFilterEspecialista('Todos');
    setFilterTipo('Todos');
    setFilterNroVisita('Todos');
    setFilterEstado('Todos');
  };



  // Obtener lista única de especialistas
  const listaEspecialistas = useMemo(() => {
    const list = new Set<string>();
    cronogramas.forEach((c) => {
      if (c.especialista) list.add(c.especialista);
    });
    return Array.from(list);
  }, [cronogramas]);

  // Conteo de solicitudes pendientes
  const pendingCount = useMemo(() => {
    return cronogramas.reduce((acc, visit) => {
      const req = reprogramaciones[visit.id];
      if (req && req.estado === 'PENDIENTE') {
        return acc + 1;
      }
      return acc;
    }, 0);
  }, [cronogramas, reprogramaciones]);

  // Filtrado de visitas
  const filteredVisits = useMemo(() => {
    return cronogramas.filter((visit) => {
      if (isEspecialista && specialistFilterName) {
        if (visit.especialista !== specialistFilterName) {
          return false;
        }
      }
      if (isDirector && user) {
        const isSameSchool =
          (user.institucion && visit.institucionId === user.institucion) ||
          (user.institucionNombre &&
            visit.institucion.toLowerCase() === user.institucionNombre.toLowerCase());

        const userFullName = `${user.nombres} ${user.apellidos}`.toLowerCase();
        const isDirectedToMe =
          visit.tipo === 'DIRECTIVO' &&
          (visit.docenteDirectivo.toLowerCase().includes(userFullName) ||
            userFullName.includes(visit.docenteDirectivo.toLowerCase()) ||
            visit.docenteDirectivo.toLowerCase().includes(user.nombres.toLowerCase()));

        if (!isSameSchool && !isDirectedToMe) {
          return false;
        }
      }

      if (user?.role === RoleCode.JEFE_AREA && user.especialistaNivel) {
        const nivel = user.especialistaNivel;
        if (nivel === 'Inicial') {
          if (visit.modalidad !== 'EBE' && visit.nivel !== 'Inicial') return false;
        } else if (nivel === 'Primaria') {
          if (visit.nivel !== 'Primaria') return false;
        } else if (nivel === 'Secundaria') {
          if (!['SECUNDARIA', 'EBA', 'CEPTRO'].includes((visit.modalidad ?? '').toUpperCase()) && visit.nivel !== 'Secundaria') return false;
        }
      }

      // Filtros específicos de Director
      if (isDirector) {
        if (filterNroVisita !== 'Todos' && visit.nroVisita !== filterNroVisita) return false;
        if (filterEstado !== 'Todos' && visit.estado !== filterEstado) return false;
      } else {
        // Filtros de UGEL
        if (filterModalidad !== 'Todos' && visit.modalidad !== filterModalidad) return false;
        if (filterNivel !== 'Todos' && visit.nivel !== filterNivel) return false;
      }

      // Filtros compartidos
      if (filterEspecialista !== 'Todos' && visit.especialista !== filterEspecialista) return false;
      if (filterTipo !== 'Todos' && visit.tipo !== filterTipo) return false;

      return true;
    });
  }, [
    cronogramas,
    isEspecialista,
    specialistFilterName,
    isDirector,
    user,
    filterModalidad,
    filterNivel,
    filterEspecialista,
    filterTipo,
    filterNroVisita,
    filterEstado
  ]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Encabezado de Página ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Calendario de Monitoreo"
          description="Planificación y seguimiento de visitas institucionales."
        />

        {/* Toggle de vistas principal */}
        {activeTab === 'CALENDARIO' && (
          <div className="inline-flex rounded-xl border border-border p-1 bg-surface shadow-sm">
            {(['MENSUAL', 'SEMANAL', 'DIARIO', 'ANUAL', 'LISTA'] as const).map((view) => (
              <button
                key={view}
                onClick={() => {
                  setActiveView(view);
                  if (view === 'DIARIO') {
                    const currStr = `${currentDate.getFullYear()}-${String(
                      currentDate.getMonth() + 1
                    ).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
                    setSelectedDateStr(currStr);
                    const dayVisits = filteredVisits.filter(
                      (v) => v.fechaHora.substring(0, 10) === currStr
                    );
                    if (dayVisits.length > 0) {
                      setSelectedVisitId(dayVisits[0].id);
                    }
                  }
                }}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeView === view
                    ? 'bg-primary text-white shadow-md'
                    : 'text-text-muted hover:text-text hover:bg-slate-50'
                }`}
              >
                {view === 'MENSUAL'
                  ? 'Mensual'
                  : view === 'SEMANAL'
                    ? 'Semanal'
                    : view === 'DIARIO'
                      ? 'Diario'
                      : view === 'ANUAL'
                        ? 'Anual'
                        : 'Lista'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Tabs de Navegación Principal ── */}
      <div className="border-b border-border flex gap-6 pb-px">
        <button
          onClick={() => setActiveTab('CALENDARIO')}
          className={`pb-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 relative cursor-pointer ${
            activeTab === 'CALENDARIO'
              ? 'border-primary text-primary font-extrabold'
              : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Calendario de Monitoreos</span>
        </button>
        {showBandeja && (
          <button
            onClick={() => setActiveTab('SOLICITUDES')}
            className={`pb-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 relative cursor-pointer ${
              activeTab === 'SOLICITUDES'
                ? 'border-primary text-primary font-extrabold'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <RefreshCw className="h-4 w-4" />
            <span>Bandeja de Reprogramaciones</span>
            {pendingCount > 0 && (
              <span className="absolute -top-1.5 -right-3.5 bg-amber-500 text-white font-extrabold text-[9px] h-4.5 min-w-4.5 px-1.5 rounded-full flex items-center justify-center border border-surface shadow-sm animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>
        )}
      </div>

      {activeTab === 'CALENDARIO' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna Izquierda: Calendario */}
          <div className={showDetailsPanel ? 'lg:col-span-8' : 'lg:col-span-12'}>
            <CalendarioGrid
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              activeView={activeView}
              setActiveView={setActiveView}
              selectedDateStr={selectedDateStr}
              setSelectedDateStr={setSelectedDateStr}
              selectedVisitId={selectedVisitId}
              setSelectedVisitId={setSelectedVisitId}
              filteredVisits={filteredVisits}
              showDetailsPanel={showDetailsPanel}
              setShowDetailsPanel={setShowDetailsPanel}
              filterModalidad={filterModalidad}
              setFilterModalidad={handleModalidadChange}
              filterNivel={filterNivel}
              setFilterNivel={setFilterNivel}
              filterEspecialista={filterEspecialista}
              setFilterEspecialista={setFilterEspecialista}
              filterTipo={filterTipo}
              setFilterTipo={setFilterTipo}
              filterNroVisita={filterNroVisita}
              setFilterNroVisita={setFilterNroVisita}
              filterEstado={filterEstado}
              setFilterEstado={setFilterEstado}
              listaEspecialistas={listaEspecialistas}
              modalidadesDisponibles={modalidadesUnicas}
              nivelesDisponibles={nivelesDisponibles}
              isAnyFilterActive={isAnyFilterActive}
              handleClearFilters={handleClearFilters}
            />
          </div>

          {/* Columna Derecha: Sidebar de detalles */}
          {showDetailsPanel && (
            <CalendarioSidebar
              selectedVisitId={selectedVisitId}
              setSelectedVisitId={setSelectedVisitId}
              selectedDateStr={selectedDateStr}
              onClose={() => setShowDetailsPanel(false)}
              filteredVisits={filteredVisits}
            />
          )}
        </div>
      ) : (
        <BandejaReprogramaciones />
      )}
    </div>
  );
};
