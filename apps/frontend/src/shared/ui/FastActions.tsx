import { Eye, Pencil, Trash2, RotateCcw, UserMinus, UserPlus, KeyRound } from 'lucide-react';
import { Button } from './button';

interface FastActionsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  onFinalize?: () => void;
  onAssign?: () => void;
  onResetPassword?: () => void;
  viewTitle?: string;
  editTitle?: string;
  deleteTitle?: string;
  restoreTitle?: string;
  finalizeTitle?: string;
  assignTitle?: string;
  resetPasswordTitle?: string;
}

export const FastActions = ({
  onView,
  onEdit,
  onDelete,
  onRestore,
  onFinalize,
  onAssign,
  onResetPassword,
  viewTitle = 'Ver detalle',
  editTitle = 'Editar',
  deleteTitle = 'Eliminar',
  restoreTitle = 'Reactivar',
  finalizeTitle = 'Finalizar Cargo',
  assignTitle = 'Asignar Docentes',
  resetPasswordTitle = 'Restablecer contraseña',
}: FastActionsProps) => {
  return (
    <div className="flex items-center justify-end gap-1">
      {onAssign && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onAssign();
          }}
          className="h-8 w-8 cursor-pointer rounded-lg text-text-muted hover:text-primary hover:bg-primary/10"
          title={assignTitle}
        >
          <UserPlus className="h-4 w-4" />
        </Button>
      )}
      {onView && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
          className="h-8 w-8 cursor-pointer rounded-lg text-text-muted hover:text-primary hover:bg-muted"
          title={viewTitle}
        >
          <Eye className="h-4 w-4" />
        </Button>
      )}
      {onEdit && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="h-8 w-8 cursor-pointer rounded-lg text-text-muted hover:text-blue-600 hover:bg-muted"
          title={editTitle}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {onRestore && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onRestore();
          }}
          className="h-8 w-8 cursor-pointer rounded-lg text-text-muted hover:text-green-600 hover:bg-green-50"
          title={restoreTitle}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      )}
      {onFinalize && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onFinalize();
          }}
          className="h-8 w-8 cursor-pointer rounded-lg text-text-muted hover:text-amber-600 hover:bg-amber-50"
          title={finalizeTitle}
        >
          <UserMinus className="h-4 w-4" />
        </Button>
      )}
      {onResetPassword && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onResetPassword();
          }}
          className="h-8 w-8 cursor-pointer rounded-lg text-text-muted hover:text-amber-600 hover:bg-amber-50"
          title={resetPasswordTitle}
        >
          <KeyRound className="h-4 w-4" />
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="h-8 w-8 cursor-pointer rounded-lg text-text-muted hover:text-destructive hover:bg-destructive/10"
          title={deleteTitle}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
