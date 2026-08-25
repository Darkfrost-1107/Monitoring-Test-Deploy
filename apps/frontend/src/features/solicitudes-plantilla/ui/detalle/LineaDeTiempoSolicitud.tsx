import { Clock } from 'lucide-react';
import { Badge } from '@shared/ui/badge';
import { formatearFechaCorta } from '@shared/lib/fecha/fecha';
import type { ISolicitudPlantilla } from '@sistema-monitoreo/shared-contracts';
import { BotonJustificacion } from '../BotonJustificacion';

/**
 * Bitácora del pedido: quién lo presentó, quién lo resolvió y con qué sustento.
 *
 * Sigue la línea de tiempo que ya usa la reprogramación de cronograma. No es
 * copiar por copiar: es el mismo acto administrativo —alguien pide, la Jefatura
 * decide— y presentarlo distinto obligaría a la misma persona a aprender dos
 * lenguajes visuales para leer lo mismo.
 */

const CIERRE: Record<string, { insignia: string; nodo: string; titulo: string; texto: string }> = {
  APROBADA: {
    insignia: 'bg-emerald-800',
    nodo: 'bg-emerald-600',
    titulo: 'Cupos habilitados',
    texto:
      'La institución ya puede crear las plantillas aprobadas, una por cada fila del pedido. Cada cupo se consume al crear su plantilla y no se reutiliza.',
  },
  RECHAZADA: {
    insignia: 'bg-rose-800',
    nodo: 'bg-rose-600',
    titulo: 'Trámite concluido',
    texto:
      'El pedido fue denegado. La institución sigue trabajando con las fichas oficiales de la UGEL y puede presentar una solicitud nueva atendiendo el motivo.',
  },
};

interface Props {
  solicitud: ISolicitudPlantilla;
}

export const LineaDeTiempoSolicitud = ({ solicitud }: Props) => {
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
                  {solicitud.estado === 'APROBADA' ? 'CUPOS OTORGADOS' : 'PEDIDO DENEGADO'}
                </Badge>
              }
              fecha={solicitud.resueltaAt ?? undefined}
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
              fecha={solicitud.resueltaAt ?? undefined}
            />
            <h4 className="text-xs font-black text-slate-800">
              {solicitud.estado === 'APROBADA' ? 'Solicitud Aprobada' : 'Solicitud Rechazada'}
            </h4>
            <div className="text-[11px] text-slate-600 font-medium">
              Por: <strong>{solicitud.resueltaPor || 'No registrado'}</strong>
            </div>

            {solicitud.comentario ? (
              <div className="text-[11px] text-primary bg-primary-light/60 border border-primary/10 rounded-xl p-3.5 shadow-inner italic leading-relaxed">
                <strong>
                  {solicitud.estado === 'RECHAZADA' ? 'Motivo del rechazo' : 'Comentario de la Jefatura'}:
                </strong>{' '}
                &laquo;{solicitud.comentario}&raquo;
              </div>
            ) : (
              // Sin comentario se dice así, en vez de imprimir comillas vacías.
              <p className="text-[11px] text-slate-400 italic">La jefatura no dejó comentario.</p>
            )}
          </Nodo>
        )}

        <Nodo color="bg-slate-400">
          <Encabezado
            insignia={<InsigniaNeutra>REGISTRO INICIAL</InsigniaNeutra>}
            fecha={solicitud.createdAt}
          />
          <h4 className="text-xs font-black text-slate-800">Solicitud Presentada</h4>
          <div className="text-[11px] text-slate-600 font-medium">
            Por: <strong>{solicitud.solicitante}</strong> (Director de I.E.)
          </div>

          <div className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl p-3 shadow-inner">
            <strong>Plantillas pedidas:</strong> {solicitud.items.length}
            {solicitud.items.length === 1 ? ' plantilla' : ' plantillas'} para el año{' '}
            {solicitud.anioEscolar}.
          </div>

          <div className="pt-1">
            <BotonJustificacion solicitudId={solicitud.id} />
          </div>
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
