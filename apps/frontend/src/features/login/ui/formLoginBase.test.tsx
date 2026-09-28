import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BaseLoginForm } from './formLoginBase';

/**
 * Tres intentos fallidos bloquean la cuenta media hora. Escribir la contraseña
 * con Bloq Mayús activado es la forma más tonta de gastarlos, así que el campo
 * avisa mientras la tecla está activa.
 */

const renderizar = () =>
  render(<BaseLoginForm onSubmit={vi.fn()} onForgotPassword={vi.fn()} />);

const campoPassword = () => screen.getByLabelText('Contraseña', { exact: true });

describe('BaseLoginForm — aviso de Bloq Mayús', () => {
  it('avisa al escribir la contraseña con Bloq Mayús activado', () => {
    renderizar();

    fireEvent.keyUp(campoPassword(), { key: 'A', modifierCapsLock: true });

    expect(screen.getByRole('status')).toHaveTextContent(/bloq may[uú]s/i);
  });

  it('no avisa si Bloq Mayús está desactivado', () => {
    renderizar();

    fireEvent.keyUp(campoPassword(), { key: 'a', modifierCapsLock: false });

    expect(screen.queryByText(/bloq may[uú]s/i)).not.toBeInTheDocument();
  });

  it('retira el aviso al desactivar Bloq Mayús', () => {
    renderizar();

    fireEvent.keyUp(campoPassword(), { key: 'A', modifierCapsLock: true });
    fireEvent.keyUp(campoPassword(), { key: 'CapsLock', modifierCapsLock: false });

    expect(screen.queryByText(/bloq may[uú]s/i)).not.toBeInTheDocument();
  });

  it('retira el aviso al salir del campo', () => {
    renderizar();

    fireEvent.keyUp(campoPassword(), { key: 'A', modifierCapsLock: true });
    fireEvent.blur(campoPassword());

    expect(screen.queryByText(/bloq may[uú]s/i)).not.toBeInTheDocument();
  });
});
