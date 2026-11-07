import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';

const mockUser: {
  id: string;
  role: RoleCode;
  institucion: string;
  institucionNivel?: string;
} = {
  id: 'u-1',
  role: RoleCode.DIRECTOR_INSTITUCION,
  institucion: 'ie-1',
  institucionNivel: 'Secundaria',
};

vi.mock('@entities/model-user', () => ({
  useUser: () => ({
    user: mockUser,
    logout: vi.fn(),
  }),
}));

vi.mock('@features/visit-requests', () => ({
  useSolicitudesPendientesCount: () => ({ data: 0 }),
}));

vi.mock('@shared/auth', () => ({
  useCan: () => ({ can: () => false }),
  useScope: () => ({
    isUgel: mockUser.role === RoleCode.JEFE_GESTION || mockUser.role === RoleCode.DIRECTOR_UGEL,
    isInstitution: mockUser.role === RoleCode.DIRECTOR_INSTITUCION || mockUser.role === RoleCode.SUBDIRECTOR,
  }),
  Capability: { VISITAS_GESTIONAR: 'visitas:gestionar' },
}));

describe('Sidebar - Estructura de Navegación Mejorada', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra secciones ordenadas y sin duplicidad para Director de I.E.', () => {
    mockUser.role = RoleCode.DIRECTOR_INSTITUCION;
    mockUser.institucionNivel = 'Secundaria';

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );

    // Encabezados de sección visibles
    expect(screen.getByText('Principal')).toBeInTheDocument();
    expect(screen.getByText('Monitoreo', { selector: 'div' })).toBeInTheDocument();
    expect(screen.getByText('Equipo y Comunidad')).toBeInTheDocument();
    expect(screen.getByText('Evaluación y Reportes')).toBeInTheDocument();
    expect(screen.getByText('Mi Espacio')).toBeInTheDocument();

    // Ítems institucionales
    expect(screen.getByText('Docentes')).toBeInTheDocument();
    expect(screen.getByText('Subdirectores')).toBeInTheDocument();
    expect(screen.getByText('Coordinador Pedagógico')).toBeInTheDocument();
    expect(screen.getByText('Jefe de Taller')).toBeInTheDocument();
  });

  it('para Docente muestra únicamente su espacio personal y Mis Reportes', () => {
    mockUser.role = RoleCode.DOCENTE;
    mockUser.institucionNivel = 'Secundaria';

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );

    expect(screen.getByText('Mis Reportes')).toBeInTheDocument();
    expect(screen.getByText('Mi Carpeta Pedagógica')).toBeInTheDocument();
    expect(screen.getByText('Mi Firma Digital')).toBeInTheDocument();

    // No debe ver secciones ni ítems ajenos
    expect(screen.queryByText('Especialistas')).not.toBeInTheDocument();
    expect(screen.queryByText('Padrón de II. EE.')).not.toBeInTheDocument();
    expect(screen.queryByText('Principal')).not.toBeInTheDocument();
  });

  it('para Especialista auto-aplana Calendario directamente', () => {
    mockUser.role = RoleCode.ESPECIALISTA;
    mockUser.institucionNivel = undefined;

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );

    // Debe mostrar directamente "Calendario" sin necesidad de acordeón de monitoreo
    expect(screen.getByText('Calendario')).toBeInTheDocument();
    expect(screen.getByText('Focos de Atención')).toBeInTheDocument();
  });
});
