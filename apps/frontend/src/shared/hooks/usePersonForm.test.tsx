import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Estado del autocomplete de DNI, controlado desde los tests.
const h = vi.hoisted(() => ({
  data: null as unknown,
  isLoading: false,
}));

vi.mock('@features/docentes/hooks/useDniAutocomplete', () => ({
  useDniAutocomplete: () => ({
    data: h.data,
    isLoading: h.isLoading,
    isFound: !!h.data,
    isLocked: !!h.data,
    message: '',
  }),
}));

// Aislar la lógica de limpieza: sin conflicto de rol.
vi.mock('@shared/constants/roleValidation', () => ({
  checkRoleConflict: () => ({ bloquea: false, advierte: false, mensaje: null, detalle: null }),
}));

import { usePersonForm } from './usePersonForm';

const personaFake = {
  id: 'p1',
  dni: '40000002',
  nombres: 'Maria Elena',
  apellidos: 'Huaman Vargas',
  correo: 'maria.huaman@ugel.gob.pe',
  telefono: null,
  tieneUsuario: true,
  roles: {},
};

const render = (dni: string) => {
  const setPersonaFields = vi.fn();
  const clearPersonaFields = vi.fn();
  const view = renderHook((props: { dni: string }) =>
    usePersonForm({
      dni: props.dni,
      isNew: true,
      rolObjetivo: 'especialista',
      onValidSubmit: vi.fn(),
      schema: { safeParse: () => ({ success: true }) },
      form: {},
      setPersonaFields,
      clearPersonaFields,
    }),
    { initialProps: { dni } },
  );
  return { ...view, setPersonaFields, clearPersonaFields };
};

beforeEach(() => {
  h.data = null;
  h.isLoading = false;
});

describe('usePersonForm — limpieza de campos autocompletados', () => {
  it('autocompleta cuando se encuentra la persona con el DNI completo', async () => {
    h.data = personaFake;
    const { setPersonaFields } = render('40000002');
    await waitFor(() => expect(setPersonaFields).toHaveBeenCalledWith(personaFake));
  });

  it('limpia los campos al borrar un dígito del DNI (regresión)', async () => {
    h.data = personaFake;
    const { rerender, setPersonaFields, clearPersonaFields } = render('40000002');
    await waitFor(() => expect(setPersonaFields).toHaveBeenCalled());

    // El usuario borra un dígito: DNI incompleto -> el autocomplete deja de tener persona.
    h.data = null;
    rerender({ dni: '4000000' });

    await waitFor(() => expect(clearPersonaFields).toHaveBeenCalledTimes(1));
  });

  it('limpia los campos al borrar todo el DNI', async () => {
    h.data = personaFake;
    const { rerender, setPersonaFields, clearPersonaFields } = render('40000002');
    await waitFor(() => expect(setPersonaFields).toHaveBeenCalled());

    h.data = null;
    rerender({ dni: '' });

    await waitFor(() => expect(clearPersonaFields).toHaveBeenCalledTimes(1));
  });

  it('no limpia mientras se está buscando (evita borrar en pleno tipeo)', async () => {
    h.data = personaFake;
    const { rerender, clearPersonaFields } = render('40000002');

    // Cambia a otro DNI de 8 dígitos que aún se está consultando.
    h.data = null;
    h.isLoading = true;
    rerender({ dni: '40000003' });

    // Le damos margen a los timeouts(0) del efecto.
    await new Promise((r) => setTimeout(r, 20));
    expect(clearPersonaFields).not.toHaveBeenCalled();
  });
});
