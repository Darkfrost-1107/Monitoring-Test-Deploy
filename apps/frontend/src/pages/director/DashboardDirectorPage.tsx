import { Building2, FileCheck2, FileWarning, BarChart4 } from 'lucide-react';
import { StatCard } from '@shared/ui/Stat-Card';
import { useDirectorDashboard, nivelLogroUi, iniciales } from '@features/dashboard';
import { EvaluationStateCard } from '../directorUgel/components/EvaluationStateCard';
import {
  RecentMonitoringsTable,
  type MonitoringRow,
} from '../directorUgel/components/RecentMonitoringsTable';
import { formatearFechaCorta } from '@shared/lib/fecha/fecha';

export const DashboardDirectorPage = () => {
  const { data, isLoading, isError, error } = useDirectorDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        Cargando dashboard…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        No se pudo cargar el dashboard: {(error as Error)?.message ?? 'error desconocido'}
      </div>
    );
  }

  const kpis = data?.kpis;
  const semaforo = data?.semaforo;

  const rows: MonitoringRow[] = (data?.monitoreosRecientes ?? []).map((m) => {
    const ui = nivelLogroUi(m.nivelLogro);
    return {
      id: m.fichaId,
      school: m.docenteNombre,
      level: m.nivelEducativo,
      specialist: m.especialistaNombre,
      specialistInitials: iniciales(m.especialistaNombre),
      date: formatearFechaCorta(m.fecha),
      status: ui.label,
      score: Number(m.promedio.toFixed(1)),
      statusVariant: ui.variant as MonitoringRow['statusVariant'],
    };
  });

  const nivelPromedio = kpis?.nivelPromedio ?? 0;

  return (
    <div className="flex flex-col gap-6 h-full">
      {data?.institucion && (
        <div>
          <h1 className="text-2xl font-bold">{data.institucion.nombre}</h1>
          <p className="text-sm text-text-muted">
            {data.institucion.nivelEducativo} · {data.institucion.distrito} · Cód. Modular{' '}
            {data.institucion.codigoModular}
          </p>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Docentes"
          icon={<Building2 className="w-5 h-5" />}
          value={kpis?.totalDocentes ?? 0}
        />
        <StatCard
          title="Monitoreados"
          icon={<FileCheck2 className="w-5 h-5" />}
          value={kpis?.monitoreados ?? 0}
          trendText={`${kpis?.porcentajeCobertura ?? 0}% cobertura`}
          trendType="success"
        />
        <StatCard
          title="Pendientes"
          icon={<FileWarning className="w-5 h-5" />}
          value={kpis?.pendientes ?? 0}
        />
        <StatCard
          title="Nivel Promedio"
          icon={<BarChart4 className="w-5 h-5" />}
          value={`${nivelPromedio.toFixed(1)} / 4.0`}
          variant={nivelPromedio < 2.5 ? 'solidDestructive' : 'default'}
        />
      </div>

      {/* Estado de evaluación (semáforo). El mapa se incorpora en una fase posterior. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[450px]">
        <div className="lg:col-span-1">
          <EvaluationStateCard
            data={{
              critico: semaforo?.critico ?? 0,
              enProceso: semaforo?.enProceso ?? 0,
              logroPrevisto: semaforo?.logroPrevisto ?? 0,
              coberturaActual: kpis?.porcentajeCobertura ?? 0,
              meta: 100,
            }}
          />
        </div>
        <div className="lg:col-span-2">
          <RecentMonitoringsTable
            rows={rows}
            firstColumnLabel="Docente"
            emptyLabel="Aún no hay monitoreos finalizados en tu institución."
          />
        </div>
      </div>
    </div>
  );
};
