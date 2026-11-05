import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ModalDetalleCronograma } from './ModalDetalleCronograma';
import type { Cronograma } from '@entities/model-cronogramas';
import { cronogramasApi } from '@features/cronogramas/api/cronogramas.api';

vi.mock('@features/cronogramas/api/cronogramas.api', () => ({
  cronogramasApi: {
    findOperacionExcepcional: vi.fn(),
  },
}));

describe('ModalDetalleCronograma', () => {
  let queryClient: QueryClient;

  const mockCronograma: Cronograma = {
    id: 'cron-999',
    fechaHora: '2026-05-15T09:30:00.000Z',
    especialista: 'María Especialista',
    especialistaInitials: 'ME',
    institucion: 'I.E. 002 Bolognesi',
    institucionId: 'ie-2',
    docenteDirectivo: 'Prof. Carlos Ramírez',
    tipo: 'DOCENTE',
    nroVisita: '2',
    estado: 'COMPLETADO',
    modalidad: 'EBR',
    nivel: 'Primaria',
    monitorId: 'user-esp-2',
    observaciones: 'Monitoreo de práctica pedagógica',
  };

  const renderConQueryClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const formatearFechaHoraMock = vi.fn().mockReturnValue({
    datePart: '15/05/2026',
    timePart: '09:30 AM',
  });
  const colorDeInicialesMock = vi.fn().mockReturnValue('bg-blue-500 text-white');
  const estiloTipoMock = vi.fn().mockReturnValue('bg-blue-100 text-blue-800');
  const estiloEstadoMock = vi.fn().mockReturnValue('bg-green-100 text-green-800');
  const onCerrarMock = vi.fn();
  const onAbrirAccionExcepcionalMock = vi.fn();

  it('renderiza la información detallada de la visita', () => {
    renderConQueryClient(
      <ModalDetalleCronograma
        cronograma={mockCronograma}
        esDirector={false}
        onCerrar={onCerrarMock}
        formatearFechaHora={formatearFechaHoraMock}
        colorDeIniciales={colorDeInicialesMock}
        estiloTipo={estiloTipoMock}
        estiloEstado={estiloEstadoMock}
      />,
    );

    expect(screen.getByText('Detalle del Cronograma')).toBeInTheDocument();
    expect(screen.getByText('María Especialista')).toBeInTheDocument();
    expect(screen.getByText('I.E. 002 Bolognesi')).toBeInTheDocument();
    expect(screen.getByText('Prof. Carlos Ramírez')).toBeInTheDocument();
    expect(screen.getByText('15/05/2026')).toBeInTheDocument();
    expect(screen.getByText('09:30 AM')).toBeInTheDocument();
    expect(screen.getByText('Monitoreo de práctica pedagógica')).toBeInTheDocument();
  });

  it('no muestra el botón de Trámite Excepcional si puedeAccionExcepcional es false', () => {
    renderConQueryClient(
      <ModalDetalleCronograma
        cronograma={mockCronograma}
        esDirector={false}
        onCerrar={onCerrarMock}
        formatearFechaHora={formatearFechaHoraMock}
        colorDeIniciales={colorDeInicialesMock}
        estiloTipo={estiloTipoMock}
        estiloEstado={estiloEstadoMock}
        puedeAccionExcepcional={false}
        onAbrirAccionExcepcional={onAbrirAccionExcepcionalMock}
      />,
    );

    expect(screen.queryByRole('button', { name: /Trámite Excepcional/i })).not.toBeInTheDocument();
  });

  it('muestra el botón de Trámite Excepcional si puedeAccionExcepcional es true y el cronograma no está ANULADO', async () => {
    const user = userEvent.setup();
    renderConQueryClient(
      <ModalDetalleCronograma
        cronograma={mockCronograma}
        esDirector={false}
        onCerrar={onCerrarMock}
        formatearFechaHora={formatearFechaHoraMock}
        colorDeIniciales={colorDeInicialesMock}
        estiloTipo={estiloTipoMock}
        estiloEstado={estiloEstadoMock}
        puedeAccionExcepcional={true}
        onAbrirAccionExcepcional={onAbrirAccionExcepcionalMock}
      />,
    );

    const botonExcepcional = screen.getByRole('button', { name: /Trámite Excepcional/i });
    expect(botonExcepcional).toBeInTheDocument();

    await user.click(botonExcepcional);
    expect(onAbrirAccionExcepcionalMock).toHaveBeenCalledWith(mockCronograma);
  });

  it('no muestra el botón de Trámite Excepcional si el cronograma ya está ANULADO', () => {
    renderConQueryClient(
      <ModalDetalleCronograma
        cronograma={{ ...mockCronograma, estado: 'ANULADO' }}
        esDirector={false}
        onCerrar={onCerrarMock}
        formatearFechaHora={formatearFechaHoraMock}
        colorDeIniciales={colorDeInicialesMock}
        estiloTipo={estiloTipoMock}
        estiloEstado={estiloEstadoMock}
        puedeAccionExcepcional={true}
        onAbrirAccionExcepcional={onAbrirAccionExcepcionalMock}
      />,
    );

    expect(screen.queryByRole('button', { name: /Trámite Excepcional/i })).not.toBeInTheDocument();
  });

  it('muestra los datos del trámite excepcional cuando el cronograma está ANULADO', async () => {
    vi.mocked(cronogramasApi.findOperacionExcepcional).mockResolvedValueOnce({
      id: 'op-001',
      cronogramaId: 'cron-999',
      tipoAccion: 'ANULACION_TOTAL',
      numeroExpediente: 'OFICIO-099-2026-UGEL',
      motivo: 'Docente con licencia médica en la fecha programada.',
      archivoSustentoUrl: '/uploads/sustento.pdf',
      ejecutadoPorId: 'user-jefe',
      createdAt: '2026-05-16T10:00:00.000Z',
    });

    renderConQueryClient(
      <ModalDetalleCronograma
        cronograma={{ ...mockCronograma, estado: 'ANULADO' }}
        esDirector={false}
        onCerrar={onCerrarMock}
        formatearFechaHora={formatearFechaHoraMock}
        colorDeIniciales={colorDeInicialesMock}
        estiloTipo={estiloTipoMock}
        estiloEstado={estiloEstadoMock}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Trámite Excepcional \(Mesa de Partes\)/i)).toBeInTheDocument();
      expect(screen.getByText('OFICIO-099-2026-UGEL')).toBeInTheDocument();
      expect(screen.getByText('Docente con licencia médica en la fecha programada.')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Ver Documento de Sustento/i })).toHaveAttribute(
        'href',
        '/uploads/sustento.pdf',
      );
    });
  });

  it('llama a onCerrar al hacer clic en el botón Cerrar', async () => {
    const user = userEvent.setup();
    renderConQueryClient(
      <ModalDetalleCronograma
        cronograma={mockCronograma}
        esDirector={false}
        onCerrar={onCerrarMock}
        formatearFechaHora={formatearFechaHoraMock}
        colorDeIniciales={colorDeInicialesMock}
        estiloTipo={estiloTipoMock}
        estiloEstado={estiloEstadoMock}
      />,
    );

    const botonCerrar = screen.getByRole('button', { name: /^Cerrar$/i });
    await user.click(botonCerrar);

    expect(onCerrarMock).toHaveBeenCalledTimes(1);
  });
});
