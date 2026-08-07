import { FileText, TrendingUp, Users, BarChart3, Award, BookOpen, User, ArrowUpRight } from 'lucide-react';
import { Card } from '@/shared/ui/card';

const NIVEL_LOGRO_LABEL: Record<string, { label: string; color: string }> = {
  INICIO:          { label: 'Inicio',          color: 'text-red-600' },
  EN_PROCESO:      { label: 'En Proceso',      color: 'text-amber-600' },
  LOGRO_ESPERADO:  { label: 'Logro Esperado',  color: 'text-blue-600' },
  LOGRO_DESTACADO: { label: 'Logro Destacado', color: 'text-emerald-600' },
};

interface ReportesStatsProps {
  stats: {
    total: number;
    docentes: number;
    directivos: number;
    /** `null` cuando ninguna ficha trae nivel de logro: no hay qué informar. */
    satisfactionPercent: number | null;
    uniqueIEs: number;
    /** Solo para vista evaluado (docente) */
    promedioGeneral?: number | null;
    nivelLogroMasFrecuente?: string;
    uniqueEspecialistas?: number;
  };
  isEvaluatedView?: boolean;
}

export const ReportesStats = ({ stats, isEvaluatedView = false }: ReportesStatsProps) => {
  if (isEvaluatedView) {
    const nivelInfo = stats.nivelLogroMasFrecuente
      ? (NIVEL_LOGRO_LABEL[stats.nivelLogroMasFrecuente] ?? { label: stats.nivelLogroMasFrecuente, color: 'text-slate-800' })
      : null;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Monitoreos recibidos */}
        <Card className="p-4 border border-border bg-surface flex items-center gap-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
              Monitoreos Recibidos
            </span>
            <span className="text-xl font-black text-slate-800 block mt-0.5 leading-none">
              {stats.total}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">fichas completadas</span>
          </div>
          <ArrowUpRight className="absolute top-3 right-3 h-4.5 w-4.5 text-slate-300 group-hover:text-slate-400 transition-colors" />
        </Card>

        {/* KPI 2: Mi promedio general */}
        <Card className="p-4 border border-border bg-surface flex items-center gap-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
              Mi Promedio General
            </span>
            <span className="text-xl font-black text-slate-800 block mt-0.5 leading-none">
              {stats.promedioGeneral != null ? stats.promedioGeneral.toFixed(2) : '—'}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">sobre 4.00 pts</span>
          </div>
          <ArrowUpRight className="absolute top-3 right-3 h-4.5 w-4.5 text-slate-300 group-hover:text-slate-400 transition-colors" />
        </Card>

        {/* KPI 3: Mi nivel de logro */}
        <Card className="p-4 border border-border bg-surface flex items-center gap-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
          <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-100 text-purple-600">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
              Mi Nivel de Logro
            </span>
            <span className={`text-xl font-black block mt-0.5 leading-none ${nivelInfo?.color ?? 'text-slate-800'}`}>
              {nivelInfo?.label ?? '—'}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">más reciente</span>
          </div>
          <ArrowUpRight className="absolute top-3 right-3 h-4.5 w-4.5 text-slate-300 group-hover:text-slate-400 transition-colors" />
        </Card>

        {/* KPI 4: Especialistas que me evaluaron */}
        <Card className="p-4 border border-border bg-surface flex items-center gap-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
              Especialistas
            </span>
            <span className="text-xl font-black text-slate-800 block mt-0.5 leading-none">
              {stats.uniqueEspecialistas ?? 0}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">que me evaluaron</span>
          </div>
          <ArrowUpRight className="absolute top-3 right-3 h-4.5 w-4.5 text-slate-300 group-hover:text-slate-400 transition-colors" />
        </Card>
      </div>
    );
  }

  // Vista original para especialistas/jefes
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <Card className="p-4 border border-border bg-surface flex items-center gap-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
            Fichas Finalizadas
          </span>
          <span className="text-xl font-black text-slate-800 block mt-0.5 leading-none">
            {stats.total}
          </span>
        </div>
        <ArrowUpRight className="absolute top-3 right-3 h-4.5 w-4.5 text-slate-300 group-hover:text-slate-400 transition-colors" />
      </Card>

      <Card className="p-4 border border-border bg-surface flex items-center gap-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div>
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
            Nivel Satisfactorio
          </span>
          <span className="text-xl font-black text-slate-800 block mt-0.5 leading-none">
            {/* Sin fichas con nivel de logro no hay porcentaje que informar. */}
            {stats.satisfactionPercent !== null ? `${stats.satisfactionPercent}%` : '—'}
          </span>
        </div>
        <ArrowUpRight className="absolute top-3 right-3 h-4.5 w-4.5 text-slate-300 group-hover:text-slate-400 transition-colors" />
      </Card>

      <Card className="p-4 border border-border bg-surface flex items-center gap-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
        <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-100 text-purple-600">
          <BookOpen className="h-5 w-5" />
        </div>
        <div>
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
            I.E. Monitoreadas
          </span>
          <span className="text-xl font-black text-slate-800 block mt-0.5 leading-none">
            {stats.uniqueIEs}
          </span>
        </div>
        <ArrowUpRight className="absolute top-3 right-3 h-4.5 w-4.5 text-slate-300 group-hover:text-slate-400 transition-colors" />
      </Card>

      <Card className="p-4 border border-border bg-surface flex items-center gap-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-600">
          <User className="h-5 w-5" />
        </div>
        <div>
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
            Docentes vs Directivos
          </span>
          <span className="text-xl font-black text-slate-800 block mt-0.5 leading-none">
            {stats.docentes} / {stats.directivos}
          </span>
        </div>
        <ArrowUpRight className="absolute top-3 right-3 h-4.5 w-4.5 text-slate-300 group-hover:text-slate-400 transition-colors" />
      </Card>
    </div>
  );
};
