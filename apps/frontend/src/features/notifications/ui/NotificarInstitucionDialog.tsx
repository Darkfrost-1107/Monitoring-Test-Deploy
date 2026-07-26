import { useState } from 'react';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import type { DestinatarioAlerta } from '@sistema-monitoreo/shared-contracts';
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
import { useEnviarAlerta } from '../api/use-notifications-api';

const OPCIONES: { value: DestinatarioAlerta; label: string }[] = [
  { value: 'director_ie', label: 'Director de la IE' },
  { value: 'jefe_area', label: 'Jefe de Área (del nivel)' },
];

interface Props {
  institucionId: string;
  institucionNombre: string;
  docenteId?: string;
  docenteNombre?: string;
}

export const NotificarInstitucionDialog = ({
  institucionId,
  institucionNombre,
  docenteId,
  docenteNombre,
}: Props) => {
  const objetivo = docenteNombre ?? institucionNombre;
  const [open, setOpen] = useState(false);
  const [destinatarios, setDestinatarios] = useState<DestinatarioAlerta[]>(['director_ie']);
  const [mensaje, setMensaje] = useState('');
  const enviar = useEnviarAlerta();

  const toggle = (value: DestinatarioAlerta) =>
    setDestinatarios((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value],
    );

  const handleEnviar = () => {
    if (destinatarios.length === 0) {
      toast.error('Selecciona al menos un destinatario.');
      return;
    }
    enviar.mutate(
      { institucionId, docenteId, docenteNombre, destinatarios, mensaje: mensaje.trim() || undefined },
      {
        onSuccess: (res) => {
          const ok = res.resultados.filter((r) => r.inApp || r.email);
          const fail = res.resultados.filter((r) => !r.inApp && !r.email);
          if (ok.length > 0) {
            toast.success(`Notificado a ${ok.map((r) => r.nombre ?? r.rol).join(', ')}.`);
          }
          if (fail.length > 0) {
            toast.warning(`Sin notificar: ${fail.map((r) => r.motivo ?? r.rol).join(' · ')}`);
          }
          setOpen(false);
          setMensaje('');
        },
        onError: (e) => toast.error((e as Error)?.message ?? 'No se pudo enviar la notificación.'),
      },
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button
          className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
          title="Notificar sobre esta IE"
        >
          <Send className="w-3 h-3" /> Notificar
        </button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Notificar sobre {objetivo}</AlertDialogTitle>
          <AlertDialogDescription>
            Se enviará una alerta in-app (y correo, si está disponible) a los destinatarios
            seleccionados{docenteNombre ? `, sobre el docente ${docenteNombre}` : ''}.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Destinatarios
            </span>
            {OPCIONES.map((o) => (
              <label key={o.value} className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={destinatarios.includes(o.value)}
                  onChange={() => toggle(o.value)}
                  className="accent-primary w-4 h-4"
                />
                {o.label}
              </label>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Mensaje (opcional)
            </span>
            <Textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Ej: Programar visita de acompañamiento prioritaria esta semana."
              maxLength={1000}
              rows={3}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={enviar.isPending}>Cancelar</AlertDialogCancel>
          <Button onClick={handleEnviar} disabled={enviar.isPending}>
            {enviar.isPending ? 'Enviando…' : 'Enviar notificación'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
