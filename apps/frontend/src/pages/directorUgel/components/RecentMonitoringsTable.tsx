import { useNavigate } from 'react-router-dom';
import { Card } from '@shared/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui/table';
import { Avatar, AvatarFallback } from '@shared/ui/avatar';
import { ArrowRight, CalendarDays } from 'lucide-react';

export interface MonitoringRow {
  id: string | number;
  /** Título principal (IE en vista UGEL, docente en vista Director). */
  school: string;
  /** Subtítulo (código modular). Opcional. */
  codModular?: string;
  level: string;
  district?: string;
  specialist: string;
  specialistInitials: string;
  date: string;
  status: string;
  /** Nulo cuando el instrumento es informativo (EIB): no hay nota que mostrar. */
  score: number | null;
  statusVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'success' | 'warning';
  /** El monitoreo EIB es informativo: se muestra sin insignia de nota. */
  esInformativo?: boolean;
}

const mockData: MonitoringRow[] = [
  {
    id: 1,
    school: 'IE 70001 Huayta',
    codModular: '0234567',
    level: 'Primaria',
    district: 'LAMPA',
    specialist: 'Juan Pérez',
    specialistInitials: 'JP',
    date: '12/10/2023',
    status: 'Satisfactorio',
    score: 3.5,
    statusVariant: 'success',
  },
  {
    id: 2,
    school: 'IE 71011 Pucará',
    codModular: '0234889',
    level: 'Secundaria',
    district: 'PUCARÁ',
    specialist: 'María Gómez',
    specialistInitials: 'MG',
    date: '11/10/2023',
    status: 'En Proceso',
    score: 2.2,
    statusVariant: 'warning',
  },
  {
    id: 3,
    school: 'IE Inicial 115 Lampa',
    codModular: '0234123',
    level: 'Inicial',
    district: 'LAMPA',
    specialist: 'Carlos Ruiz',
    specialistInitials: 'CR',
    date: '10/10/2023',
    status: 'Crítico',
    score: 1.2,
    statusVariant: 'destructive',
  }
];

interface RecentMonitoringsTableProps {
  rows?: MonitoringRow[];
  /** Etiqueta de la primera columna (IE en UGEL, Docente en Director). */
  firstColumnLabel?: string;
  emptyLabel?: string;
  /** Ruta a la que navega "Ver reporte detallado" (ej. Fichas Completadas). */
  detailPath?: string;
}

/** Color del punto y de la pastilla según la variante del estado de logro. */
const ESTILO_ESTADO: Record<string, { punto: string; pastilla: string }> = {
  success: { punto: 'bg-emerald-500', pastilla: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  warning: { punto: 'bg-amber-500', pastilla: 'bg-amber-50 text-amber-700 border-amber-200' },
  destructive: { punto: 'bg-red-500', pastilla: 'bg-red-50 text-red-700 border-red-200' },
  secondary: { punto: 'bg-slate-400', pastilla: 'bg-slate-100 text-slate-600 border-slate-200' },
  default: { punto: 'bg-slate-400', pastilla: 'bg-slate-50 text-slate-600 border-slate-200' },
};

/** Insignia de estado de logro: punto de color + nota + nivel (o «Informativo»). */
const EstadoLogroPill = ({ row }: { row: MonitoringRow }) => {
  const clasesBase =
    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide';
  if (row.esInformativo) {
    const e = ESTILO_ESTADO.secondary;
    return (
      <span className={`${clasesBase} ${e.pastilla}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${e.punto}`} />
        Informativo
      </span>
    );
  }
  const e = ESTILO_ESTADO[row.statusVariant ?? 'default'] ?? ESTILO_ESTADO.default;
  return (
    <span className={`${clasesBase} ${e.pastilla}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${e.punto}`} />
      {row.score != null && <span className="tabular-nums font-black">{row.score}</span>}
      <span className="opacity-30">·</span>
      {row.status}
    </span>
  );
};

export const RecentMonitoringsTable = ({
  rows,
  firstColumnLabel = 'Institución Educativa',
  emptyLabel = 'Sin monitoreos registrados.',
  detailPath,
}: RecentMonitoringsTableProps = {}) => {
  const data = rows ?? mockData;
  const navigate = useNavigate();
  return (
    <Card className="shadow-xs border-border flex flex-col h-full overflow-hidden">
      <div className="p-5 flex justify-between items-center border-b border-border bg-card">
        <h3 className="text-lg font-bold">Monitoreos Recientes</h3>
        {detailPath && (
          <span
            onClick={() => navigate(detailPath)}
            className="text-sm font-semibold text-primary cursor-pointer hover:underline flex items-center gap-1"
          >
            Ver reporte detallado <ArrowRight className="w-4 h-4" />
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border bg-slate-50/70">
              <TableHead className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 py-3">{firstColumnLabel}</TableHead>
              <TableHead className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 py-3">Nivel / Distrito</TableHead>
              <TableHead className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 py-3">Especialista Responsable</TableHead>
              <TableHead className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 py-3">Fecha Visita</TableHead>
              <TableHead className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 py-3 text-right">Estado Logro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-text-muted py-10">
                  {emptyLabel}
                </TableCell>
              </TableRow>
            )}
            {data.map((row) => (
              <TableRow
                key={row.id}
                className="border-b border-border/50 last:border-0 hover:bg-primary/[0.03] transition-colors"
              >
                <TableCell className="py-3.5">
                  <div className="font-bold text-slate-800 leading-tight">{row.school}</div>
                  {row.codModular && (
                    <div className="text-[11px] text-slate-400 mt-0.5">Cód. Modular: {row.codModular}</div>
                  )}
                </TableCell>
                <TableCell className="py-3.5">
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    {row.level}
                  </span>
                  {row.district && (
                    <div className="text-[10px] text-slate-400 uppercase tracking-wide mt-1">{row.district}</div>
                  )}
                </TableCell>
                <TableCell className="py-3.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="w-8 h-8 bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-2 ring-primary/10 shrink-0">
                      <AvatarFallback className="text-[10px] font-black bg-transparent">{row.specialistInitials}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-slate-600">{row.specialist}</span>
                  </div>
                </TableCell>
                <TableCell className="py-3.5">
                  <div className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                    <CalendarDays className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                    <span className="tabular-nums">{row.date}</span>
                  </div>
                </TableCell>
                <TableCell className="py-3.5 text-right">
                  <EstadoLogroPill row={row} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};
