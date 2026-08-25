import { X } from 'lucide-react';
import { SelectField } from '@shared/ui/form-controls';
import {
  areaYaUsada,
  especialidadesExtrasDisponibles,
} from '../lib/especialidades-extras';

/**
 * Áreas adicionales que un docente de Secundaria también dicta.
 *
 * Cuando la plana docente es corta, un profesor cubre más de un área. La
 * principal se elige arriba; acá se suman las extras del mismo catálogo (sin
 * repetir la principal ni las ya agregadas), como chips que se pueden quitar.
 */

interface Props {
  nivel: string;
  principal: string | null | undefined;
  extras: string[];
  onCambiar: (extras: string[]) => void;
  disabled?: boolean;
}

export const EspecialidadesExtrasDocente = ({
  nivel,
  principal,
  extras,
  onCambiar,
  disabled,
}: Props) => {
  const disponibles = especialidadesExtrasDisponibles(nivel, principal, extras);

  const agregar = (valor: string) => {
    if (!valor || areaYaUsada(valor, principal, extras)) return;
    onCambiar([...extras, valor]);
  };
  const quitar = (valor: string) => onCambiar(extras.filter((e) => e !== valor));

  return (
    <div className="flex flex-col gap-2">
      <SelectField
        label="Especialidades Adicionales (Opcional)"
        value=""
        onChange={agregar}
        options={disponibles.map((e) => ({ value: e, label: e }))}
        placeholder={
          disponibles.length ? 'Agregar otra área que dicta' : 'Sin áreas disponibles'
        }
        disabled={disabled || disponibles.length === 0}
      />

      {extras.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {extras.map((e) => (
            <span
              key={e}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1"
            >
              {e}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => quitar(e)}
                  className="hover:text-primary-hover cursor-pointer"
                  aria-label={`Quitar ${e}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
