import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useUser } from '@entities/model-user';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@shared/ui/alert-dialog';
import { Button } from '@shared/ui/button';
import { Textarea } from '@shared/ui/textarea';
import { useSolicitarVisita } from '../api/use-visits-api';

interface Props {
  institucionId: string;
  institucionNombre: string;
  docenteId?: string;
  docenteNombre?: string;
}

const btnClass =
  'text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-60';

export const SolicitarVisitaButton = ({
  institucionId,
  institucionNombre,
  docenteId,
  docenteNombre,
}: Props) => {
  const { user } = useUser();
  const navigate = useNavigate();
  const solicitar = useSolicitarVisita();
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState('');

  const objetivo = docenteNombre ?? institucionNombre;

  // El Jefe de Gestión agenda la visita directamente (abre el Registro de
  // Cronograma precargado); no crea una solicitud.
  const esJefeGestion = user?.role === 'jefe_gestion';

  if (esJefeGestion) {
    return (
      <button
        onClick={() =>
          navigate('/monitoreo/cronograma', {
            state: { prefillSolicitud: { institucionId, docenteId } },
          })
        }
        className={btnClass}
        title="Generar la visita de monitoreo (registrar cronograma)"
      >
        <CalendarPlus className="w-3 h-3" /> Generar visita
      </button>
    );
  }

  // Resto de roles: solicitan la visita explicando el motivo (trazabilidad).
  const handleSolicitar = () => {
    if (!motivo.trim()) {
      toast.error('Indica el motivo de la visita.');
      return;
    }
    solicitar.mutate(
      { institucionId, docenteId, prioridad: 'ALTA', motivo: motivo.trim() },
      {
        onSuccess: () => {
          toast.success(`Visita solicitada para ${objetivo}.`);
          setOpen(false);
          setMotivo('');
        },
        onError: (e) => toast.error((e as Error)?.message ?? 'No se pudo solicitar la visita.'),
      },
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button className={btnClass} title="Solicitar visita de monitoreo prioritaria">
          <CalendarPlus className="w-3 h-3" /> Solicitar visita
        </button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Solicitar visita de monitoreo</AlertDialogTitle>
          <AlertDialogDescription>
            Explica a qué se debe la visita solicitada para {objetivo}. Este motivo queda
            registrado para trazabilidad y lo verá quien la atienda.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-1.5 py-2">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Motivo de la visita
          </span>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: Docente en nivel crítico tras el primer monitoreo; requiere acompañamiento prioritario."
            maxLength={1000}
            rows={3}
            autoFocus
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={solicitar.isPending}>Cancelar</AlertDialogCancel>
          <Button onClick={handleSolicitar} disabled={solicitar.isPending}>
            {solicitar.isPending ? 'Solicitando…' : 'Solicitar visita'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
