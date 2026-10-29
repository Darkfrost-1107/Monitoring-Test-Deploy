import { toast } from 'sonner';
import { ConfirmModal } from '@shared/ui/ConfirmModal';
import { useRestablecerContrasena } from '../hooks/use-restablecer-contrasena';

interface Props {
  docente: { id: string; nombres: string; apellidos: string };
  onClose: () => void;
}

/**
 * Confirma y ejecuta el restablecimiento de la contraseña de una persona del
 * personal. En caso de error el modal queda abierto para poder reintentar.
 */
export const ModalRestablecerContrasena = ({ docente, onClose }: Props) => {
  const { mutate, isPending } = useRestablecerContrasena();

  const confirmar = () => {
    if (isPending) return;
    mutate(docente.id, {
      onSuccess: () => {
        toast.success('Contraseña restablecida. Indícale que ingrese con su DNI');
        onClose();
      },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <ConfirmModal
      title="Restablecer contraseña"
      message={
        <>
          Se restablecerá la contraseña de{' '}
          <b>
            {docente.apellidos}, {docente.nombres}
          </b>{' '}
          a su DNI. Deberá cambiarla en su próximo ingreso.
        </>
      }
      confirmLabel="Restablecer"
      cancelLabel="Cancelar"
      onConfirm={confirmar}
      onCancel={onClose}
    />
  );
};
