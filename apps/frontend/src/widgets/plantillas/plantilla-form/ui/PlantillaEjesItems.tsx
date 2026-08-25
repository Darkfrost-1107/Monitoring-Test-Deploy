import { Plus, Trash2, GripVertical } from 'lucide-react';
import { SectionCard } from '@shared/ui/form-controls';
import { crearEjeItemVacio } from '@entities/model-plantillas';
import type { EjeItem } from '@entities/model-plantillas';

interface Props {
  ejeItems: EjeItem[];
  onChange: (items: EjeItem[]) => void;
}

export const PlantillaEjesItems = ({ ejeItems, onChange }: Props) => {
  const updateItem = (id: string, patch: Partial<EjeItem>) =>
    onChange(ejeItems.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const removeItem = (id: string) =>
    onChange(
      ejeItems
        .filter((item) => item.id !== id)
        .map((item, i) => ({ ...item, numero: i + 1 }))
    );

  const addItem = () => {
    const newItem = crearEjeItemVacio();
    newItem.numero = ejeItems.length + 1;
    onChange([...ejeItems, newItem]);
  };

  return (
    <SectionCard icon={<GripVertical className="w-5 h-5" />} title="3. Planificación y Diseño de Evaluación">
      <div className="flex flex-col gap-3">
        {ejeItems.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
              {item.numero}
            </span>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={item.numero}
                  onChange={(e) => updateItem(item.id, { numero: parseInt(e.target.value) || 1 })}
                  className="w-16 rounded-lg border border-input bg-transparent px-2 py-1.5 text-sm text-center"
                />
                <span className="text-xs text-text-muted font-semibold">N°</span>
              </div>
              <textarea
                value={item.descripcion}
                onChange={(e) => updateItem(item.id, { descripcion: e.target.value })}
                placeholder="Describe el Eje o Item a evaluar..."
                className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                rows={2}
              />
            </div>
            {/* La sección es opcional: se debe poder eliminar hasta el último eje
                (p. ej. uno creado por error), quedando la planificación en cero. */}
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="p-1.5 rounded-lg text-text-muted hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              aria-label="Eliminar item"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addItem}
          className="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-border py-4 text-text-muted transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary cursor-pointer"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
          <span className="text-sm font-semibold">Agregar Eje / Item</span>
          <span className="text-xs">Define ítems con numeración y descripción para evaluación docente</span>
        </button>
      </div>
    </SectionCard>
  );
};
