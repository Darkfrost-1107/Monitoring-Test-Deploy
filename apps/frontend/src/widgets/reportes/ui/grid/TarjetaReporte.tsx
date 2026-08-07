import { GraduationCap, User, Download, Eye } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { medirVisita } from '@/features/reportes/lib/medicion-visita';
import type { BackendReportVisit } from '../ReportesGrid';

/**
 * Una ficha completada, en la vista de cuadrícula.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Eran ciento treinta líneas dentro del `map` de
 * `ReportesGrid`, con el cálculo de la calificación mezclado en el medio.
 */

const COLOR_POR_TIPO = { DOCENTE: '#2563eb', DIRECTIVO: '#8b5cf6' } as const;

interface TarjetaReporteProps {
  visita: BackendReportVisit;
  /** El docente evaluado no ve su propio nombre repetido en cada tarjeta. */
  isEvaluatedView: boolean;
  onAbrir: () => void;
  onDescargar: (e: React.MouseEvent) => void;
}

export const TarjetaReporte = ({
  visita,
  isEvaluatedView,
  onAbrir,
  onDescargar,
}: TarjetaReporteProps) => {
  const medicion = medirVisita(visita);
  const esDocente = visita.tipo === 'DOCENTE';

  return (
    <Card
      onClick={onAbrir}
      className="p-5 border border-slate-100 hover:border-primary/20 hover:shadow-md transition-all bg-surface flex flex-col justify-between gap-4 cursor-pointer relative overflow-hidden group"
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5"
        style={{ backgroundColor: esDocente ? COLOR_POR_TIPO.DOCENTE : COLOR_POR_TIPO.DIRECTIVO }}
      />

      <div className="space-y-3 pl-2">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="text-[9px] font-bold text-slate-500 uppercase">
            {visita.modalidad} - {visita.nivel}
          </Badge>
          <Badge
            className={`font-black text-[9px] uppercase tracking-wider ${
              esDocente
                ? 'bg-blue-50 text-blue-700 border-blue-100'
                : 'bg-purple-50 text-purple-700 border-purple-100'
            }`}
          >
            {esDocente ? 'DOCENTE' : 'DIRECTIVO'}
          </Badge>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-black text-slate-800 tracking-tight leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {visita.institucion}
          </h3>
          {!isEvaluatedView && (
            <div className="text-[11px] text-slate-600 font-bold flex items-center gap-1">
              <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">Evaluado: {visita.docenteDirectivo}</span>
            </div>
          )}
          <div
            className={`flex items-center gap-1 ${
              isEvaluatedView
                ? 'text-[11px] text-slate-600 font-bold'
                : 'text-[10px] text-slate-400 font-semibold'
            }`}
          >
            <User
              className={`h-3 w-3 shrink-0 ${isEvaluatedView ? 'text-primary' : 'text-slate-400'}`}
            />
            <span className="truncate">
              {isEvaluatedView ? 'Evaluado por: ' : 'Esp: '}
              {visita.especialista}
            </span>
          </div>
        </div>

        <div className="space-y-1.5 border-t border-slate-100 pt-3">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
            <span>Promedio / Puntaje:</span>
            <span className="text-slate-800">{medicion.calificacion}</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${medicion.porcentaje}%` }}
            />
          </div>
        </div>
      </div>

      <div className="pl-2 pt-3 border-t border-slate-50 flex items-center justify-between gap-2 mt-1">
        <Badge
          variant="outline"
          className="text-[9.5px] font-black border-slate-200 bg-slate-50 text-slate-700"
        >
          {medicion.nivelRomano ? `Logro: Nivel ${medicion.nivelRomano}` : 'Sin calificar'}
        </Badge>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onDescargar}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-primary hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            title="Descargar PDF"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={onAbrir}
            className="text-[10px] font-bold border-slate-200 text-slate-600 h-8 px-2.5 rounded-lg flex items-center gap-1 bg-surface hover:bg-slate-50 cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5 text-primary" />
            <span>Ver Ficha</span>
          </Button>
        </div>
      </div>
    </Card>
  );
};
