import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SubdirectoresPage } from './SubdirectoresPage';

vi.mock('@entities/model-user', () => ({
  useUser: () => ({
    user: {
      role: 'director_institucion',
      institucion: 'ie-123',
      institucionNombre: 'I.E. Juan Bustamante',
      institucionNivel: 'Secundaria',
      nombres: 'Director',
      apellidos: 'Prueba',
    },
  }),
}));

vi.mock('@features/docentes/docente-service', () => ({
  fetchDocentes: vi.fn().mockResolvedValue([
    {
      id: 'doc-sub-1',
      nombres: 'MARCIA',
      apellidos: 'ZAPANA YERBA',
      dni: '29533362',
      cargo: 'Subdirector',
      institucionId: 'ie-123',
      nivelEducativo: 'Secundaria',
      condicion: 'Encargado',
      activo: true,
      cargosList: [{ id: 'c-1', nombre: 'Subdirector', fechaFin: null, esPrincipal: true }],
    },
  ]),
}));

vi.mock('@features/institutions/institution-service', () => ({
  fetchInstituciones: vi.fn().mockResolvedValue([
    { id: 'ie-123', nombre: 'I.E. Juan Bustamante' },
  ]),
}));

vi.mock('@shared/hooks/useCan', () => ({
  useCan: () => ({ can: () => true }),
}));

describe('SubdirectoresPage', () => {
  it('renderiza el título y las acciones de asignar y registrar subdirector', async () => {
    render(
      <MemoryRouter>
        <SubdirectoresPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Gestión de Subdirectores')).toBeInTheDocument();
    expect(screen.getByText('Asignar Subdirector')).toBeInTheDocument();
    expect(screen.getByText('Registrar nuevo')).toBeInTheDocument();
    expect(await screen.findByText('I.E. Juan Bustamante')).toBeInTheDocument();
    expect(screen.getByText('Subdirector de Secundaria')).toBeInTheDocument();
  });
});
