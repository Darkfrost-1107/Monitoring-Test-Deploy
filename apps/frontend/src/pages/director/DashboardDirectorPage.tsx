import { Building2, FileCheck2, FileWarning, BarChart4 } from 'lucide-react';
import { StatCard } from '@shared/ui/Stat-Card';
import { useDirectorDashboard } from '@features/dashboard';
import { EvaluationStateCard } from '../directorUgel/components/EvaluationStateCard';
import { FocosDeAtencion } from './components/FocosDeAtencion';
import { ActividadReciente } from './components/ActividadReciente';
import { DocentesDestacados } from './components/DocentesDestacados';

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
  const nivelPromedio = kpis?.nivelPromedio ?? 0;

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      {data?.institucion && (
        <div className="shrink-0">
          <h1 className="text-2xl font-bold">{data.institucion.nombre}</h1>
          <p className="text-sm text-text-muted">
            {data.institucion.nivelEducativo} · {data.institucion.distrito} · Cód. Modular{' '}
            {data.institucion.codigoModular}
          </p>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
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

      {/* Bento que llena el alto restante: cada tarjeta scrollea internamente si su
          lista es larga, de modo que la página nunca scrollea. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-2 gap-4 lg:flex-1 lg:min-h-0">
        <div className="lg:col-span-1 min-h-0">
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
        <div className="lg:col-span-2 min-h-0">
          <FocosDeAtencion focos={data?.focosDeAtencion ?? []} />
        </div>

        {/* Segunda fila: qué pasó (actividad) y el contrapeso positivo (destacados). */}
        <div className="lg:col-span-2 min-h-0">
          <ActividadReciente recientes={data?.monitoreosRecientes ?? []} />
        </div>
        <div className="lg:col-span-1 min-h-0">
          <DocentesDestacados destacados={data?.docentesDestacados ?? []} />
        </div>
      </div>
    </div>
  );
};
