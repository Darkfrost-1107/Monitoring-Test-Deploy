import { ConfirmModal } from '@shared/ui/ConfirmModal';

/**
 * Confirmación para clonar una plantilla en otro año académico.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Estaba escrito dentro de la grilla de tarjetas
 * de `PlantillasCatalog`, en medio del `map`.
 */

interface ModalClonarPlantillaProps {
  anio: number;
  onAnioChange: (anio: number) => void;
  onConfirmar: () => void;
  onCancelar: () => void;
  error?: string | null;
}

export const ModalClonarPlantilla = ({
  anio,
  onAnioChange,
  onConfirmar,
  onCancelar,
  error,
}: ModalClonarPlantillaProps) => (
  <ConfirmModal
    title="Clonar Plantilla"
    confirmLabel="Clonar"
    cancelLabel="Cancelar"
    onConfirm={onConfirmar}
    onCancel={onCancelar}
    danger={false}
    message={
      <div className="space-y-4 text-left">
        <p className="text-sm text-gray-600">
          Se creará una copia en estado <strong className="text-gray-900">Borrador</strong> de la
          plantilla seleccionada.
        </p>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">Año Académico Destino</label>
          <input
            type="number"
            min="2000"
            max="2100"
            value={anio}
            onChange={(e) => onAnioChange(Number(e.target.value))}
            className="px-3 py-2 border rounded-md"
          />
        </div>
        {error && (
          <div className="text-sm text-red-600 font-semibold bg-red-50 p-2 rounded-md">
            Error: {error}
          </div>
        )}
      </div>
    }
  />
);
