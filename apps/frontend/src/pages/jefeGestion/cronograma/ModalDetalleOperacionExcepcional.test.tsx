import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ModalDetalleOperacionExcepcional } from './ModalDetalleOperacionExcepcional';
import type { IOperacionExcepcionalDetalle } from '@sistema-monitoreo/shared-contracts';

describe('ModalDetalleOperacionExcepcional', () => {
  const mockOperacion: IOperacionExcepcionalDetalle = {
    id: 'op-1',
    cronogramaId: 'cron-1',
    tipoAccion: 'ANULACION_TOTAL',
    numeroExpediente: 'EXP-2026-00482',
    motivo: 'Evaluación anulada por error material en la asignación del docente titular.',
    archivoSustentoUrl: '/sustentos-excepcionales/oficio-001.pdf',
    ejecutadoPorId: 'user-jefe',
    createdAt: '2026-11-05T15:30:00.000Z',
    institucionNombre: 'I.E. 80001 San Jerónimo',
    institucionCodigoModular: '1234567',
    evaluadoNombre: 'Carlos Ruiz Mendoza',
    evaluadoNumeroDocumento: '44556677',
    monitorNombre: 'Ana Gómez Especialista',
    ejecutadoPorNombre: 'María Huamán JGP',
    fechaVisita: '2026-11-04',
    numeroVisita: 1,
  };

  it('muestra la información completa del trámite', () => {
    render(
      <ModalDetalleOperacionExcepcional
        operacion={mockOperacion}
        onCerrar={vi.fn()}
        onAbrirPdf={vi.fn()}
        descargando={false}
      />,
    );

    expect(screen.getByText('EXP-2026-00482')).toBeInTheDocument();
    expect(screen.getByText('ANULACIÓN TOTAL')).toBeInTheDocument();
    expect(screen.getByText('I.E. 80001 San Jerónimo')).toBeInTheDocument();
    expect(screen.getByText('Carlos Ruiz Mendoza')).toBeInTheDocument();
    expect(screen.getByText(/44556677/)).toBeInTheDocument();
    expect(screen.getByText('María Huamán JGP')).toBeInTheDocument();
    expect(screen.getByText(/Evaluación anulada por error material/)).toBeInTheDocument();
  });

  it('llama a onCerrar al hacer clic en el botón Cerrar', async () => {
    const user = userEvent.setup();
    const onCerrar = vi.fn();

    render(
      <ModalDetalleOperacionExcepcional
        operacion={mockOperacion}
        onCerrar={onCerrar}
        onAbrirPdf={vi.fn()}
        descargando={false}
      />,
    );

    const botonCerrar = screen.getByRole('button', { name: /^Cerrar$/i });
    await user.click(botonCerrar);

    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it('llama a onAbrirPdf al pulsar el botón Ver Sustento', async () => {
    const user = userEvent.setup();
    const onAbrirPdf = vi.fn();

    render(
      <ModalDetalleOperacionExcepcional
        operacion={mockOperacion}
        onCerrar={vi.fn()}
        onAbrirPdf={onAbrirPdf}
        descargando={false}
      />,
    );

    const botonPdf = screen.getByRole('button', { name: /Ver Sustento \(PDF\)/i });
    await user.click(botonPdf);

    expect(onAbrirPdf).toHaveBeenCalledWith(mockOperacion);
  });
});
