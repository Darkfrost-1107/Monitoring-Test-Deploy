import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarClock, RefreshCw } from 'lucide-react';
import { useUser } from '@entities/model-user';
import { Card } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { RoleCode, type ISolicitudVisita } from '@sistema-monitoreo/shared-contracts';
import {
  useSolicitudesVisita,
  useMisSolicitudesVisita,
  useRechazarSolicitud,
  TrazabilidadSolicitudDialog,
} from '@features/visit-requests';
import { TarjetaDeSolicitud } from './solicitudes/TarjetaDeSolicitud';
import { RechazoDialog } from './solicitudes/RechazoDialog';

const ESTADOS = [
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: '', label: 'Todas' },
] as const;

export const SolicitudesVisitaPage = () => {
  const { user } = useUser();
  // El Jefe de Gestión gestiona (atiende/rechaza) todas las solicitudes; el
  // resto (Jefe de Área, Especialista) solo hace seguimiento de las suyas.
  const esGestor = user?.role === RoleCode.JEFE_GESTION;

  const [estado, setEstado] = useState<string>('PENDIENTE');
  const gestorQ = useSolicitudesVisita(estado, esGestor);
  const miasQ = useMisSolicitudesVisita(estado, !esGestor);
  const { data, isLoading, isError, refetch } = esGestor ? gestorQ : miasQ;
  const rechazar = useRechazarSolicitud();
  const navigate = useNavigate();

  // Solicitud seleccionada para rechazar (abre el modal).
  const [rechazando, setRechazando] = useState<{ id: string; nombre: string } | null>(null);
  // Solicitud cuya trazabilidad se está viendo.
  const [trazabilidadId, setTrazabilidadId] = useState<string | null>(null);

  const items = data?.items ?? [];

  // "Atender" abre el registro de cronograma precargado; la solicitud se marca
  // ATENDIDA automáticamente al guardar ese cronograma.
  const handleAtender = (s: ISolicitudVisita) =>
    navigate('/monitoreo/cronograma', {
      state: {
        prefillSolicitud: {
          solicitudId: s.id,
          institucionId: s.institucionId,
          docenteId: s.docenteId,
        },
      },
    });

  const abrirRechazo = (s: ISolicitudVisita) =>
    setRechazando({ id: s.id, nombre: s.docenteNombre ?? s.institucionNombre });

  const confirmarRechazo = (motivo: string) => {
    if (!rechazando) return;
    rechazar.mutate(
      { id: rechazando.id, body: { comentario: motivo } },
      {
        onSuccess: () => {
          toast.success('Solicitud rechazada.');
          setRechazando(null);
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
      ) : isError ? (
        /*
         * Sin esto la lista quedaba vacía y la pantalla decía «No hay
         * solicitudes pendientes»: un fallo de red se veía igual que una
         * bandeja al día, y lo que estaba esperando atención se daba por
         * inexistente.
         */
        <Card
          role="alert"
          className="p-8 text-center border-destructive/20 bg-destructive/5 flex flex-col items-center gap-3"
        >
          <p className="text-sm text-destructive">
            No se pudieron cargar las solicitudes. Puede haber pedidos esperando que no se están
            mostrando.
          </p>
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            <RefreshCw className="w-4 h-4 mr-1" /> Reintentar
          </Button>
        </Card>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-text-muted border-border">
          {estado === 'PENDIENTE' ? 'No hay solicitudes pendientes.' : 'No hay solicitudes.'}
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((s) => (
            <TarjetaDeSolicitud
              key={s.id}
              solicitud={s}
              puedeGestionar={esGestor}
              rechazoEnCurso={rechazar.isPending}
              onAtender={handleAtender}
              onRechazar={abrirRechazo}
              onVerTrazabilidad={setTrazabilidadId}
            />
          ))}
        </div>
      )}

      <RechazoDialog
        solicitud={rechazando}
        enviando={rechazar.isPending}
        onCancelar={() => setRechazando(null)}
        onConfirmar={confirmarRechazo}
      />

      <TrazabilidadSolicitudDialog
        solicitudId={trazabilidadId}
        onClose={() => setTrazabilidadId(null)}
      />
    </div>
  );
};
