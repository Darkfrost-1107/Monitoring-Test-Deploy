import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { ModalAccionExcepcional } from './ModalAccionExcepcional';
import type { Cronograma } from '@entities/model-cronogramas';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('ModalAccionExcepcional', () => {
  const mockCronograma: Cronograma = {
    id: 'cron-123',
    fechaHora: '2026-04-10T08:00:00.000Z',
    especialista: 'Juan Especialista',
    especialistaInitials: 'JE',
    institucion: 'I.E. 001 San Martín',
    institucionId: 'ie-1',
    docenteDirectivo: 'Prof. Pedro Pérez',
    tipo: 'DOCENTE',
    nroVisita: '1',
    estado: 'COMPLETADO',
    modalidad: 'EBR',
    nivel: 'Secundaria',
    monitorId: 'user-esp-1',
  };

  const onCerrarMock = vi.fn();
  const onConfirmarMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no renderiza nada si abierto es false', () => {
    const { container } = render(
      <ModalAccionExcepcional
        cronograma={mockCronograma}
        abierto={false}
        onCerrar={onCerrarMock}
        onConfirmar={onConfirmarMock}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza el modal con la información del cronograma y opciones de acción', () => {
    render(
      <ModalAccionExcepcional
        cronograma={mockCronograma}
        abierto={true}
        onCerrar={onCerrarMock}
        onConfirmar={onConfirmarMock}
      />,
    );

    expect(screen.getByText(/Trámite Excepcional de Monitoreo/i)).toBeInTheDocument();
    expect(screen.getByText('I.E. 001 San Martín')).toBeInTheDocument();
    expect(screen.getByText('Prof. Pedro Pérez')).toBeInTheDocument();
    expect(screen.getByText(/Anulación Total del Monitoreo/i)).toBeInTheDocument();
    expect(screen.getByText(/Reapertura \/ Reinicio de Ficha/i)).toBeInTheDocument();
  });

  it('permite cambiar entre Anulación Total y Reapertura de Ficha', async () => {
    const user = userEvent.setup();
    render(
      <ModalAccionExcepcional
        cronograma={mockCronograma}
        abierto={true}
        onCerrar={onCerrarMock}
        onConfirmar={onConfirmarMock}
      />,
    );

    const radioReapertura = screen.getByRole('radio', { name: /Reapertura \/ Reinicio de Ficha/i });
    await user.click(radioReapertura);

    expect(radioReapertura).toBeChecked();
    expect(screen.getByText(/Elimina la ficha errónea y regresa la visita a PROGRAMADO/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirmar Reapertura de Ficha/i })).toBeInTheDocument();
  });

  it('muestra error si no se ingresa número de expediente', async () => {
    const user = userEvent.setup();
    render(
      <ModalAccionExcepcional
        cronograma={mockCronograma}
        abierto={true}
        onCerrar={onCerrarMock}
        onConfirmar={onConfirmarMock}
      />,
    );

    const botonConfirmar = screen.getByRole('button', { name: /Confirmar Anulación Total/i });
    await user.click(botonConfirmar);

    expect(screen.getByText(/Ingrese un número de expediente o trámite válido/i)).toBeInTheDocument();
    expect(onConfirmarMock).not.toHaveBeenCalled();
  });

  it('muestra error si el motivo tiene menos de 10 caracteres', async () => {
    const user = userEvent.setup();
    render(
      <ModalAccionExcepcional
        cronograma={mockCronograma}
        abierto={true}
        onCerrar={onCerrarMock}
        onConfirmar={onConfirmarMock}
      />,
    );

    const inputExpediente = screen.getByLabelText(/N.° de Expediente/i);
    await user.type(inputExpediente, 'EXP-001');

    const inputMotivo = screen.getByLabelText(/Motivo \/ Justificación detallada/i);
    await user.type(inputMotivo, 'Corto');

    const botonConfirmar = screen.getByRole('button', { name: /Confirmar Anulación Total/i });
    await user.click(botonConfirmar);

    expect(screen.getByText(/Ingrese una justificación detallada del motivo/i)).toBeInTheDocument();
    expect(onConfirmarMock).not.toHaveBeenCalled();
  });

  it('muestra error si no se adjunta archivo PDF', async () => {
    const user = userEvent.setup();
    render(
      <ModalAccionExcepcional
        cronograma={mockCronograma}
        abierto={true}
        onCerrar={onCerrarMock}
        onConfirmar={onConfirmarMock}
      />,
    );

    const inputExpediente = screen.getByLabelText(/N.° de Expediente/i);
    await user.type(inputExpediente, 'EXP-001');

    const inputMotivo = screen.getByLabelText(/Motivo \/ Justificación detallada/i);
    await user.type(inputMotivo, 'Justificación válida con más de diez caracteres');

    const botonConfirmar = screen.getByRole('button', { name: /Confirmar Anulación Total/i });
    await user.click(botonConfirmar);

    expect(screen.getByText(/Debe adjuntar el documento PDF que sustenta el trámite/i)).toBeInTheDocument();
    expect(onConfirmarMock).not.toHaveBeenCalled();
  });

  it('ejecuta onConfirmar cuando los datos y el archivo PDF son válidos', async () => {
    const user = userEvent.setup();
    onConfirmarMock.mockResolvedValueOnce(undefined);

    const dummyBase64 = 'JVBERi0xLjQKZHVtbXk=';
    class MockFileReader {
      result: string | null = null;
      onload: (() => void) | null = null;
      readAsDataURL() {
        this.result = `data:application/pdf;base64,${dummyBase64}`;
        this.onload?.();
      }
    }
    vi.stubGlobal('FileReader', MockFileReader);

    render(
      <ModalAccionExcepcional
        cronograma={mockCronograma}
        abierto={true}
        onCerrar={onCerrarMock}
        onConfirmar={onConfirmarMock}
      />,
    );

    const inputExpediente = screen.getByLabelText(/N.° de Expediente/i);
    await user.type(inputExpediente, 'OFICIO-045-2026');

    const inputMotivo = screen.getByLabelText(/Motivo \/ Justificación detallada/i);
    await user.type(inputMotivo, 'Evaluación aplicada con instrumento de nivel equivocado.');

    // Simular archivo PDF
    const file = new File(['%PDF-1.4 dummy content'], 'sustento.pdf', {
      type: 'application/pdf',
    });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('sustento.pdf')).toBeInTheDocument();
    });

    const botonConfirmar = screen.getByRole('button', { name: /Confirmar Anulación Total/i });
    await user.click(botonConfirmar);

    await waitFor(() => {
      expect(onConfirmarMock).toHaveBeenCalledWith({
        tipoAccion: 'ANULACION_TOTAL',
        numeroExpediente: 'OFICIO-045-2026',
        motivo: 'Evaluación aplicada con instrumento de nivel equivocado.',
        archivoSustentoBase64: dummyBase64,
        archivoSustentoNombre: 'sustento.pdf',
      });
    });

    expect(toast.success).toHaveBeenCalledWith('Visita y ficha anuladas excepcionalmente con éxito.');
  });

  it('llama a onCerrar al hacer clic en Cancelar', async () => {
    const user = userEvent.setup();
    render(
      <ModalAccionExcepcional
        cronograma={mockCronograma}
        abierto={true}
        onCerrar={onCerrarMock}
        onConfirmar={onConfirmarMock}
      />,
    );

    const botonCancelar = screen.getByRole('button', { name: /Cancelar/i });
    await user.click(botonCancelar);

    expect(onCerrarMock).toHaveBeenCalledTimes(1);
  });
});
