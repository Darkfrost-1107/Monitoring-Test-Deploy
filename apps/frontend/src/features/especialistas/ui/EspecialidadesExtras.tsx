import { X } from 'lucide-react';
import { SelectField } from '@shared/ui/form-controls';
import { especialidadesExtrasDeSecundariaDisponibles } from '../lib/perfil-especialista';

/**
 * Áreas curriculares adicionales de un especialista de Secundaria.
 *
 * Antes era un campo de texto libre con botón «Agregar»: cualquier variación
 * de tilde o mayúscula («CTA» vs. «Ciencia y Tecnología») guardaba una
 * especialidad distinta en el catálogo, y el cruce con el área del docente
 * nunca coincidía. Ahora es un selector sobre el mismo catálogo oficial que
 * usa el formulario de docente.
 */

interface Props {
  extras: string[];
  principal: string | null | undefined;
  onCambiar: (extras: string[]) => void;
}

export const EspecialidadesExtras = ({ extras, principal, onCambiar }: Props) => {
  const disponibles = especialidadesExtrasDeSecundariaDisponibles(principal, extras);

  const agregar = (valor: string) => {
    if (!valor) return;
    onCambiar([...extras, valor]);
  };

  return (
    <div className="flex flex-col gap-1.5 mt-[18px]">
      <SelectField
        label="Especialidades Extras / Temporales"
        value=""
        onChange={agregar}
        options={disponibles.map((e) => ({ value: e, label: e }))}
        placeholder={disponibles.length ? 'Agregar otra área que dicta' : 'Sin áreas disponibles'}
        disabled={disponibles.length === 0}
      />

      {extras.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {extras.map((especialidad) => (
            <span
              key={especialidad}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
            >
              {especialidad}
              <button
                type="button"
                aria-label={`Quitar ${especialidad}`}
                onClick={() => onCambiar(extras.filter((e) => e !== especialidad))}
                className="hover:text-destructive transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
