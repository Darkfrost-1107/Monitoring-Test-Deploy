import { useState, useMemo } from 'react';
import { useUser } from '@entities/model-user';
import { useFichasCompletadas, useAnalisisDesempenos } from '@entities/model-reportes';
import { usePlantillasList } from '@entities/model-plantillas/use-plantillas-api';
import { useCronogramasData } from '@features/cronogramas/hooks/use-cronogramas-data';
import { useCan, Capability } from '@shared/auth';
import { PageHeader } from '@shared/ui/pageHeader';
import { MODALIDAD_NIVEL_MAP, type TipoMonitoreo } from '@sistema-monitoreo/shared-contracts';
import {
  reportesVisibles,
  type ReporteVisible,
} from '@features/reportes/lib/visibilidad-reportes';
import { calcularAnalisisPorCriterios } from '@features/reportes/lib/analisis-desempeno';
import { esInstrumentoEib, tipoDeVisitaDe } from '@features/reportes/lib/instrumento';
import {
  coincideConPeriodo,
  calcularConteosPorPeriodo,
  type FiltroPeriodoTipo,
} from '@features/reportes/lib/filtro-temporal';
import { FiltrosReportes } from '@/widgets/reportes/ui/grid/FiltrosReportes';
import { KpisCriterios } from '@/widgets/reportes/ui/analisis/KpisCriterios';
import { GraficoComparativoCriterios } from '@/widgets/reportes/ui/analisis/GraficoComparativoCriterios';
import { ListaCriteriosDesempeno } from '@/widgets/reportes/ui/analisis/ListaCriteriosDesempeno';
import type { BackendReportVisit } from '@/widgets/reportes';

export const AnalisisDesempenoPage = () => {
  const { user } = useUser();
  const { can } = useCan();

  // ── Estados de Filtros (Filtros de Reporte estándar) ──
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalidad, setFilterModalidad] = useState('Todos');
  const [filterNivel, setFilterNivel] = useState('Todos');
  const [filterAnio, setFilterAnio] = useState('Todos');
  const [filterTipo, setFilterTipo] = useState('Todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodoTipo>('TODOS');

  // Datos
  const anioNumero = filterAnio !== 'Todos' ? parseInt(filterAnio, 10) : undefined;
  const tipoMonitoreoParam = filterTipo !== 'Todos' ? (filterTipo as TipoMonitoreo) : undefined;

  const { data: criteriosBackend } = useAnalisisDesempenos({
    anioAcademico: anioNumero,
    tipoMonitoreo: tipoMonitoreoParam,
  });

  const { data: plantillas = [] } = usePlantillasList();

  const { data: fichasCompletadasData, isLoading } = useFichasCompletadas({
    limit: 1000,
  });

  const { cronogramas, isLoading: cargandoCronogramas } = useCronogramasData(
    can(Capability.MONITOREO_READ),
  );

  const completedVisits = useMemo((): BackendReportVisit[] => {
    if (fichasCompletadasData?.data && fichasCompletadasData.data.length > 0) {
      const list = fichasCompletadasData.data.map((f) => ({
        id: f.id,
        cronogramaId: f.cronogramaId,
        plantillaId: f.plantillaId,
        plantillaNombre: f.plantillaNombre,
        fechaHora: f.fechaEjecucion || f.fechaProgramada,
        // `tipo` es a quien se monitorea; `instrumento`, con que ficha.
        instrumento: f.instrumento,
        tipo: tipoDeVisitaDe(f.instrumento),
        docenteDirectivo: f.evaluadoNombre,
        evaluadoId: f.evaluadoId,
        especialista: f.especialistaNombre,
        especialistaInitials: f.especialistaNombre
          .split(' ')
          .map((n) => n[0] || '')
          .join('')
          .toUpperCase(),
        monitorId: f.especialistaId,
        institucion: `${f.institucionNombre} - ${f.institucionCodigoModular}`,
        institucionId: f.institucionId,
        modalidad: f.modalidad || 'EBR',
        nivel: f.nivel || 'Primaria',
        nroVisita: '1',
        estado: 'COMPLETADO' as const,
        nivelLogro: f.nivelLogro,
        promedio: f.promedio,
        puntajeTotal: f.puntajeTotal,
        correoEnviado: f.correoEnviado,
        horaInicio: f.horaInicio,
        horaFin: f.horaFin,
        anioAcademico: f.anioAcademico,
      }));
      return reportesVisibles(list as ReporteVisible[], user) as BackendReportVisit[];
    }

    const completadas = cronogramas.filter((c) => c.estado === 'COMPLETADO');
    return reportesVisibles(completadas as ReporteVisible[], user) as BackendReportVisit[];
  }, [fichasCompletadasData, cronogramas, user]);

  // Cascading Nivel
  const nivelesDisponibles = useMemo(() => {
    if (filterModalidad === 'Todos') return [];
    return MODALIDAD_NIVEL_MAP[filterModalidad as keyof typeof MODALIDAD_NIVEL_MAP] || [];
  }, [filterModalidad]);

  const handleModalidadChange = (modalidad: string) => {
    setFilterModalidad(modalidad);
    setFilterNivel('Todos');
  };

  const añosDisponibles = useMemo(() => {
    const yearsSet = new Set<string>();
    completedVisits.forEach((v) => {
      try {
        const d = new Date(v.fechaHora);
        if (!isNaN(d.getTime())) {
          yearsSet.add(d.getFullYear().toString());
        } else {
          const yearPart = v.fechaHora?.split('-')[0];
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

  const isAnyFilterActive =
    searchQuery.trim() !== '' ||
    filterModalidad !== 'Todos' ||
    filterNivel !== 'Todos' ||
    filterAnio !== 'Todos' ||
    filterTipo !== 'Todos' ||
    filtroPeriodo !== 'TODOS';

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterModalidad('Todos');
    setFilterNivel('Todos');
    setFilterAnio('Todos');
    setFilterTipo('Todos');
    setFiltroPeriodo('TODOS');
  };

  const visitasFiltradas = useMemo(() => {
    return completedVisits.filter((visit) => {
      // Filtro de período temporal (Hoy, Esta semana, Este mes, Todos)
      if (!coincideConPeriodo(visit.fechaHora, filtroPeriodo)) return false;

      // El filtro es por instrumento, que es lo que el analisis segmenta.
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
            const yearPart = visit.fechaHora?.split('-')[0];
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
  }, [completedVisits, filtroPeriodo, filterTipo, searchQuery, filterModalidad, filterNivel, filterAnio]);

  const analisis = useMemo(
    () => calcularAnalisisPorCriterios(criteriosBackend, visitasFiltradas, plantillas, filterTipo),
    [criteriosBackend, visitasFiltradas, plantillas, filterTipo],
  );

  const cargando = isLoading && cargandoCronogramas;
  const esDirectivo = filterTipo === 'DIRECTIVO';
  const esEib = filterTipo === 'DOCENTE_EIB';

  return (
    <div className="space-y-6 pb-12">
      {/* Encabezado */}
      <PageHeader
        title={`Análisis de Desempeño ${
          esDirectivo ? '(Directivo)' : esEib ? '(Docente EIB)' : '(Docente)'
        }`}
        description={`Diagnóstico y distribución estadística de los niveles de logro obtenidos en los criterios y desempeños de ${
          esDirectivo ? 'gestión directiva institucional' : 'observación de práctica docente'
        }.`}
      />

      {/* ── Filtros de Reporte (Estándar con Tipo de Monitoreo) ── */}
      <FiltrosReportes
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
        isEvaluatedView={false}
      />

      {cargando ? (
        <div className="h-64 flex items-center justify-center text-xs text-text-muted">
          Cargando análisis de desempeño...
        </div>
      ) : completedVisits.length === 0 ? (
        <div className="p-12 text-center bg-surface border border-border rounded-2xl shadow-xs">
          <h3 className="text-base font-bold text-slate-800">Sin datos de monitoreo disponibles</h3>
          <p className="text-xs text-text-muted mt-1">
            Aún no se han completado fichas de monitoreo para generar las estadísticas por criterio.
          </p>
        </div>
      ) : /**
         * El desglose por criterio lo resuelve el backend leyendo las respuestas
         * de cada desempeño. Cuando no llega, este análisis no se puede calcular:
         * el nivel de logro global de una ficha no dice en qué criterio le fue
         * bien. Antes se dibujaba una distribución inventada; ahora se declara.
         *
         * El estado vacío de arriba no alcanza porque mira el total SIN filtrar:
         * con el filtro puesto en un instrumento que todavía no tiene fichas
         * finalizadas, había fichas en el sistema y se caía igual acá.
         */
      analisis.sinDesglosePorCriterio ? (
        <div className="p-12 text-center bg-surface border border-border rounded-2xl shadow-xs">
          <h3 className="text-base font-bold text-slate-800">
            Análisis por criterio no disponible
          </h3>
          <p className="text-xs text-text-muted mt-1 max-w-lg mx-auto">
            {analisis.totalEvaluaciones === 0
              ? 'No hay fichas finalizadas que coincidan con los filtros seleccionados.'
              : `Se encontraron ${analisis.totalEvaluaciones} fichas con estos filtros, pero todavía no hay respuestas por criterio registradas para consolidar la distribución de niveles.`}
          </p>
          {analisis.criterios.length > 0 && (
            <div className="mt-6 text-left max-w-lg mx-auto">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                Criterios del instrumento
              </span>
              <ul className="mt-2 space-y-1.5">
                {analisis.criterios.map((criterio) => (
                  <li
                    key={criterio.desempenoId}
                    className="text-xs text-slate-600 flex items-start gap-2"
                  >
                    <span className="font-bold text-slate-400 shrink-0">{criterio.orden}.</span>
                    <span>{criterio.nombre}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Bloque 1: KPIs Principales por Criterio */}
          <KpisCriterios analisis={analisis} />

          {/* Bloque 2: Gráfico Comparativo de Niveles por Desempeño */}
          <GraficoComparativoCriterios criterios={analisis.criterios} />

          {/* Bloque 3: Detalle en Tarjetas por cada Desempeño / Criterio */}
          <ListaCriteriosDesempeno criterios={analisis.criterios} />
        </>
      )}
    </div>
  );
};
