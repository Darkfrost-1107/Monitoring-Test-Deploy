import { Clock } from 'lucide-react';
import { Badge } from '@shared/ui/badge';
import { formatearFechaCorta } from '@shared/lib/fecha/fecha';
import type { SolicitudReprogramacion } from '@entities/model-reprogramaciones';
import { AdjuntoDeSustento } from './AdjuntoDeSustento';

/**
 * La bitácora de la solicitud: quién la creó, quién la resolvió y con qué
 * sustento.
 *
 * Eran ciento diez líneas dentro de `DecidirReprogramacionForm`, con los tres
 * nodos escritos uno debajo del otro y la misma condición repetida en dos.
 */

interface Props {
  solicitud: SolicitudReprogramacion;
  /** Nombre de quien pidió el cambio, tal como se muestra. */
  solicitante: string;
}

const CIERRE: Record<string, { insignia: string; nodo: string; titulo: string; texto: string }> = {
  APROBADO: {
    insignia: 'bg-emerald-800',
    nodo: 'bg-emerald-600',
    titulo: 'Cronograma Actualizado',
    texto:
      'El sistema ha actualizado automáticamente el cronograma principal en el calendario. Las notificaciones pertinentes han sido enviadas a la I.E. y a la casilla del especialista.',
  },
  RECHAZADO: {
    insignia: 'bg-rose-800',
    nodo: 'bg-rose-600',
    titulo: 'Flujo de Reprogramación Concluido',
    texto:
      'La solicitud de reprogramación fue denegada por la jefatura. El monitoreo conserva su fecha original de programación.',
  },
};

export const LineaDeTiempo = ({ solicitud, solicitante }: Props) => {
  const resuelta = solicitud.estado !== 'PENDIENTE';
  const cierre = CIERRE[solicitud.estado];

  return (
    <>
      <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
        <Clock className="h-4.5 w-4.5 text-primary" />
        <span>Línea de Tiempo de Auditoría</span>
      </h3>

      <div className="relative pl-6 border-l-2 border-slate-200 space-y-6 py-2 ml-2">
        {resuelta && cierre && (
          <Nodo color={cierre.nodo}>
            <Encabezado
              insignia={
                <Badge
                  className={`font-black text-[9px] tracking-wider py-0.5 px-2 text-white ${cierre.insignia}`}
                >
                  {solicitud.estado === 'APROBADO' ? 'CAMBIO APLICADO' : 'SOLICITUD RECHAZADA'}
                </Badge>
              }
              fecha={solicitud.fechaAprobacion}
            />
            <h4 className="text-xs font-black text-slate-800">{cierre.titulo}</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl p-3 shadow-inner">
              {cierre.texto}
            </p>
          </Nodo>
        )}

        {resuelta && (
          <Nodo color="bg-slate-400">
            <Encabezado
              insignia={<InsigniaNeutra>REVISIÓN JEFATURA</InsigniaNeutra>}
              fecha={solicitud.fechaAprobacion}
            />
            <h4 className="text-xs font-black text-slate-800">
              {solicitud.estado === 'APROBADO' ? 'Solicitud Aprobada' : 'Revisión Concluida'}
            </h4>
            <div className="text-[11px] text-slate-600 font-medium">
              Por: <strong>{solicitud.aprobador || 'No registrado'}</strong>
            </div>

            {solicitud.aprobadorComentario ? (
              <div className="text-[11px] text-primary bg-primary-light/60 border border-primary/10 rounded-xl p-3.5 shadow-inner italic leading-relaxed">
                <strong>Comentario de la Jefatura:</strong> &laquo;{solicitud.aprobadorComentario}
                &raquo;
              </div>
            ) : (
              // Antes se imprimían las comillas vacías: «Comentario: ""».
              <p className="text-[11px] text-slate-400 italic">
                La jefatura no dejó comentario.
              </p>
            )}
          </Nodo>
        )}

        <Nodo color="bg-slate-400">
          <Encabezado
            insignia={<InsigniaNeutra>REGISTRO INICIAL</InsigniaNeutra>}
            fecha={solicitud.fechaRegistro}
          />
          <h4 className="text-xs font-black text-slate-800">Solicitud de Cambio Creada</h4>
          <div className="text-[11px] text-slate-600 font-medium">
            Por: <strong>{solicitante}</strong> (Especialista Asignado)
          </div>

          <div className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl p-3 shadow-inner">
            <strong>Motivo de la solicitud:</strong> &laquo;{solicitud.motivo}&raquo;
          </div>

          {solicitud.adjunto && <AdjuntoDeSustento adjunto={solicitud.adjunto} />}
        </Nodo>
      </div>
    </>
  );
};

const Nodo = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <div className="relative animate-in fade-in duration-300">
    <div
      className={`absolute -left-[31px] top-1.5 h-4.5 w-4.5 rounded-full border-2 border-white shadow ${color}`}
    />
    <div className="space-y-1">{children}</div>
  </div>
);

/** La fecha se formatea siempre; antes `fechaRegistro` salía cruda. */
const Encabezado = ({ insignia, fecha }: { insignia: React.ReactNode; fecha?: string }) => (
  <div className="flex items-center justify-between flex-wrap gap-2">
    {insignia}
    <span className="text-[10px] text-slate-400 font-semibold">
      {formatearFechaCorta(fecha, 'Sin fecha')}
    </span>
  </div>
);

const InsigniaNeutra = ({ children }: { children: React.ReactNode }) => (
  <Badge
    variant="outline"
    className="border-slate-200 text-slate-600 bg-slate-50 font-bold text-[9px] tracking-wider py-0.5 px-2"
  >
    {children}
  </Badge>
);
