import { useId, useState } from 'react';
import { AlertCircle } from 'lucide-react';
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

interface Props {
  /** Solicitud a rechazar; `null` mantiene el diálogo cerrado. */
  solicitud: { id: string; nombre: string } | null;
  enviando: boolean;
  onCancelar: () => void;
  onConfirmar: (motivo: string) => void;
}

/**
 * Captura el motivo del rechazo de una solicitud de visita.
 *
 * El motivo es obligatorio: rechazar cierra la solicitud y la notificación que
 * recibe el solicitante es lo único que le llega. Sin texto el mensaje queda en
 * «Tu solicitud de visita a X fue rechazada» y no hay nada que corregir para
 * volver a pedirla. Es la misma regla que rige el rechazo de una
 * reprogramación.
 */
export const RechazoDialog = ({ solicitud, enviando, onCancelar, onConfirmar }: Props) => {
  const idMotivo = useId();
  const [motivo, setMotivo] = useState('');
  const [falta, setFalta] = useState(false);

  // El diálogo queda montado entre solicitudes: sin esto, el motivo escrito
  // para una reaparecería al abrir la siguiente. Se ajusta en el render, no en
  // un efecto, porque el valor viejo no debe llegar a pintarse.
  const [abiertoPara, setAbiertoPara] = useState<string | null>(null);
  if ((solicitud?.id ?? null) !== abiertoPara) {
    setAbiertoPara(solicitud?.id ?? null);
    setMotivo('');
    setFalta(false);
  }

  const confirmar = () => {
    const texto = motivo.trim();
    if (!texto) {
      setFalta(true);
      return;
    }
    onConfirmar(texto);
  };

  return (
    <AlertDialog
      open={solicitud !== null}
      onOpenChange={(abierto) => {
        if (!abierto && !enviando) onCancelar();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rechazar solicitud de visita</AlertDialogTitle>
          <AlertDialogDescription>
            Indique el motivo por el que se rechaza la solicitud
            {solicitud ? ` de ${solicitud.nombre}` : ''}. Se notificará al solicitante.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-1.5 py-2">
          <label
            htmlFor={idMotivo}
            className="text-xs font-bold uppercase tracking-wider text-text-muted"
          >
            Motivo del rechazo
          </label>
          <Textarea
            id={idMotivo}
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              setFalta(false);
            }}
            placeholder="Ej: La visita ya está contemplada en el cronograma vigente."
            maxLength={1000}
            rows={3}
          />
          {falta && (
            <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Indique el motivo del rechazo: es lo único que el solicitante va a recibir.
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={enviando}>Cancelar</AlertDialogCancel>
          <Button variant="destructive" onClick={confirmar} disabled={enviando}>
            {enviando ? 'Rechazando…' : 'Rechazar solicitud'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
