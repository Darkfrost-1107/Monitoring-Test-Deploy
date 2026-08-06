import { useMemo } from 'react';
import {
  Compass,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  Hash,
  Filter,
  GraduationCap,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { SelectField } from '@/shared/ui/form-controls';
import type { Cronograma } from '@/entities/model-cronogramas';
import { useUser } from '@/entities/model-user';
import { useScope } from '@shared/auth';
import {
  WEEK_DAYS,
  claveDeHoy,
  construirCuadriculaMensual,
  construirSemana,
} from '@shared/lib/calendario/grid';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';

interface CalendarioGridProps {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  activeView: 'MENSUAL' | 'SEMANAL' | 'DIARIO' | 'ANUAL' | 'LISTA';
  setActiveView: React.Dispatch<React.SetStateAction<'MENSUAL' | 'SEMANAL' | 'DIARIO' | 'ANUAL' | 'LISTA'>>;
  selectedDateStr: string;
  setSelectedDateStr: (d: string) => void;
  selectedVisitId: string | null;
  setSelectedVisitId: (id: string | null) => void;
  filteredVisits: Cronograma[];
  showDetailsPanel: boolean;
  setShowDetailsPanel: (b: boolean) => void;
  filterModalidad: string;
  setFilterModalidad: (s: string) => void;
  filterNivel: string;
  setFilterNivel: (s: string) => void;
  filterEspecialista: string;
  setFilterEspecialista: (s: string) => void;
  filterTipo: string;
  setFilterTipo: (s: string) => void;
  filterNroVisita: string;
  setFilterNroVisita: (s: string) => void;
  filterEstado: string;
  setFilterEstado: (s: string) => void;
  listaEspecialistas: string[];
  modalidadesDisponibles: string[];
  nivelesDisponibles: string[];
  isAnyFilterActive: boolean;
  handleClearFilters: () => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];



const formatVisitTime = (fechaHoraStr: string) => {
  try {
    const parts = fechaHoraStr.split('T');
    if (parts.length > 1) {
      const [h, m] = parts[1].split(':');
      const hour = parseInt(h);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${m} ${ampm}`;
    }
    const d = new Date(fechaHoraStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    return fechaHoraStr;
  } catch {
    return fechaHoraStr;
  }
};

const formatVisitDate = (fechaHoraStr: string) => {
  try {
    const datePart = fechaHoraStr.includes('T') ? fechaHoraStr.split('T')[0] : fechaHoraStr;
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      const dateObj = new Date(year, month - 1, day);
      if (!isNaN(dateObj.getTime())) {
        const options: Intl.DateTimeFormatOptions = {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        };
        const formatted = dateObj.toLocaleDateString('es-ES', options);
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
      }
    }
    const d = new Date(fechaHoraStr);
    if (!isNaN(d.getTime())) {
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      };
      const formatted = d.toLocaleDateString('es-ES', options);
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }
    return fechaHoraStr;
  } catch {
    return fechaHoraStr;
  }
};

const getVisitTagColor = (estado: string) => {
  switch (estado) {
    case 'PROGRAMADO':
      return 'bg-blue-50/70 text-blue-800 border-blue-200 hover:bg-blue-100/70';
    case 'EN_PROCESO':
      return 'bg-rose-50/70 text-rose-800 border-rose-200 hover:bg-rose-100/70';
    case 'COMPLETADO':
      return 'bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-100/70';
    case 'REPROGRAMADO':
      return 'bg-amber-50/70 text-amber-800 border-amber-200 hover:bg-amber-100/70';
    case 'CANCELADO':
      return 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

const getVisitColorDot = (estado: string) => {
  switch (estado) {
    case 'PROGRAMADO':
      return 'bg-blue-500';
    case 'EN_PROCESO':
      return 'bg-rose-500';
    case 'COMPLETADO':
      return 'bg-emerald-500';
    case 'REPROGRAMADO':
      return 'bg-amber-500';
    case 'CANCELADO':
      return 'bg-slate-400';
    default:
      return 'bg-slate-400';
  }
};

const getVisitStatusBadgeClass = (estado: string) => {
  switch (estado) {
    case 'PROGRAMADO':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'EN_PROCESO':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    case 'COMPLETADO':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'REPROGRAMADO':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'CANCELADO':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

export const CalendarioGrid = ({
  currentDate,
  setCurrentDate,
  activeView,
  setActiveView,
  selectedDateStr,
  setSelectedDateStr,
  selectedVisitId,
  setSelectedVisitId,
  filteredVisits,
  showDetailsPanel,
  setShowDetailsPanel,
  filterModalidad,
  setFilterModalidad,
  filterNivel,
  setFilterNivel,
  filterEspecialista,
  setFilterEspecialista,
  filterTipo,
  setFilterTipo,
  filterNroVisita,
  setFilterNroVisita,
  filterEstado,
  setFilterEstado,
  listaEspecialistas,
  modalidadesDisponibles,
  nivelesDisponibles,
  isAnyFilterActive,
  handleClearFilters,
}: CalendarioGridProps) => {
  const { user } = useUser();
  // `isEspecialista` incluía también al coordinador pedagógico y al jefe de
  // taller: quienes levantan la ficha en el aula, no un cargo concreto.
  const { isMonitorCampo } = useScope();
  const isEspecialista = isMonitorCampo;
  const isDirector = user?.role === RoleCode.DIRECTOR_INSTITUCION;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const sortedVisits = useMemo(() => {
    return [...filteredVisits].sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
  }, [filteredVisits]);

  const getLabelForHeader = () => {
    if (activeView === 'MENSUAL' || activeView === 'ANUAL') {
      return `${MONTH_NAMES[month]} ${year}`;
    }
    
    if (activeView === 'SEMANAL') {
      const start = new Date(currentDate);
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()} - ${end.getDate()} de ${MONTH_NAMES[start.getMonth()]} ${year}`;
      }
      return `${start.getDate()} de ${MONTH_NAMES[start.getMonth()]} - ${end.getDate()} de ${MONTH_NAMES[end.getMonth()]} ${year}`;
    }
    
    if (activeView === 'DIARIO') {
      return `${currentDate.getDate()} de ${MONTH_NAMES[month]} ${year}`;
    }
    
    return `${MONTH_NAMES[month]} ${year}`;
  };

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (activeView === 'MENSUAL' || activeView === 'ANUAL') {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else if (activeView === 'SEMANAL') {
      newDate.setDate(currentDate.getDate() - 7);
    } else if (activeView === 'DIARIO') {
      newDate.setDate(currentDate.getDate() - 1);
      const y = newDate.getFullYear();
      const m = String(newDate.getMonth() + 1).padStart(2, '0');
      const d = String(newDate.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      setSelectedDateStr(dateStr);
      const dayVisits = filteredVisits.filter((v) => v.fechaHora.substring(0, 10) === dateStr);
      if (dayVisits.length > 0) {
        setSelectedVisitId(dayVisits[0].id);
      } else {
        setSelectedVisitId(null);
      }
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (activeView === 'MENSUAL' || activeView === 'ANUAL') {
      newDate.setMonth(currentDate.getMonth() + 1);
    } else if (activeView === 'SEMANAL') {
      newDate.setDate(currentDate.getDate() + 7);
    } else if (activeView === 'DIARIO') {
      newDate.setDate(currentDate.getDate() + 1);
      const y = newDate.getFullYear();
      const m = String(newDate.getMonth() + 1).padStart(2, '0');
      const d = String(newDate.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      setSelectedDateStr(dateStr);
      const dayVisits = filteredVisits.filter((v) => v.fechaHora.substring(0, 10) === dateStr);
      if (dayVisits.length > 0) {
        setSelectedVisitId(dayVisits[0].id);
      } else {
        setSelectedVisitId(null);
      }
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;
    setSelectedDateStr(todayStr);

    const dayVisits = filteredVisits.filter((v) => v.fechaHora.substring(0, 10) === todayStr);
    if (dayVisits.length > 0) {
      setSelectedVisitId(dayVisits[0].id);
    } else {
      setSelectedVisitId(null);
    }
  };

  const handleSelectDayCell = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    const dayVisits = filteredVisits.filter((v) => v.fechaHora.substring(0, 10) === dateStr);
    if (dayVisits.length > 0) {
      setSelectedVisitId(dayVisits[0].id);
    } else {
      setSelectedVisitId(null);
    }
    setShowDetailsPanel(true);
  };

  const handleSelectVisitDirectly = (visitId: string, dateStr: string) => {
    setSelectedDateStr(dateStr);
    setSelectedVisitId(visitId);
    setShowDetailsPanel(true);
  };

  // Las tres construcciones viven en `shared/lib/calendario`: son aritmética de
  // fechas sin dependencia de React, y allí sí pueden probarse.
  const calendarCells = useMemo(() => construirCuadriculaMensual(year, month), [year, month]);

  const weekDays = useMemo(() => construirSemana(currentDate), [currentDate]);

  const systemTodayStr = useMemo(() => claveDeHoy(), []);

  const visitsOnSelectedDate = useMemo(() => {
    return filteredVisits.filter((v) => v.fechaHora.substring(0, 10) === selectedDateStr);
  }, [filteredVisits, selectedDateStr]);

  return (
    <div className="space-y-6">
      {/* ── Panel de Filtros ── */}
      <Card className="p-5 border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <Filter className="h-4 w-4 text-primary" />
            <span>Filtros de Búsqueda</span>
          </div>
          {isAnyFilterActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="text-xs text-primary hover:text-primary-hover h-8 cursor-pointer"
            >
              Limpiar Filtros
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {isDirector ? (
            <>
              <SelectField
                label="Tipo de Monitoreo"
                value={filterTipo}
                onChange={(val) => setFilterTipo(val)}
                placeholder="Seleccione tipo"
                options={[
                  { value: 'Todos', label: 'Todos los tipos' },
                  { value: 'DOCENTE', label: 'Monitoreo a Docentes' },
                  { value: 'DIRECTIVO', label: 'Monitoreo a Directivos' },
                ]}
              />

              <SelectField
                label="Especialista Responsable"
                value={filterEspecialista}
                onChange={(val) => setFilterEspecialista(val)}
                placeholder="Seleccione especialista"
                options={[
                  { value: 'Todos', label: 'Todos los especialistas' },
                  ...listaEspecialistas.map((esp) => ({ value: esp, label: esp })),
                ]}
              />

              <SelectField
                label="Número de Monitoreo"
                value={filterNroVisita}
                onChange={(val) => setFilterNroVisita(val)}
                placeholder="Seleccione Nº de visita"
                options={[
                  { value: 'Todos', label: 'Todos los números' },
                  { value: '01', label: 'Monitoreo 01' },
                  { value: '02', label: 'Monitoreo 02' },
                  { value: '03', label: 'Monitoreo 03' },
                  { value: '04', label: 'Monitoreo 04' },
                ]}
              />

              <SelectField
                label="Estado de Monitoreo"
                value={filterEstado}
                onChange={(val) => setFilterEstado(val)}
                placeholder="Seleccione estado"
                options={[
                  { value: 'Todos', label: 'Todos los estados' },
                  { value: 'PROGRAMADO', label: 'PROGRAMADO' },
                  { value: 'EN_PROCESO', label: 'EN_PROCESO' },
                  { value: 'COMPLETADO', label: 'COMPLETADO' },
                  { value: 'REPROGRAMADO', label: 'REPROGRAMADO' },
                  { value: 'CANCELADO', label: 'CANCELADO' },
                ]}
              />
            </>
          ) : (
            <>
              <SelectField
                label="Modalidad"
                value={filterModalidad}
                onChange={(val) => setFilterModalidad(val)}
                placeholder="Seleccione modalidad"
                options={[
                  { value: 'Todos', label: 'Todas las modalidades' },
                  ...modalidadesDisponibles.map((m) => ({ value: m, label: m })),
                ]}
              />

              <SelectField
                label="Nivel Educativo"
                value={filterNivel}
                onChange={(val) => setFilterNivel(val)}
                placeholder="Seleccione nivel"
                options={[
                  { value: 'Todos', label: 'Todos los niveles' },
                  ...nivelesDisponibles.map((n) => ({ value: n, label: n })),
                ]}
              />

              {!isEspecialista ? (
                <SelectField
                  label="Especialista Responsable"
                  value={filterEspecialista}
                  onChange={(val) => setFilterEspecialista(val)}
                  placeholder="Seleccione especialista"
                  options={[
                    { value: 'Todos', label: 'Todos los especialistas' },
                    ...listaEspecialistas.map((esp) => ({ value: esp, label: esp })),
                  ]}
                />
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block pb-0.5">
                    Especialista Asignado
                  </label>
                  <div className="bg-slate-50 border border-slate-200 text-slate-700 font-bold px-3 py-2.5 rounded-lg text-sm shadow-inner leading-none h-10 flex items-center">
                    {user?.nombres} {user?.apellidos}
                  </div>
                </div>
              )}

              <SelectField
                label="Tipo de Monitoreo"
                value={filterTipo}
                onChange={(val) => setFilterTipo(val)}
                placeholder="Seleccione tipo"
                options={[
                  { value: 'Todos', label: 'Todos los tipos' },
                  { value: 'DOCENTE', label: 'Monitoreo a Docentes' },
                  { value: 'DIRECTIVO', label: 'Monitoreo a Directivos' },
                ]}
              />
            </>
          )}
        </div>
      </Card>

      {/* ── Sub-header: Navegación de Fecha y Leyendas ── */}
      <Card className="p-4 border border-border bg-surface flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleToday}
            className="text-xs font-semibold hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm cursor-pointer"
          >
            Hoy
          </Button>
          <div className="flex items-center border border-border rounded-lg bg-surface shadow-sm overflow-hidden">
            <button
              onClick={handlePrev}
              className="p-2 text-slate-600 hover:bg-slate-50 transition-colors border-r border-border cursor-pointer"
              title="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-2 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight pl-2">
            {getLabelForHeader()}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-blue-500 inline-block shadow-sm"></span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Programado</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-500 inline-block shadow-sm"></span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">En Proceso</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block shadow-sm"></span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Realizado</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-amber-500 inline-block shadow-sm"></span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reprogramado</span>
          </div>
        </div>
      </Card>

      {/* ── Área Principal de Contenido ── */}
      <div className={`${showDetailsPanel ? 'lg:col-span-8' : 'lg:col-span-12'} bg-surface border border-border rounded-xl p-5 shadow-sm transition-all duration-300`}>
        {/* 1. VISTA MENSUAL */}
        {activeView === 'MENSUAL' && (
          <div className="space-y-2">
            <div className="grid grid-cols-7 border-b border-border pb-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
              {WEEK_DAYS.map((day) => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 grid-rows-6 gap-px bg-slate-100 border border-border rounded-xl overflow-hidden shadow-inner">
              {calendarCells.map((cell, idx) => {
                const visitsInCell = filteredVisits.filter(
                  (v) => v.fechaHora.substring(0, 10) === cell.dateStr
                );
                const isSelected = selectedDateStr === cell.dateStr;
                const isToday = cell.dateStr === systemTodayStr;

                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectDayCell(cell.dateStr)}
                    className={`min-h-[110px] p-2 flex flex-col justify-between transition-all duration-200 relative cursor-pointer select-none group ${
                      cell.isCurrentMonth
                        ? 'bg-surface hover:bg-slate-50/70'
                        : 'bg-slate-50/40 text-slate-400'
                    } ${
                      isSelected
                        ? 'ring-2 ring-primary border-transparent bg-primary-light/10 z-10'
                        : 'border-b border-r border-slate-100'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      {isToday ? (
                        <span className="text-[10px] font-bold text-primary bg-primary-light border border-primary/20 px-1.5 py-0.5 rounded-md">
                          HOY
                        </span>
                      ) : (
                        <span></span>
                      )}
                      <span
                        className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-colors ${
                          isToday
                            ? 'bg-primary text-white shadow-sm'
                            : isSelected
                              ? 'text-primary bg-primary-light/80 font-black'
                              : cell.isCurrentMonth
                                ? 'text-slate-700'
                                : 'text-slate-300'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                    </div>

                    <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[70px] pr-0.5 scrollbar-thin">
                      {visitsInCell.slice(0, 2).map((visit) => {
                        const firstName = visit.especialista.split(' ')[0];
                        return (
                          <div
                            key={visit.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectVisitDirectly(visit.id, cell.dateStr);
                            }}
                            className={`w-full px-2 py-1 rounded-md text-[10px] font-bold text-left truncate border flex items-center gap-1.5 transition-all hover:translate-x-0.5 shadow-sm ${getVisitTagColor(
                              visit.estado
                            )}`}
                            title={`${visit.especialista} - ${visit.institucion}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${getVisitColorDot(
                                visit.estado
                              )} shrink-0`}
                            ></span>
                            <span className="truncate">Esp. {firstName}</span>
                          </div>
                        );
                      })}
                      {visitsInCell.length > 2 && (
                        <div className="text-[9.5px] font-extrabold text-slate-500 pl-1 group-hover:text-primary transition-colors">
                          + {visitsInCell.length - 2} más
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. VISTA SEMANAL */}
        {activeView === 'SEMANAL' && (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {weekDays.map((day, idx) => {
              const visitsInCell = filteredVisits.filter(
                (v) => v.fechaHora.substring(0, 10) === day.dateStr
              );
              const isSelected = selectedDateStr === day.dateStr;
              const isToday = day.dateStr === systemTodayStr;

              return (
                <div
                  key={idx}
                  onClick={() => handleSelectDayCell(day.dateStr)}
                  className={`border rounded-xl p-3 min-h-[300px] flex flex-col transition-all cursor-pointer ${
                    isSelected
                      ? 'border-primary ring-1 ring-primary bg-primary-light/5 shadow-md'
                      : isToday
                        ? 'border-primary/40 bg-slate-50'
                        : 'border-border bg-surface hover:bg-slate-50/50'
                  }`}
                >
                  <div className="text-center pb-2 border-b border-border mb-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {day.name}
                    </div>
                    <div
                      className={`text-lg font-extrabold w-8 h-8 mx-auto flex items-center justify-center rounded-full mt-1 ${
                        isToday
                          ? 'bg-primary text-white shadow-sm'
                          : isSelected
                            ? 'text-primary bg-primary-light font-black'
                            : 'text-slate-800'
                      }`}
                    >
                      {day.dayNumber}
                    </div>
                  </div>

                  <div className="flex-1 space-y-2.5 overflow-y-auto">
                    {visitsInCell.map((visit) => (
                      <div
                        key={visit.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectVisitDirectly(visit.id, day.dateStr);
                        }}
                        className={`p-2.5 rounded-lg border text-xs text-left transition-all hover:scale-[1.02] shadow-sm flex flex-col gap-1.5 cursor-pointer ${getVisitTagColor(
                          visit.estado
                        )} ${selectedVisitId === visit.id ? 'ring-1 ring-primary/40 border-primary' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-extrabold truncate">
                            {visit.institucion.split(' - ')[0]}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 shrink-0">
                            {formatVisitTime(visit.fechaHora)}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <User className="h-3 w-3 inline text-slate-400" />
                          <span className="truncate">{visit.especialista}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded font-black bg-white/70 shadow-sm border border-slate-100">
                            {visit.tipo}
                          </span>
                          <span className={`h-1.5 w-1.5 rounded-full ${getVisitColorDot(visit.estado)}`}></span>
                        </div>
                      </div>
                    ))}

                    {visitsInCell.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-lg py-12 text-slate-300">
                        <Compass className="h-6 w-6 stroke-1 mb-1" />
                        <span className="text-[10px] font-semibold">Sin visitas</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 3. VISTA DIARIA */}
        {activeView === 'DIARIO' && (
          <div className="space-y-4">
            <div className="border-b border-border pb-2 mb-4 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Cronograma del Día
              </span>
              <span className="text-xs font-extrabold text-primary bg-primary-light px-2 py-0.5 rounded">
                {visitsOnSelectedDate.length} visitas registradas
              </span>
            </div>

            {visitsOnSelectedDate.length > 0 ? (
              <div className="relative pl-6 border-l-2 border-slate-100 space-y-6 py-2">
                {visitsOnSelectedDate.map((visit) => {
                  const isSelected = selectedVisitId === visit.id;
                  return (
                    <div
                      key={visit.id}
                      onClick={() => handleSelectVisitDirectly(visit.id, selectedDateStr)}
                      className={`relative p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary-light/5 shadow-md ring-1 ring-primary/30'
                          : 'border-border bg-surface hover:bg-slate-50 shadow-sm'
                      }`}
                    >
                      <div
                        className={`absolute -left-[31px] top-6 h-4 w-4 rounded-full border-2 border-white shadow-sm transition-transform ${
                          isSelected ? 'scale-125 bg-primary' : 'bg-slate-300'
                        }`}
                      />

                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-extrabold text-slate-800">
                              {visit.institucion}
                            </span>
                            <Badge className={getVisitStatusBadgeClass(visit.estado)}>
                              {visit.estado}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase font-bold tracking-wider text-slate-500"
                            >
                              {visit.tipo}
                            </Badge>
                          </div>
                          <div className="text-xs text-text-muted flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                            <span className="flex items-center gap-1 font-medium">
                              <User className="h-3.5 w-3.5 text-primary" />
                              Especialista:{' '}
                              <strong className="text-slate-700">{visit.especialista}</strong>
                            </span>
                            <span className="flex items-center gap-1 font-medium">
                              <GraduationCap className="h-3.5 w-3.5 text-primary" />
                              Evaluado:{' '}
                              <strong className="text-slate-700">{visit.docenteDirectivo}</strong>
                            </span>
                            <span className="flex items-center gap-1 font-medium">
                              <Clock className="h-3.5 w-3.5 text-primary" />
                              Hora:{' '}
                              <strong className="text-slate-700">{formatVisitTime(visit.fechaHora)}</strong>
                            </span>
                            <span className="flex items-center gap-1 font-medium">
                              <Hash className="h-3.5 w-3.5 text-primary" />
                              Nº Visita:{' '}
                              <strong className="text-slate-700">{visit.nroVisita}</strong>
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs border-slate-200 text-slate-600 font-semibold cursor-pointer"
                          >
                            Ver detalles
                          </Button>
                        </div>
                      </div>

                      {visit.observaciones && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-100">
                          <strong>Detalles:</strong> {visit.observaciones}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <Compass className="h-12 w-12 text-slate-300 mx-auto stroke-1 mb-3" />
                <h3 className="text-slate-700 font-bold text-sm">Sin monitoreo registrado</h3>
                <p className="text-text-muted text-xs mt-1 max-w-xs mx-auto leading-relaxed">
                  No existen visitas programadas ni registradas para el día {selectedDateStr}.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 4. VISTA ANUAL */}
        {activeView === 'ANUAL' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {MONTH_NAMES.map((monthName, mIdx) => {
              const tempDate = new Date(year, mIdx, 1);
              const startDay = tempDate.getDay();
              const totalDays = new Date(year, mIdx + 1, 0).getDate();

              const miniDays = [];
              for (let i = 0; i < startDay; i++) miniDays.push(null);
              for (let i = 1; i <= totalDays; i++) miniDays.push(i);

              return (
                <div
                  key={mIdx}
                  onClick={() => {
                    setCurrentDate(new Date(year, mIdx, 1, 12));
                    setActiveView('MENSUAL');
                  }}
                  className="border border-border rounded-xl p-3 bg-surface hover:bg-slate-50/30 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
                >
                  <h3 className="text-xs font-black text-slate-800 text-center uppercase tracking-wider mb-2 border-b border-border pb-1">
                    {monthName}
                  </h3>

                  <div className="grid grid-cols-7 gap-0.5 text-[8px] font-bold text-center text-slate-400 mb-1">
                    {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, dIdx) => (
                      <div key={dIdx}>{d}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-0.5 text-[9px] text-center text-slate-600">
                    {miniDays.map((dayNum, dIdx) => {
                      if (dayNum === null) return <div key={dIdx}></div>;

                      const cellDateStr = `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(
                        dayNum
                      ).padStart(2, '0')}`;
                      const hasVisits = filteredVisits.some(
                        (v) => v.fechaHora.substring(0, 10) === cellDateStr
                      );
                      const firstVisitOfDate = filteredVisits.find(
                        (v) => v.fechaHora.substring(0, 10) === cellDateStr
                      );

                      return (
                        <div
                          key={dIdx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentDate(new Date(year, mIdx, dayNum, 12));
                            setSelectedDateStr(cellDateStr);
                            if (firstVisitOfDate) {
                              setSelectedVisitId(firstVisitOfDate.id);
                            }
                            setActiveView('MENSUAL');
                          }}
                          className={`py-0.5 rounded font-medium relative hover:bg-slate-200 transition-all ${
                            hasVisits ? 'font-bold bg-primary-light/60 text-primary' : ''
                          }`}
                        >
                          {dayNum}
                          {hasVisits && firstVisitOfDate && (
                            <span
                              className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full ${getVisitColorDot(
                                firstVisitOfDate.estado
                              )}`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 5. VISTA DE LISTA */}
        {activeView === 'LISTA' && (
          <div className="space-y-4">
            <div className="border-b border-border pb-2 mb-4 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Lista de Visitas Filtradas (Cronológico)
              </span>
              <span className="text-xs font-extrabold text-primary bg-primary-light px-2 py-0.5 rounded">
                {sortedVisits.length} visitas encontradas
              </span>
            </div>

            {sortedVisits.length > 0 ? (
              <div className="space-y-4">
                {sortedVisits.map((visit) => {
                  const isSelected = selectedVisitId === visit.id;
                  const dateStr = visit.fechaHora.substring(0, 10);
                  return (
                    <div
                      key={visit.id}
                      onClick={() => handleSelectVisitDirectly(visit.id, dateStr)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
                        isSelected
                          ? 'border-primary bg-primary-light/5 ring-1 ring-primary/30'
                          : 'border-border bg-surface hover:bg-slate-50 shadow-sm'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-extrabold text-slate-800">
                              {visit.institucion}
                            </span>
                            <Badge className={getVisitStatusBadgeClass(visit.estado)}>
                              {visit.estado}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase font-bold tracking-wider text-slate-500"
                            >
                              {visit.tipo}
                            </Badge>
                          </div>
                          <div className="text-xs text-text-muted grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-0.5">
                            <span className="flex items-center gap-1.5 font-medium">
                              <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span>
                                Fecha: <strong className="text-slate-700">{formatVisitDate(visit.fechaHora)}</strong>
                              </span>
                            </span>
                            <span className="flex items-center gap-1.5 font-medium">
                              <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span>
                                Hora: <strong className="text-slate-700">{formatVisitTime(visit.fechaHora)}</strong>
                              </span>
                            </span>
                            <span className="flex items-center gap-1.5 font-medium">
                              <User className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="truncate">
                                Especialista: <strong className="text-slate-700" title={visit.especialista}>{visit.especialista}</strong>
                              </span>
                            </span>
                            <span className="flex items-center gap-1.5 font-medium">
                              <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="truncate">
                                Evaluado: <strong className="text-slate-700" title={visit.docenteDirectivo}>{visit.docenteDirectivo}</strong>
                              </span>
                            </span>
                          </div>
                          <div className="text-xs text-text-muted flex gap-x-4">
                            <span className="flex items-center gap-1 font-medium">
                              <Hash className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span>
                                Nº Visita: <strong className="text-slate-700">{visit.nroVisita}</strong>
                              </span>
                            </span>
                            <span className="font-medium">
                              Nivel/Mod: <strong className="text-slate-700">{visit.nivel} / {visit.modalidad}</strong>
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs border-slate-200 text-slate-600 font-semibold cursor-pointer"
                          >
                            Ver detalles
                          </Button>
                        </div>
                      </div>

                      {visit.observaciones && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-100">
                          <strong>Detalles:</strong> {visit.observaciones}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <AlertCircle className="h-12 w-12 text-slate-300 mx-auto stroke-1 mb-3 animate-bounce" />
                <h3 className="text-slate-700 font-bold text-sm">Sin visitas que coincidan con los filtros</h3>
                <p className="text-text-muted text-xs mt-1 max-w-xs mx-auto leading-relaxed">
                  No existen registros programados o realizados que coincidan con los filtros activos.
                </p>
                {isAnyFilterActive && (
                  <Button
                    onClick={handleClearFilters}
                    className="mt-4 text-xs font-bold bg-primary text-white hover:bg-primary-hover px-4 py-2 rounded-lg cursor-pointer"
                  >
                    Limpiar Filtros
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
