import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const { restablecer, toastSuccess, toastError } = vi.hoisted(() => ({
  restablecer: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@shared/api/teachers.api', () => ({
  teachersApi: { restablecerContrasena: restablecer },
}));
vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: toastError } }));

import { ModalRestablecerContrasena } from './ModalRestablecerContrasena';

const docente = { id: 'd-1', nombres: 'Ana', apellidos: 'Quispe' };

const montar = (ui: ReactNode) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      {ui}
    </QueryClientProvider>,
  );

describe('ModalRestablecerContrasena', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra el titulo y el nombre de la persona', () => {
    montar(<ModalRestablecerContrasena docente={docente} onClose={vi.fn()} />);

    expect(screen.getByText('Restablecer contraseña', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.getByText('Quispe, Ana', { selector: 'b' })).toBeInTheDocument();
    expect(
      screen.getByText(/a su DNI\. Deberá cambiarla en su próximo ingreso\./),
    ).toBeInTheDocument();
  });

  it('Cancelar cierra sin llamar al servidor', async () => {
    const onClose = vi.fn();
    montar(<ModalRestablecerContrasena docente={docente} onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalled();
    expect(restablecer).not.toHaveBeenCalled();
  });

  it('al confirmar restablece, avisa y cierra', async () => {
    restablecer.mockResolvedValue({ ok: true, data: { success: true, message: 'ok' } });
    const onClose = vi.fn();
    montar(<ModalRestablecerContrasena docente={docente} onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: 'Restablecer' }));

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith(
        'Contraseña restablecida. Indícale que ingrese con su DNI',
      ),
    );
    expect(restablecer).toHaveBeenCalledWith('d-1');
    expect(onClose).toHaveBeenCalled();
  });

  it('si el servidor rechaza muestra el error y deja el modal abierto', async () => {
    restablecer.mockResolvedValue({ ok: false, error: { message: 'No tiene permisos' } });
    const onClose = vi.fn();
    montar(<ModalRestablecerContrasena docente={docente} onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: 'Restablecer' }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('No tiene permisos'));
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
