import { X } from 'lucide-react';
import { AlertDialog, AlertDialogContent } from '@shared/ui/alert-dialog';
import { AsignacionEvaluadorWidget } from '@features/docentes/ui/AsignacionEvaluadorWidget';

/**
 * A quiénes evalúa un coordinador pedagógico o un jefe de taller.
 *
 * Eran veinte líneas de diálogo desnudo al final de `docentes-table.tsx`, con
 * su propio botón de cierre encima del contenido.
 */

interface Props {
  evaluadorId: string;
  evaluadorNombre: string;
  evaluadorCargo: string;
  onCerrar: () => void;
}

export const ModalAsignarEvaluados = ({
  evaluadorId,
  evaluadorNombre,
  evaluadorCargo,
  onCerrar,
}: Props) => (
  <AlertDialog
    open
    onOpenChange={(abierto) => {
      if (!abierto) onCerrar();
    }}
  >
    <AlertDialogContent className="!max-w-5xl !w-[90vw] p-0 overflow-hidden bg-transparent border-0 shadow-none">
      <div className="relative bg-white rounded-xl shadow-xl w-full h-[85vh] flex flex-col overflow-hidden">
        <div className="absolute top-2 right-2 z-10">
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 cursor-pointer border-none outline-none"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <div className="p-4 pt-8 flex-1 overflow-hidden flex flex-col">
          <AsignacionEvaluadorWidget
            evaluadorId={evaluadorId}
            evaluadorNombre={evaluadorNombre}
            evaluadorCargo={evaluadorCargo}
          />
        </div>
      </div>
    </AlertDialogContent>
  </AlertDialog>
);
