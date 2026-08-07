import { ConfirmModal } from '@shared/ui/ConfirmModal';
import type { PersonaAutocompleteData } from '@features/docentes/hooks/useDniAutocomplete';
import { rolesDeclarados } from '../lib/roles-de-persona';

/**
 * Aviso de que la persona ya está registrada, antes de sumarle otro rol.
 *
 * Estaba escrito palabra por palabra en `DocenteFormBase`,
 * `EspecialistaFormBase` y `DirectorFormBase`: treinta líneas repetidas tres
 * veces, cada una con su propia lista de roles.
 */

interface Props {
  persona: PersonaAutocompleteData;
  /** Rol que se le va a agregar. */
  nuevoRol: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export const ConfirmarRolAdicional = ({ persona, nuevoRol, onConfirmar, onCancelar }: Props) => {
  const actuales = rolesDeclarados(persona.roles);

  return (
    <ConfirmModal
      title="Confirmar creación con rol adicional"
      message={
        <div className="text-xs text-slate-600 leading-relaxed space-y-2">
          <p>
            La persona{' '}
            <strong>
              {persona.nombres} {persona.apellidos}
            </strong>{' '}
            (DNI {persona.dni}) ya está registrada en el sistema.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-md p-2.5 text-amber-800">
            <p className="font-semibold">Roles actuales:</p>
            {actuales.length > 0 ? (
              <ul className="list-disc list-inside mt-1 text-[0.72rem]">
                {actuales.map((rol) => (
                  <li key={rol}>{rol}</li>
                ))}
              </ul>
            ) : (
              // La lista vacía dejaba un encabezado sobre la nada, que se leía
              // como que el aviso estaba roto.
              <p className="mt-1 text-[0.72rem] italic">
                Está registrada como persona, sin ningún rol vigente.
              </p>
            )}
          </div>

          <p>
            Se creará un nuevo registro como <strong>{nuevoRol}</strong> además de los roles
            existentes. ¿Desea continuar?
          </p>
        </div>
      }
      confirmLabel="Sí, crear con rol adicional"
      cancelLabel="Cancelar"
      onConfirm={onConfirmar}
      onCancel={onCancelar}
    />
  );
};
