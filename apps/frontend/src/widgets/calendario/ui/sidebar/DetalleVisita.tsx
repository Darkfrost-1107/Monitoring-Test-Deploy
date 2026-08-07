import { BookOpen, Calendar, Hash, GraduationCap, CheckCircle2 } from 'lucide-react';
import type { Cronograma } from '@entities/model-cronogramas';
import type { SolicitudReprogramacion } from '@entities/model-reprogramaciones';
import { claseBadgeEstado, clasePuntoEstado, formatearFechaVisita } from '../../lib/visita-presentacion';
import { CampoDetalle } from './CampoDetalle';

interface DetalleVisitaProps {
  visita: Cronograma;
  solicitud: SolicitudReprogramacion | null;
}

/**
 * Ficha de identificación de la visita: quién, dónde, cuándo y en qué estado.
 *
 * Presentación pura. No conoce el origen de los datos ni decide nada sobre
 * ellos: recibe la visita ya resuelta y la muestra.
 */
export const DetalleVisita = ({ visita, solicitud }: DetalleVisitaProps) => (
  <>
    <div className="flex justify-start">
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wider ${claseBadgeEstado(
          visita.estado,
        )}`}
      >
        <span className={`h-2 w-2 rounded-full ${clasePuntoEstado(visita.estado)}`}></span>
        {visita.estado}
      </span>
    </div>

    <div className="space-y-3.5 pt-1">
      <CampoDetalle etiqueta="Institución Educativa">
        <div className="flex items-start gap-2 text-slate-800">
          <BookOpen className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="text-sm font-bold tracking-tight">{visita.institucion}</div>
        </div>
      </CampoDetalle>

      <CampoDetalle etiqueta="Especialista Responsable">
        <div className="flex items-start gap-2 text-slate-800">
          <div className="h-6 w-6 rounded-full bg-primary-light border border-primary/20 text-[10px] font-black text-primary flex items-center justify-center shrink-0 animate-pulse">
            {visita.especialistaInitials}
          </div>
          <div className="text-sm font-semibold pt-0.5 leading-none">{visita.especialista}</div>
        </div>
      </CampoDetalle>

      <CampoDetalle etiqueta={`Evaluado (${visita.tipo})`}>
        <div className="flex items-start gap-2 text-slate-800">
          <GraduationCap className="h-4.5 w-4.5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm font-medium">{visita.docenteDirectivo}</div>
        </div>
      </CampoDetalle>

      <div className="grid grid-cols-2 gap-4 border-t border-b border-slate-100 py-3 my-2">
        <CampoDetalle etiqueta="Fecha Programada">
          <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
            <Calendar className="h-4 w-4 text-primary shrink-0" />
            <span>{formatearFechaVisita(visita.fechaHora)}</span>
          </div>
        </CampoDetalle>

        <CampoDetalle etiqueta="Nº Visita">
          <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
            <Hash className="h-4 w-4 text-primary shrink-0" />
            <span>Visita {visita.nroVisita}</span>
          </div>
        </CampoDetalle>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <CampoDetalle etiqueta="Modalidad">
          <div className="text-xs text-slate-700 font-medium">{visita.modalidad}</div>
        </CampoDetalle>
        <CampoDetalle etiqueta="Nivel Educativo">
          <div className="text-xs text-slate-700 font-medium">{visita.nivel}</div>
        </CampoDetalle>
      </div>

      <CampoDetalle etiqueta="Detalles / Indicaciones" className="space-y-1 pt-1">
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-600 shadow-inner leading-relaxed">
          {visita.observaciones || 'Sin indicaciones o detalles adicionales registrados.'}
        </div>
      </CampoDetalle>

      {visita.estado === 'REPROGRAMADO' && solicitud?.aprobador && (
        <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl text-emerald-800 text-[11px] font-medium leading-relaxed flex items-start gap-2 shadow-sm animate-in fade-in duration-200 mt-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
          <span>
            <strong>Reprogramación Autorizada:</strong> Cambio aprobado por{' '}
            <strong>{solicitud.aprobador}</strong>.
            {solicitud.aprobadorComentario && (
              <span className="block mt-1 font-normal italic text-slate-600">
                "{solicitud.aprobadorComentario}"
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  </>
);
