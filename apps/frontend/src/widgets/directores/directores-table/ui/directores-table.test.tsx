import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Docente } from '@entities/model-docentes';

const mockPermissions: string[] = [];
let mockUser: { id: string; docenteId?: string } | null = null;

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

vi.mock('@features/docentes/ui/ModalRestablecerContrasena', () => ({
  ModalRestablecerContrasena: ({
    docente,
    onClose,
  }: {
    docente: { id: string; nombres: string; apellidos: string };
    onClose: () => void;
  }) => (
    <div data-testid="modal-restablecer">
      <span>Modal para {docente.nombres}</span>
      <button onClick={onClose}>Cerrar</button>
    </div>
  ),
}));

import { DirectoresTableWidget } from './directores-table';

const directorActivo = {
  id: 'dir-1',
  dni: '12345678',
  nombres: 'Carlos',
  apellidos: 'Mamani',
  correo: 'carlos@ie.edu.pe',
  celular: '999888777',
  cargo: 'Director',
  condicion: 'Designado',
  nivelEducativo: 'Secundaria',
  institucionId: 'ie-1',
  activo: true,
  cargosList: [{ id: 'cargo-1', nombre: 'Director', fechaFin: null }],
} as unknown as Docente;

const montar = (directores = [directorActivo]) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <DirectoresTableWidget
          directores={directores}
          setDirectores={vi.fn()}
          instituciones={[{ id: 'ie-1', nombre: 'I.E. Los Andes' }]}
          onView={vi.fn()}
          onEdit={vi.fn()}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('DirectoresTableWidget - Restablecer Contraseña', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPermissions.length = 0;
    mockUser = { id: 'u-jefe', docenteId: 'otro-docente' };
  });

  it('muestra el botón de restablecer contraseña cuando el usuario tiene la capacidad', () => {
    mockPermissions.push('personal:restablecer_contrasena');
    montar();

    expect(screen.getByTitle('Restablecer contraseña')).toBeInTheDocument();
  });

  it('no muestra el botón cuando no tiene la capacidad', () => {
    montar();

    expect(screen.queryByTitle('Restablecer contraseña')).not.toBeInTheDocument();
  });

  it('no muestra el botón si el director es el propio usuario autenticado', () => {
    mockPermissions.push('personal:restablecer_contrasena');
    mockUser = { id: 'u-1', docenteId: 'dir-1' };
    montar();

    expect(screen.queryByTitle('Restablecer contraseña')).not.toBeInTheDocument();
  });

  it('muestra el botón deshabilitado cuando el director ya tiene la contraseña inicial', async () => {
    mockPermissions.push('personal:restablecer_contrasena');
    montar([{ ...directorActivo, contrasenaInicial: true }]);

    const botonDeshabilitado = screen.getByTitle('La contraseña ya se encuentra en su valor inicial (DNI)');
    expect(botonDeshabilitado).toBeInTheDocument();

    await userEvent.click(botonDeshabilitado);
    expect(screen.queryByTestId('modal-restablecer')).not.toBeInTheDocument();
  });

  it('al hacer clic en el botón abre el modal de restablecer contraseña', async () => {
    mockPermissions.push('personal:restablecer_contrasena');
    montar();

    await userEvent.click(screen.getByTitle('Restablecer contraseña'));

    expect(screen.getByTestId('modal-restablecer')).toBeInTheDocument();
    expect(screen.getByText('Modal para Carlos')).toBeInTheDocument();
  });
});
