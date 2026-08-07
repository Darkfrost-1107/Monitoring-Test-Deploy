import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { VALIDATION } from '@shared/config/constants';
import { useDniAutocomplete } from '@features/docentes/hooks/useDniAutocomplete';
import { checkRoleConflict, type RolObjetivo } from '@shared/constants/roleValidation';
import type { PersonaAutocompleteData } from '@features/docentes/hooks/useDniAutocomplete';
import type { ZodError } from 'zod';
import { mensajeDeError } from '@shared/lib/errores-formulario';
import { useFocoEnCelular } from '@shared/hooks/use-foco-en-celular';

export function extractErrors(
  result: { success: boolean; error?: ZodError<unknown> },
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!result.success && result.error) {
    result.error.issues.forEach((issue) => {
      const path = String(issue.path[0]);
      if (!errors[path]) {
        errors[path] = issue.message;
      }
    });
  }
  return errors;
}

/** Esquema que valida el formulario; se acepta cualquiera de Zod. */
interface EsquemaValidable {
  safeParse: (valor: unknown) => { success: boolean; error?: ZodError<unknown> };
}

interface UsePersonFormOptions {
  dni: string;
  isNew: boolean;
  rolObjetivo: RolObjetivo;
  cargoObjetivo?: string;
  onValidSubmit: () => void;
  isLoading?: boolean;
  /** Esquema y valores con los que se calculan los errores de validación. */
  schema: EsquemaValidable;
  form: unknown;
  /**
   * Errores propios del formulario, que el esquema no expresa. Se aplican
   * encima de los del esquema.
   */
  erroresExtra?: Record<string, string>;
  /** Mensaje del último intento de guardado, para atribuirlo a su campo. */
  serverError?: string | null;
  setPersonaFields: (persona: PersonaAutocompleteData) => void;
  clearPersonaFields: () => void;
}

export interface UsePersonFormReturn {
  /** Errores de validación, ya combinados con los propios del formulario. */
  errors: Record<string, string>;
  /** Mensaje a mostrar en un campo, o cadena vacía. */
  showError: (campo: string) => string;
  /**
   * Envuelve el campo de contacto. Cuando el servidor rechaza por ese dato, la
   * vista se desplaza hasta él y se enfoca su input.
   */
  celularRef: React.RefObject<HTMLDivElement | null>;
  submitted: boolean;
  setSubmitted: React.Dispatch<React.SetStateAction<boolean>>;
  persona: PersonaAutocompleteData | null;
  searchingDni: boolean;
  isDniLocked: boolean;
  dniMessage: string;
  dniBloqueadoPorRol: boolean;
  showRoleConfirm: boolean;
  setShowRoleConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  handleSubmit: () => void;
  handleConfirmRole: () => void;
  dniOk: boolean;
  roleCheck: ReturnType<typeof checkRoleConflict>;
}

export function usePersonForm({
  dni,
  isNew,
  rolObjetivo,
  cargoObjetivo,
  onValidSubmit,
  isLoading = false,
  schema,
  form,
  erroresExtra,
  serverError,
  setPersonaFields,
  clearPersonaFields,
}: UsePersonFormOptions): UsePersonFormReturn {
  const [submitted, setSubmitted] = useState(false);
  const [showRoleConfirm, setShowRoleConfirm] = useState(false);
  const celularRef = useFocoEnCelular(serverError);

  const errors = useMemo(
    () => ({ ...extractErrors(schema.safeParse(form)), ...erroresExtra }),
    [schema, form, erroresExtra],
  );

  const showError = useCallback(
    (campo: string) => mensajeDeError(campo, { errores: errors, enviado: submitted, serverError }),
    [errors, submitted, serverError],
  );

  const { data: persona, isLoading: searchingDni, isLocked: isDniLocked, message: dniMessage } =
    useDniAutocomplete(dni, isNew);

  const roleCheck = checkRoleConflict(persona, rolObjetivo, cargoObjetivo);
  const dniBloqueadoPorRol = roleCheck.bloquea;
  const hadPersonaRef = useRef(false);

  useEffect(() => {
    if (persona) {
      hadPersonaRef.current = true;
      const t = setTimeout(() => {
        setPersonaFields(persona);
      }, 0);
      return () => clearTimeout(t);
    }
    // Limpiar los campos autocompletados en cuanto la persona deja de existir:
    // tanto si el DNI completo no coincide como si se borran dígitos (< 8).
    const shouldClear = !searchingDni && !persona && hadPersonaRef.current;
    if (shouldClear) {
      hadPersonaRef.current = false;
      const t = setTimeout(() => {
        clearPersonaFields();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [persona, searchingDni, dni, setPersonaFields, clearPersonaFields]);

  const handleSubmit = useCallback(() => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0 || isLoading) return;
    if (dniBloqueadoPorRol) return;
    if (roleCheck.advierte && !dniBloqueadoPorRol) {
      setShowRoleConfirm(true);
      return;
    }
    onValidSubmit();
  }, [errors, isLoading, dniBloqueadoPorRol, roleCheck, onValidSubmit]);

  const handleConfirmRole = useCallback(() => {
    setShowRoleConfirm(false);
    onValidSubmit();
  }, [onValidSubmit]);

  const dniOk = dni.length === VALIDATION.DNI_LENGTH && /^\d+$/.test(dni);

  return {
    errors,
    showError,
    celularRef,
    submitted,
    setSubmitted,
    persona,
    searchingDni,
    isDniLocked,
    dniMessage,
    dniBloqueadoPorRol,
    showRoleConfirm,
    setShowRoleConfirm,
    handleSubmit,
    handleConfirmRole,
    dniOk,
    roleCheck,
  };
}
