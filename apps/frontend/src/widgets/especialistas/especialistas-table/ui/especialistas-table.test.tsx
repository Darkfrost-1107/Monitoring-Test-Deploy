import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Especialista } from '@entities/model-especialistas';

const mockPermissions: string[] = [];
let mockUser: { id: string; especialistaId?: string } | null = null;

vi.mock('@shared/auth/use-can', () => ({
  useCan: () => ({
    can: (cap: string) => mockPermissions.includes(cap),
  }),
}));

vi.mock('@entities/model-user', () => ({
  useUser: () => ({
    user: mockUser,
  }),
}));

vi.mock('@shared/api/especialistas.api', () => ({
  especialistasApi: {
    restablecerContrasena: vi.fn(),
    activate: vi.fn(),
    deactivate: vi.fn(),
  },
}));

vi.mock('@features/docentes/ui/ModalRestablecerContrasena', () => ({
  ModalRestablecerContrasena: ({
    docente,
    onClose,
    onConfirm,
  }: {
    docente: { id: string; nombres: string; apellidos: string };
    onClose: () => void;
    onConfirm?: () => Promise<void>;
  }) => (
    <div data-testid="modal-restablecer">
      <span>Modal para {docente.nombres}</span>
      <button onClick={() => onConfirm?.()}>Confirmar</button>
      <button onClick={onClose}>Cerrar</button>
    </div>
  ),
}));

import { EspecialistasTableWidget } from './especialistas-table';
import { especialistasApi } from '@shared/api/especialistas.api';

const especialistaActivo = {
  id: 'esp-1',
  dni: '87654321',
  nombres: 'Julia',
  apellidos: 'Torres',
  correo: 'julia@ugel.edu.pe',
  celular: '987654321',
  cargo: 'Especialista',
  nivelEducativo: 'Secundaria',
  especialidades: ['Matemática'],
  activo: true,
} as unknown as Especialista;

const montar = (especialistas = [especialistaActivo]) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <EspecialistasTableWidget
          especialistas={especialistas}
          setEspecialistas={vi.fn()}
          onView={vi.fn()}
          onEdit={vi.fn()}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('EspecialistasTableWidget - Restablecer Contraseña', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPermissions.length = 0;
    mockUser = { id: 'u-jefe', especialistaId: 'otro-esp' };
  });

  it('muestra el botón de restablecer contraseña cuando tiene la capacidad', () => {
    mockPermissions.push('personal:restablecer_contrasena');
    montar();

    expect(screen.getByTitle('Restablecer contraseña')).toBeInTheDocument();
  });

  it('no muestra el botón cuando no tiene la capacidad', () => {
    montar();

    expect(screen.queryByTitle('Restablecer contraseña')).not.toBeInTheDocument();
  });

  it('no muestra el botón si el especialista es el propio usuario autenticado', () => {
    mockPermissions.push('personal:restablecer_contrasena');
    mockUser = { id: 'u-1', especialistaId: 'esp-1' };
    montar();

    expect(screen.queryByTitle('Restablecer contraseña')).not.toBeInTheDocument();
  });

  it('al confirmar en el modal llama a especialistasApi.restablecerContrasena', async () => {
    mockPermissions.push('personal:restablecer_contrasena');
    vi.mocked(especialistasApi.restablecerContrasena).mockResolvedValue({
      ok: true,
      data: { success: true, message: 'ok' },
    });
    montar();

    await userEvent.click(screen.getByTitle('Restablecer contraseña'));

    expect(screen.getByTestId('modal-restablecer')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(especialistasApi.restablecerContrasena).toHaveBeenCalledWith('esp-1');
  });

  it('deshabilita el botón con tooltip explicativo si la contraseña ya es la inicial (DNI)', () => {
    mockPermissions.push('personal:restablecer_contrasena');
    montar([{ ...especialistaActivo, contrasenaInicial: true }]);

    const spanDisabled = screen.getByTitle(
      'La contraseña ya se encuentra en su valor inicial (DNI)',
    );
    expect(spanDisabled).toBeInTheDocument();
    const btn = spanDisabled.querySelector('button');
    expect(btn).toBeDisabled();
  });
});
