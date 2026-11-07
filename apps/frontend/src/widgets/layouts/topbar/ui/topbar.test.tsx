import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Topbar } from './topbar';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';

const mockUser: {
  id: string;
  role: RoleCode;
  nombres: string;
  apellidos: string;
} = {
  id: 'u-1',
  role: RoleCode.JEFE_GESTION,
  nombres: 'Edwin',
  apellidos: 'Figueroa',
};

vi.mock('@entities/model-user', () => ({
  useUser: () => ({
    user: mockUser,
    logout: vi.fn(),
  }),
}));

vi.mock('@features/notifications', () => ({
  NotificationsBell: () => <div data-testid="notifications-bell" />,
}));

vi.mock('@features/offline/BotonPrepararOffline', () => ({
  BotonPrepararOffline: () => <button data-testid="boton-preparar-offline">Preparar Offline</button>,
}));

vi.mock('@features/offline/EstadoOffline', () => ({
  EstadoOffline: () => <div data-testid="estado-offline" />,
}));

vi.mock('@shared/auth', () => ({
  useScope: () => ({
    isMonitorCampo: (
      [
        RoleCode.ESPECIALISTA,
        RoleCode.SUBDIRECTOR,
        RoleCode.COORDINADOR_PEDAGOGICO,
        RoleCode.JEFE_TALLER,
      ] as RoleCode[]
    ).includes(mockUser.role),
  }),
}));

describe('Topbar - Modo Offline por Rol', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra el botón de Preparar Offline para Jefe de Gestión', () => {
    mockUser.role = RoleCode.JEFE_GESTION;

    render(
      <MemoryRouter>
        <Topbar />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('boton-preparar-offline')).toBeInTheDocument();
  });

  it('muestra el botón de Preparar Offline para Director de I.E.', () => {
    mockUser.role = RoleCode.DIRECTOR_INSTITUCION;

    render(
      <MemoryRouter>
        <Topbar />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('boton-preparar-offline')).toBeInTheDocument();
  });

  it('muestra el botón de Preparar Offline para Especialista', () => {
    mockUser.role = RoleCode.ESPECIALISTA;

    render(
      <MemoryRouter>
        <Topbar />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('boton-preparar-offline')).toBeInTheDocument();
  });

  it('NO muestra el botón de Preparar Offline para Director UGEL', () => {
    mockUser.role = RoleCode.DIRECTOR_UGEL;

    render(
      <MemoryRouter>
        <Topbar />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('boton-preparar-offline')).not.toBeInTheDocument();
  });

  it('NO muestra el botón de Preparar Offline para Docente', () => {
    mockUser.role = RoleCode.DOCENTE;

    render(
      <MemoryRouter>
        <Topbar />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('boton-preparar-offline')).not.toBeInTheDocument();
  });
});
