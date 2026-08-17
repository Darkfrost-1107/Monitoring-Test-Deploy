import { School, User, UserCheck, Calendar } from 'lucide-react';
import type { Cronograma } from '@/entities/model-cronogramas';
import { formatearFechaCorta, formatearHora } from '@/shared/lib/fecha/fecha';

interface BannerDatosVisitaProps {
  visit: Cronograma;
}

export const BannerDatosVisita = ({ visit }: BannerDatosVisitaProps) => (
  <div className="px-4 sm:px-6 py-1.5 bg-slate-50 border-b border-border/80 text-[11px] text-slate-500 font-medium flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
    <div className="flex items-center gap-1.5 min-w-0">
      <School className="h-3.5 w-3.5 text-primary shrink-0" />
      <span className="truncate">
        I.E. <strong className="text-slate-800 font-semibold">{visit.institucion}</strong>
      </span>
    </div>
    <div className="flex items-center gap-1.5 min-w-0">
      <User className="h-3.5 w-3.5 text-primary shrink-0" />
      <span className="truncate">
        Docente: <strong className="text-slate-800 font-semibold">{visit.docenteDirectivo}</strong>
      </span>
    </div>
    <div className="flex items-center gap-1.5 min-w-0">
      <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
      <span className="truncate">
        Monitor: <strong className="text-slate-800 font-semibold">{visit.especialista}</strong>
      </span>
    </div>
    <div className="flex items-center gap-1.5 min-w-0">
      <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
      <span className="truncate">
        <strong className="text-slate-800 font-semibold">
          {formatearFechaCorta(visit.fechaHora)} - {formatearHora(visit.fechaHora)}
        </strong>
      </span>
    </div>
  </div>
);
