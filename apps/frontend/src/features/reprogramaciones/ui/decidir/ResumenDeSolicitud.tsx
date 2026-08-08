import { BookOpen, ArrowRight } from 'lucide-react';
import { Badge } from '@shared/ui/badge';
import { formatearFechaConMes } from '@shared/lib/fecha/fecha';
import type { Cronograma } from '@entities/model-cronogramas';
import type { SolicitudReprogramacion } from '@entities/model-reprogramaciones';

/**
 * La columna izquierda del detalle: de qué visita se trata y qué cambio se
 * pide.
 *
 * Eran ochenta líneas dentro de `DecidirReprogramacionForm`.
 */

const PALETA_DE_ESTADO: Record<string, string> = {
  APROBADO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  RECHAZADO: 'bg-rose-50 text-rose-700 border-rose-200',
  PENDIENTE: 'bg-amber-50 text-amber-700 border-amber-200',
};

interface Props {
  visita: Cronograma;
  solicitud: SolicitudReprogramacion;
}

export const ResumenDeSolicitud = ({ visita, solicitud }: Props) => {
  const aprobada = solicitud.estado === 'APROBADO';

  return (
    <div className="w-full lg:w-80 border-r border-border p-5 bg-slate-50/50 space-y-5 flex flex-col justify-between overflow-y-auto">
      <div className="space-y-5">
        <div className="space-y-3">
          <Titulo>Información Base</Titulo>

          <Dato rotulo="ID Solicitud">
            <Badge
              variant="outline"
              className="text-xs font-black bg-slate-100 border-slate-200 text-slate-700"
            >
              {solicitud.id}
            </Badge>
          </Dato>

          <Dato rotulo="Institución Educativa">
            <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
              <BookOpen className="h-4.5 w-4.5 text-primary" />
              <span>{visita.institucion}</span>
            </div>
          </Dato>

          <Dato rotulo="Especialista Asignado">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <div className="h-5 w-5 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center">
                {visita.especialistaInitials}
              </div>
              <span>{visita.especialista}</span>
            </div>
          </Dato>

          <Dato rotulo="Estado Actual">
            <Badge
              className={`font-bold uppercase text-[9px] tracking-wider py-1 px-2.5 border shadow-sm ${
                PALETA_DE_ESTADO[solicitud.estado] ?? PALETA_DE_ESTADO.PENDIENTE
              }`}
            >
              ● {solicitud.estado}
            </Badge>
          </Dato>
        </div>

        <div className="space-y-3 border-t border-slate-200 pt-4">
          <Titulo>Detalle del Cambio</Titulo>

          <Dato rotulo="Fecha Original">
            <div className="text-xs font-bold text-slate-600 line-through bg-slate-100/60 p-2.5 border border-slate-200/50 rounded-lg">
              {formatearFechaConMes(solicitud.fechaOriginal)}
            </div>
          </Dato>

          <div className="text-center py-0.5">
            <ArrowRight className="h-5 w-5 text-slate-400 mx-auto rotate-90 lg:rotate-0" />
          </div>

          <div className="space-y-1">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider block ${
                aprobada ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              Nueva Fecha Propuesta
            </span>
            <div
              className={`text-xs font-extrabold p-2.5 border rounded-lg ${
                aprobada
                  ? 'text-emerald-700 bg-emerald-50/50 border-emerald-200 font-black shadow-sm'
                  : 'text-slate-700 bg-slate-50 border-slate-200'
              }`}
            >
              {formatearFechaConMes(solicitud.fechaNueva)}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-200 hidden lg:block">
        <span className="text-[9px] text-slate-400 leading-normal block">
          Todos los cambios de cronograma quedan debidamente firmados y guardados en la bitácora de
          auditoría.
        </span>
      </div>
    </div>
  );
};

const Titulo = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">{children}</h3>
);

const Dato = ({ rotulo, children }: { rotulo: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
      {rotulo}
    </span>
    {children}
  </div>
);
