import { Download, Eye } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { formatearFechaEnPalabras } from '@shared/lib/fecha/fecha';
import { medirVisita } from '@/features/reportes/lib/medicion-visita';
import type { BackendReportVisit } from '../ReportesGrid';

/**
 * Las fichas completadas, en vista de tabla.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Eran ciento veinte líneas dentro de
 * `ReportesGrid`, con su propia copia del cálculo de la calificación.
 */

const COLUMNAS = [
  'I.E. / Institución',
  'Tipo',
  'Evaluado',
  'Especialista',
  'Fecha Cierre',
  'Calificación',
  'Nivel',
];

interface TablaReportesProps {
  visitas: BackendReportVisit[];
  onAbrir: (visita: BackendReportVisit) => void;
  onDescargar: (visita: BackendReportVisit, e: React.MouseEvent) => void;
}

export const TablaReportes = ({ visitas, onAbrir, onDescargar }: TablaReportesProps) => (
  <Card className="border border-border bg-surface shadow-sm overflow-hidden rounded-xl">
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-border text-[10px] font-black text-slate-400 uppercase tracking-wider">
            {COLUMNAS.map((columna) => (
              <th key={columna} className="py-3 px-4 first:px-5">
                {columna}
              </th>
            ))}
            <th className="py-3 px-4 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
          {visitas.map((visita) => {
            const medicion = medirVisita(visita);

            return (
              <tr
                key={visita.id}
                onClick={() => onAbrir(visita)}
                className="hover:bg-slate-50/50 transition-colors cursor-pointer"
              >
                <td className="py-3.5 px-5 font-bold text-slate-800 max-w-[200px] truncate">
                  {visita.institucion}
                </td>
                <td className="py-3.5 px-4">
                  <Badge
                    className={`font-black text-[9px] uppercase tracking-wider ${
                      visita.tipo === 'DOCENTE'
                        ? 'bg-blue-50 text-blue-700 border-blue-100'
                        : 'bg-purple-50 text-purple-700 border-purple-100'
                    }`}
                  >
                    {visita.tipo}
                  </Badge>
                </td>
                <td className="py-3.5 px-4 font-bold text-slate-700">{visita.docenteDirectivo}</td>
                <td className="py-3.5 px-4 text-slate-500">{visita.especialista}</td>
                <td className="py-3.5 px-4 text-slate-500 font-semibold">
                  {formatearFechaEnPalabras(visita.fechaHora)}
                </td>
                <td className="py-3.5 px-4 font-bold text-slate-600">
                  {medicion.calificacionCorta}
                </td>
                <td className="py-3.5 px-4">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-black border-slate-200 bg-slate-50 text-slate-800"
                  >
                    {medicion.nivelRomano ? `Nivel ${medicion.nivelRomano}` : 'Sin calificar'}
                  </Badge>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <div
                    className="flex justify-center items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAbrir(visita)}
                      className="h-8 px-2 rounded-lg text-slate-600 border-slate-200 font-bold text-[11px] flex items-center gap-1 hover:bg-slate-50 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 text-primary" />
                      <span>Ver</span>
                    </Button>
                    <button
                      onClick={(e) => onDescargar(visita, e)}
                      className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-primary hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                      title="Descargar PDF"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </Card>
);
