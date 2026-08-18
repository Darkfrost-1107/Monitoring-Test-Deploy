import type { ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog';

/* ============================================================
 * Modal de confirmación reutilizable adaptado a shadcn/ui.
 * Mantiene la misma API de props para no romper integraciones.
 * ============================================================ */

interface Props {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export const ConfirmModal = ({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  danger = false,
}: Props) => {
  return (
    <AlertDialog
      open={true}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-sm text-text-muted mt-2">{message}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel onClick={onCancel}>{cancelLabel}</AlertDialogCancel>
          {/*
            `AlertDialogAction` de Radix cierra el diálogo al hacer click, de
            forma sincrónica. Para una acción asíncrona que puede fallar —como
            reactivar un plan que choca con otro ya activo— eso desmontaba el
            modal antes de que llegara el error, y el aviso no se veía nunca.
            Se evita el cierre automático: el diálogo queda montado y quien lo usa
            decide cerrarlo cuando la operación tiene éxito.
          */}
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            variant={danger ? 'destructive' : 'default'}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
