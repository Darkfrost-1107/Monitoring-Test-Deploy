import { ConfirmModal } from '@shared/ui/ConfirmModal';
import {
  esCambioIrreversible,
  siguienteEstado,
  type EstadoDePlantilla,
} from '@features/plantillas/lib/estado-plantilla';

/**
 * Confirmación del cambio de estado de una plantilla.
 *
 * Fase 7 de PLAN_REMEDIACION.md. El estado siguiente se recalculaba acá, con
 * una copia del mismo ternario anidado que usaba el manejador que aplica el
 * cambio. Ahora ambos llaman a `siguienteEstado`, de modo que lo que el modal
 * anuncia y lo que la acción aplica no pueden separarse.
 */

interface ModalCambiarEstadoProps {
  descripcion: string;
  estado: EstadoDePlantilla;
  onConfirmar: () => void;
  onCancelar: () => void;
  error?: string | null;
}

export const ModalCambiarEstado = ({
  descripcion,
  estado,
  onConfirmar,
  onCancelar,
  error,
}: ModalCambiarEstadoProps) => (
  <ConfirmModal
    title="Confirmar Cambio de Estado"
    confirmLabel="Cambiar Estado"
    cancelLabel="Cancelar"
    onConfirm={onConfirmar}
    onCancel={onCancelar}
    danger={false}
    message={
      <div className="space-y-4 text-left">
        <p className="text-sm text-slate-600">
          ¿Estás seguro de que deseas cambiar el estado de la plantilla{' '}
          <strong>{descripcion}</strong> de <strong>{estado}</strong> a{' '}
          <strong>{siguienteEstado(estado)}</strong>?
        </p>
        {esCambioIrreversible(estado) && (
          <p className="text-xs text-rose-600 font-medium">
            Nota: Al pasar a Histórico, esta plantilla no podrá volver a ser Vigente.
          </p>
        )}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
            <p className="text-xs text-rose-700 font-semibold">Error: {error}</p>
          </div>
        )}
      </div>
    }
  />
);
