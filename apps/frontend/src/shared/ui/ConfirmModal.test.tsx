import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { ConfirmModal } from './ConfirmModal';

/**
 * Al confirmar, el diálogo NO debe cerrarse por su cuenta.
 *
 * `AlertDialogAction` de Radix cierra el diálogo de forma sincrónica al hacer
 * click. Para una acción asíncrona que puede fallar —reactivar un plan que
 * choca con otro ya activo— eso desmontaba el modal antes de que llegara el
 * error del backend (409), y el aviso no se veía nunca.
 */
describe('ConfirmModal', () => {
  it('llama onConfirm al pulsar el boton de accion', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmModal
        title="Reactivar"
        message="cuerpo"
        confirmLabel="Reactivar"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Reactivar' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  /**
   * El caso del bug: la acción falla y el modal debe seguir montado para mostrar
   * el error. Se simula un contenedor que, ante el fallo, conserva el modal y le
   * pasa el mensaje —igual que hace la página de planes—.
   */
  it('sigue montado y muestra el error cuando la accion falla', async () => {
    const Contenedor = () => {
      const [error, setError] = useState<string | null>(null);
      const [abierto, setAbierto] = useState(true);

      if (!abierto) return null;

      return (
        <ConfirmModal
          title="Reactivar"
          message={
            <div>
              cuerpo
              {error && <span role="alert">{error}</span>}
            </div>
          }
          confirmLabel="Reactivar"
          onConfirm={() => {
            // La operación async fallo: no se cierra, se muestra el error.
            setError('Ya existe un plan de monitoreo activo tuyo para el año 2026.');
          }}
          onCancel={() => setAbierto(false)}
        />
      );
    };

    render(<Contenedor />);
    await userEvent.click(screen.getByRole('button', { name: 'Reactivar' }));

    expect(screen.getByText(/Ya existe un plan de monitoreo activo/i)).toBeInTheDocument();
    // El boton sigue en pantalla: el modal no se cerro solo.
    expect(screen.getByRole('button', { name: 'Reactivar' })).toBeInTheDocument();
  });

  /**
   * El segundo caso reportado: eliminar un plan con plantillas/cronogramas
   * asociados devuelve 409 y el aviso tiene que verse. Es `danger` y otro
   * `confirmLabel`, pero el mecanismo es el mismo que el de reactivar.
   */
  it('muestra el error tambien en una confirmacion danger (eliminar)', async () => {
    const Contenedor = () => {
      const [error, setError] = useState<string | null>(null);
      return (
        <ConfirmModal
          title="Eliminar"
          message={
            <div>
              cuerpo
              {error && <span role="alert">{error}</span>}
            </div>
          }
          confirmLabel="Eliminar Permanentemente"
          danger
          onConfirm={() =>
            setError('No se puede eliminar el plan porque ya tiene plantillas o visitas asociadas.')
          }
          onCancel={vi.fn()}
        />
      );
    };

    render(<Contenedor />);
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar Permanentemente' }));

    expect(screen.getByText(/No se puede eliminar el plan/i)).toBeInTheDocument();
  });

  it('cierra via onCancel al pulsar cancelar', async () => {
    const onCancel = vi.fn();
    render(
      <ConfirmModal
        title="Reactivar"
        message="cuerpo"
        confirmLabel="Reactivar"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
