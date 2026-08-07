import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarClock, Check, X, History, Building2, MapPin, UserRound } from 'lucide-react';
import { useUser } from '@entities/model-user';
import { Card } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Textarea } from '@shared/ui/textarea';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@shared/ui/alert-dialog';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';
import {
  useSolicitudesVisita,
  useMisSolicitudesVisita,
  useRechazarSolicitud,
  TrazabilidadSolicitudDialog,
} from '@features/visit-requests';
import { formatearFechaCorta } from '@shared/lib/fecha/fecha';

const ESTADOS = [
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: '', label: 'Todas' },
] as const;

/** Estilos visuales por estado de la solicitud (acento, badge y punto). */
const ESTADO_STYLE: Record<string, { accent: string; badge: string; dot: string; label: string }> = {
  PENDIENTE: {
    accent: 'border-l-amber-400',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    label: 'Pendiente',
  },
  ATENDIDA: {
    accent: 'border-l-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    label: 'Atendida',
  },
  RECHAZADA: {
    accent: 'border-l-rose-400',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
    label: 'Rechazada',
  },
};

const estadoStyle = (estado: string) => ESTADO_STYLE[estado] ?? ESTADO_STYLE.PENDIENTE;

export const SolicitudesVisitaPage = () => {
  const { user } = useUser();
  // El Jefe de Gestión gestiona (atiende/rechaza) todas las solicitudes; el
  // resto (Jefe de Área, Especialista) solo hace seguimiento de las suyas.
  const esGestor = user?.role === RoleCode.JEFE_GESTION;

  const [estado, setEstado] = useState<string>('PENDIENTE');
  const gestorQ = useSolicitudesVisita(estado, esGestor);
  const miasQ = useMisSolicitudesVisita(estado, !esGestor);
  const { data, isLoading } = esGestor ? gestorQ : miasQ;
  const rechazar = useRechazarSolicitud();
  const navigate = useNavigate();

  // Solicitud seleccionada para rechazar (abre el modal) y su motivo.
  const [rechazando, setRechazando] = useState<{ id: string; nombre: string } | null>(null);
  const [motivo, setMotivo] = useState('');
  // Solicitud cuya trazabilidad se está viendo.
  const [trazabilidadId, setTrazabilidadId] = useState<string | null>(null);

  const items = data?.items ?? [];

  // "Atender" abre el registro de cronograma precargado; la solicitud se marca
  // ATENDIDA automáticamente al guardar ese cronograma.
  const handleAtender = (s: (typeof items)[number]) =>
    navigate('/monitoreo/cronograma', {
      state: {
        prefillSolicitud: {
          solicitudId: s.id,
          institucionId: s.institucionId,
          docenteId: s.docenteId,
        },
      },
    });

  const abrirRechazo = (s: (typeof items)[number]) => {
    setMotivo('');
    setRechazando({ id: s.id, nombre: s.docenteNombre ?? s.institucionNombre });
  };

  const confirmarRechazo = () => {
    if (!rechazando) return;
    rechazar.mutate(
      { id: rechazando.id, body: { comentario: motivo.trim() || undefined } },
      {
        onSuccess: () => {
          toast.success('Solicitud rechazada.');
          setRechazando(null);
          setMotivo('');
        },
        onError: (e) => toast.error((e as Error)?.message ?? 'No se pudo rechazar.'),
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarClock className="w-6 h-6" /> Solicitudes de visita
          </h1>
          <p className="text-sm text-text-muted">
            {esGestor
              ? 'Pedidos de visita de monitoreo priorizados. Atiéndelos agendando la visita.'
              : 'Seguimiento de las visitas de monitoreo que solicitaste al Jefe de Gestión.'}
          </p>
        </div>
        <div className="flex gap-1">
          {ESTADOS.map((e) => (
            <button
              key={e.value}
              onClick={() => setEstado(e.value)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium ${
                estado === e.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-text-muted'
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-text-muted">Cargando…</p>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-text-muted border-border">
          No hay solicitudes {estado === 'PENDIENTE' ? 'pendientes' : ''}.
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((s) => {
            const est = estadoStyle(s.estado);
            return (
              <Card
                key={s.id}
                className={`p-4 border-border border-l-4 ${est.accent} shadow-xs hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-start justify-between gap-4`}
              >
                <div className="min-w-0 flex gap-3">
                  {/* Ícono de la IE */}
                  <div className="hidden sm:flex w-10 h-10 shrink-0 rounded-xl bg-primary/10 text-primary items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[0.95rem] truncate">{s.institucionNombre}</span>
                      <Badge
                        variant={s.prioridad === 'ALTA' ? 'destructive' : 'secondary'}
                        className="text-[10px] uppercase font-bold"
                      >
                        {s.prioridad}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-bold border ${est.badge}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full mr-1 ${est.dot}`} />
                        {est.label}
                      </Badge>
                    </div>

                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-text-muted uppercase tracking-wide">
                      <MapPin className="w-3 h-3" /> {s.distrito}
                    </div>

                    {s.docenteNombre && (
                      <p className="text-sm mt-1.5 font-semibold text-foreground flex items-center gap-1.5">
                        <UserRound className="w-3.5 h-3.5 text-primary" /> {s.docenteNombre}
                      </p>
                    )}

                    {s.motivo && (
                      <p className="text-[13px] mt-1.5 text-text-muted italic border-l-2 border-border pl-2.5">
                        “{s.motivo}”
                      </p>
                    )}

                    <p className="text-[11px] text-text-muted mt-2 flex items-center gap-1">
                      <CalendarClock className="w-3 h-3" />
                      {s.solicitanteNombre} · {formatearFechaCorta(s.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0 self-start">
                  {esGestor && s.estado === 'PENDIENTE' && (
                    <>
                      <Button size="sm" onClick={() => handleAtender(s)}>
                        <Check className="w-4 h-4 mr-1" /> Atender
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => abrirRechazo(s)}
                        disabled={rechazar.isPending}
                      >
                        <X className="w-4 h-4 mr-1" /> Rechazar
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-text-muted hover:text-primary"
                    onClick={() => setTrazabilidadId(s.id)}
                    title="Ver trazabilidad de la solicitud"
                  >
                    <History className="w-4 h-4 mr-1" /> Trazabilidad
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de rechazo: captura el motivo que verá el solicitante. */}
      <AlertDialog
        open={rechazando !== null}
        onOpenChange={(open) => {
          if (!open && !rechazar.isPending) setRechazando(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar solicitud de visita</AlertDialogTitle>
            <AlertDialogDescription>
              Indica el motivo por el que se rechaza la solicitud
              {rechazando ? ` de ${rechazando.nombre}` : ''}. Se notificará al solicitante.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-1.5 py-2">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Motivo del rechazo (opcional)
            </span>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: La visita ya está contemplada en el cronograma vigente."
              maxLength={1000}
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={rechazar.isPending}>Cancelar</AlertDialogCancel>
            <Button variant="destructive" onClick={confirmarRechazo} disabled={rechazar.isPending}>
              {rechazar.isPending ? 'Rechazando…' : 'Rechazar solicitud'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de trazabilidad de la solicitud seleccionada. */}
      <TrazabilidadSolicitudDialog
        solicitudId={trazabilidadId}
        onClose={() => setTrazabilidadId(null)}
      />
    </div>
  );
};
