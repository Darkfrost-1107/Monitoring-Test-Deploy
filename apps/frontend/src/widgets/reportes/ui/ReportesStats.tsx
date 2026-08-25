import { FileText, TrendingUp, Users, BarChart3, Award, BookOpen, User, ArrowUpRight } from 'lucide-react';
import { Card } from '@/shared/ui/card';

const NIVEL_LOGRO_LABEL: Record<string, { label: string; color: string }> = {
  INICIO:          { label: 'Inicio',          color: 'text-red-600' },
  EN_PROCESO:      { label: 'En Proceso',      color: 'text-amber-600' },
  LOGRO_ESPERADO:  { label: 'Logro Esperado',  color: 'text-blue-600' },
  LOGRO_DESTACADO: { label: 'Logro Destacado', color: 'text-emerald-600' },
};

/** Rótulo corto de cada instrumento, para el desglose de las tarjetas. */
const INSTRUMENTO_LABEL: Record<string, string> = {
  DOCENTE: 'Docente',
  DOCENTE_EIB: 'EIB',
  DIRECTIVO: 'Directivo',
};

interface EstadisticaInstrumento {
  tipo: string;
  fichas: number;
  satisfactionPercent: number | null;
  promedioGeneral: number | null;
}

interface ReportesStatsProps {
  stats: {
    /** Fichas llenadas: una por instrumento aplicado. */
    fichas: number;
    /** Monitoreos ejecutados: una visita con dos instrumentos cuenta una vez. */
    visitasMonitoreadas: number;
    fichasDocentes: number;
    fichasDirectivas: number;
    /**
     * `null` cuando ninguna ficha trae nivel de logro, y también cuando el
     * conjunto mezcla instrumentos: sus escalas no son comparables, así que se
     * muestra `porInstrumento` en su lugar.
     */
    satisfactionPercent: number | null;
    porInstrumento: EstadisticaInstrumento[];
    uniqueIEs: number;
    /** Solo para vista evaluado (docente) */
    promedioGeneral?: number | null;
    nivelLogroMasFrecuente?: string;
    uniqueEspecialistas?: number;
  };
  isEvaluatedView?: boolean;
}

/**
 * Desglose compacto cuando el conjunto mezcla instrumentos.
 *
 * La rúbrica docente llega a 4, la lista de cotejo EIB a 3 y la directiva se
 * resuelve por porcentaje: un número único entre las tres no significa nada.
 */
const DesglosePorInstrumento = ({
  instrumentos,
  valor,
}: {
  instrumentos: EstadisticaInstrumento[];
  valor: (i: EstadisticaInstrumento) => string;
}) => (
  <span className="text-[10px] text-slate-500 font-semibold block mt-1 leading-tight">
    {instrumentos.map((i) => `${INSTRUMENTO_LABEL[i.tipo] ?? i.tipo} ${valor(i)}`).join(' · ')}
  </span>
);

export const ReportesStats = ({ stats, isEvaluatedView = false }: ReportesStatsProps) => {
  if (isEvaluatedView) {
    const nivelInfo = stats.nivelLogroMasFrecuente
      ? (NIVEL_LOGRO_LABEL[stats.nivelLogroMasFrecuente] ?? { label: stats.nivelLogroMasFrecuente, color: 'text-slate-800' })
      : null;

    // El EIB es informativo (No/Parcial/Sí): cuando es el único instrumento, no
    // hay nota ni nivel de logro que mostrar.
    const esEibUnico =
      stats.porInstrumento.length === 1 && stats.porInstrumento[0]?.tipo === 'DOCENTE_EIB';

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
            {/* La tarjeta dice «monitoreos», así que cuenta visitas. Antes
                mostraba fichas: una visita con la ficha regular y la EIB se
                informaba como dos monitoreos recibidos. */}
            <span className="text-xl font-black text-slate-800 block mt-0.5 leading-none">
              {stats.visitasMonitoreadas}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">
              {stats.fichas === stats.visitasMonitoreadas
                ? 'visitas con ficha completada'
                : `visitas · ${stats.fichas} fichas completadas`}
            </span>
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
              {esEibUnico ? 'Informativo' : stats.promedioGeneral != null ? stats.promedioGeneral.toFixed(2) : '—'}
            </span>
            {/* El EIB no tiene nota. «sobre 4.00 pts» sólo vale para la rúbrica
                docente; con más de un instrumento no hay promedio único. */}
            {esEibUnico ? (
              <span className="text-[10px] text-slate-400 font-semibold">registro No / Parcial / Sí</span>
            ) : stats.promedioGeneral != null ? (
              <span className="text-[10px] text-slate-400 font-semibold">sobre 4.00 pts</span>
            ) : stats.porInstrumento.length > 1 ? (
              <DesglosePorInstrumento
                instrumentos={stats.porInstrumento}
                valor={(i) => (i.promedioGeneral != null ? i.promedioGeneral.toFixed(2) : '—')}
              />
            ) : (
              <span className="text-[10px] text-slate-400 font-semibold">sin puntaje registrado</span>
            )}
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
            <span className={`text-xl font-black block mt-0.5 leading-none ${esEibUnico ? 'text-slate-500' : nivelInfo?.color ?? 'text-slate-800'}`}>
              {esEibUnico ? 'Informativo' : nivelInfo?.label ?? '—'}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">
              {esEibUnico ? 'sin nivel de logro' : 'más reciente'}
            </span>
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
            {stats.fichas}
          </span>
          {/* Las dos unidades, cada una con su nombre. La leyenda sólo aparece
              cuando difieren: mientras cada visita lleve una sola ficha, repetir
              el mismo número es ruido. */}
          {stats.fichas !== stats.visitasMonitoreadas && (
            <span className="text-[10px] text-slate-400 font-semibold">
              en {stats.visitasMonitoreadas} monitoreos
            </span>
          )}
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
          {/* Con instrumentos mezclados el porcentaje único no se puede calcular:
              cada escala mide algo distinto. Se muestra el de cada uno. */}
          {stats.satisfactionPercent === null && stats.porInstrumento.length > 1 && (
            <DesglosePorInstrumento
              instrumentos={stats.porInstrumento}
              valor={(i) => (i.satisfactionPercent != null ? `${i.satisfactionPercent}%` : '—')}
            />
          )}
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
            Fichas Docentes / Directivas
          </span>
          {/* Cuenta fichas, no personas: un docente con la ficha regular y la EIB
              aporta dos. El rótulo decía «Docentes vs Directivos», que se leía
              como cantidad de personas evaluadas. */}
          <span className="text-xl font-black text-slate-800 block mt-0.5 leading-none">
            {stats.fichasDocentes} / {stats.fichasDirectivas}
          </span>
        </div>
        <ArrowUpRight className="absolute top-3 right-3 h-4.5 w-4.5 text-slate-300 group-hover:text-slate-400 transition-colors" />
      </Card>
    </div>
  );
};
