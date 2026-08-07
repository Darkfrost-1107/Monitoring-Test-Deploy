import { ConfirmModal } from '@shared/ui/ConfirmModal';

/**
 * Las confirmaciones de cambio de estado y de eliminación definitiva.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Estaban al final de `PlanMonitoreoAnualPage`,
 * cada una envuelta en una función anónima invocada en el acto.
 */

const AvisoDeError = ({ mensaje }: { mensaje: string }) => (
  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
    <p className="text-xs text-rose-700 font-semibold">{mensaje}</p>
  </div>
);

export const ModalCambiarEstadoPlan = ({
  reactivando,
  procesando,
  error,
  onConfirmar,
  onCancelar,
}: {
  reactivando: boolean;
  procesando: boolean;
  error: string | null;
  onConfirmar: () => void;
  onCancelar: () => void;
}) => (
  <ConfirmModal
    title={
      reactivando
        ? '¿Desea reactivar el Plan de Monitoreo?'
        : '¿Desea desactivar el Plan de Monitoreo?'
    }
    message={
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-muted mt-2">
          {reactivando ? (
            <span>
              Esta acción cambiará el estado de este plan de monitoreo a{' '}
              <strong>Activo</strong> y estará disponible para todos los usuarios.
            </span>
          ) : (
            <span>
              Esta acción cambiará el estado de este plan de monitoreo a{' '}
              <strong>Inactivo</strong>. Ya no estará activo pero seguirá visible para
              reactivación.
            </span>
          )}
        </p>
        {error && <AvisoDeError mensaje={error} />}
      </div>
    }
    confirmLabel={
      procesando
        ? reactivando
          ? 'Reactivando...'
          : 'Desactivando...'
        : reactivando
          ? 'Reactivar Plan'
          : 'Desactivar Plan'
    }
    onConfirm={onConfirmar}
    onCancel={onCancelar}
    danger={!reactivando}
  />
);

export const ModalEliminarPlan = ({
  procesando,
  error,
  onConfirmar,
  onCancelar,
}: {
  procesando: boolean;
  error: string | null;
  onConfirmar: () => void;
  onCancelar: () => void;
}) => (
  <ConfirmModal
    title="¿Eliminar definitivamente el Plan de Monitoreo?"
    message={
      <div className="flex flex-col gap-3">
        <span className="font-bold text-destructive">
          ¡Atención! Esta acción no se puede deshacer.
        </span>
        <span>
          El plan de monitoreo será borrado completamente de la base de datos, siempre y cuando no
          tenga visitas (cronogramas) o plantillas asociadas.
        </span>
        {error && <AvisoDeError mensaje={error} />}
      </div>
    }
    confirmLabel={procesando ? 'Eliminando...' : 'Eliminar Permanentemente'}
    onConfirm={onConfirmar}
    onCancel={onCancelar}
    danger
  />
);
