import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { JefeArea } from '@entities/model-jefes-area';

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

vi.mock('@shared/api/jefes-area.api', () => ({
  jefesAreaApi: {
    activate: vi.fn(),
    deactivate: vi.fn(),
  },
}));

vi.mock('@shared/api/especialistas.api', () => ({
  especialistasApi: {
    restablecerContrasena: vi.fn(),
  },
}));

vi.mock('@features/docentes/ui/ModalRestablecerContrasena', () => ({
  ModalRestablecerContrasena: ({
    docente,
    onClose,
    onConfirm,
    onRestablecida,
  }: {
    docente: { id: string; nombres: string; apellidos: string };
    onClose: () => void;
    onConfirm?: () => Promise<void>;
    onRestablecida?: () => void;
  }) => (
    <div data-testid="modal-restablecer">
      <span>Modal para {docente.nombres}</span>
      <button
        onClick={async () => {
          await onConfirm?.();
          onRestablecida?.();
        }}
      >
        Confirmar
      </button>
      <button onClick={onClose}>Cerrar</button>
    </div>
  ),
}));

import { JefesTableWidget } from './jefes-table';
import { especialistasApi } from '@shared/api/especialistas.api';

const jefeActivo: JefeArea = {
  id: 'jefe-1',
  personaId: 'per-1',
  dni: '12345678',
  nombres: 'Carlos',
  apellidos: 'Mamani',
  correo: 'carlos@ugel.edu.pe',
  celular: '912345678',
  cargo: 'Jefe de Área',
  cargaHoraria: 40,
  nivelEducativo: 'Secundaria',
  activo: true,
  fechaCreacion: '2026-01-01',
};

const montar = (jefes = [jefeActivo], onChanged = vi.fn(), setJefes = vi.fn()) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <JefesTableWidget
          jefes={jefes}
          setJefes={setJefes}
          onView={vi.fn()}
          onEdit={vi.fn()}
          onChanged={onChanged}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('JefesTableWidget - Restablecer Contraseña', () => {
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

  it('no muestra el botón si el jefe es el propio usuario autenticado', () => {
    mockPermissions.push('personal:restablecer_contrasena');
    mockUser = { id: 'u-1', especialistaId: 'jefe-1' };
    montar();

    expect(screen.queryByTitle('Restablecer contraseña')).not.toBeInTheDocument();
  });

  it('deshabilita el botón con tooltip si la contraseña ya está en estado inicial', () => {
    mockPermissions.push('personal:restablecer_contrasena');
    montar([{ ...jefeActivo, contrasenaInicial: true }]);

    const spanDisabled = screen.getByTitle(
      'La contraseña ya se encuentra en su valor inicial (DNI)',
    );
    expect(spanDisabled).toBeInTheDocument();
    const btn = spanDisabled.querySelector('button');
    expect(btn).toBeDisabled();
  });

  it('al confirmar en el modal llama a especialistasApi.restablecerContrasena y ejecuta callbacks', async () => {
    mockPermissions.push('personal:restablecer_contrasena');
    vi.mocked(especialistasApi.restablecerContrasena).mockResolvedValue({
      ok: true,
      data: { success: true, message: 'ok' },
    });
    const onChanged = vi.fn();
    const setJefes = vi.fn();
    montar([jefeActivo], onChanged, setJefes);

    await userEvent.click(screen.getByTitle('Restablecer contraseña'));

    expect(screen.getByTestId('modal-restablecer')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(especialistasApi.restablecerContrasena).toHaveBeenCalledWith('jefe-1');
    expect(onChanged).toHaveBeenCalled();
    expect(setJefes).toHaveBeenCalled();
  });
});
