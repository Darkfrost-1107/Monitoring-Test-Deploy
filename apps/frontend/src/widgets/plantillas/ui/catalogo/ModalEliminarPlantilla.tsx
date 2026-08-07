import { ConfirmModal } from '@shared/ui/ConfirmModal';

/**
 * Confirmación de la eliminación de una plantilla.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Ocupaba cincuenta y cinco líneas al final de
 * `PlantillasCatalog`.
 *
 * El aviso cambia según lo que se pierde: eliminar una plantilla histórica con
 * fichas asociadas borra también esas fichas y sus evidencias, y eso se dice
 * antes de pedir la confirmación.
 */

interface ModalEliminarPlantillaProps {
  /** Descripción de la plantilla, para nombrarla en el aviso. */
  nombre: string;
  /** Fichas de monitoreo que se perderían. `null` mientras se consulta. */
  fichasAsociadas: number | null;
  cargandoInfo: boolean;
  /** Se pierden datos: la plantilla es histórica y tiene fichas. */
  esDestructivo: boolean;
  eliminando: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
  error?: string | null;
}

export const ModalEliminarPlantilla = ({
  nombre,
  fichasAsociadas,
  cargandoInfo,
  esDestructivo,
  eliminando,
  onConfirmar,
  onCancelar,
  error,
}: ModalEliminarPlantillaProps) => (
  <ConfirmModal
    title={
      esDestructivo
        ? 'Eliminar plantilla histórica y todos sus monitoreos'
        : 'Eliminar plantilla de monitoreo'
    }
    message={
      <div className="text-xs text-slate-600 leading-relaxed block space-y-2">
        {cargandoInfo ? (
          <p>Cargando información de monitoreos asociados...</p>
        ) : esDestructivo ? (
          <>
            <p>
              La plantilla <strong>{nombre}</strong> está en estado <strong>Histórico</strong> y
              tiene <strong>{fichasAsociadas}</strong> ficha(s) de monitoreo asociada(s).
            </p>
            <p>
              Al confirmar, se eliminarán <strong>permanentemente</strong>:
            </p>
            <ul className="list-disc list-inside pl-2 text-slate-700">
              <li>La plantilla de monitoreo</li>
              <li>
                {fichasAsociadas} ficha(s) de monitoreo y todas sus respuestas (desempeños,
                aspectos, ejes/items)
              </li>
              <li>Los archivos de evidencia asociados</li>
            </ul>
            <p className="text-rose-600 font-semibold pt-1">Esta acción no se puede deshacer.</p>
          </>
        ) : (
          <p>
            Esta acción eliminará de forma lógica la plantilla seleccionada del catálogo. No se
            podrán programar nuevos monitoreos asociados a esta ficha.
          </p>
        )}
        {error && <p className="text-rose-600 font-semibold">{error}</p>}
      </div>
    }
    confirmLabel={
      eliminando ? 'Eliminando...' : esDestructivo ? 'Sí, eliminar todo' : 'Eliminar plantilla'
    }
    onConfirm={onConfirmar}
    onCancel={onCancelar}
    danger
  />
);
