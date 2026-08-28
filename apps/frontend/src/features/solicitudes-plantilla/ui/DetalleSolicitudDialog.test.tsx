import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  CargoBeneficiario,
  type ISolicitudPlantilla,
} from '@sistema-monitoreo/shared-contracts';
import { DetalleSolicitudDialog } from './DetalleSolicitudDialog';
import { solicitudesPlantillaApi } from '@shared/api/solicitudes-plantilla.api';

/**
 * Detalle y trazabilidad de un pedido de plantillas.
 *
 * Lo que se fija acá es lo que la pantalla promete y el backend hace cumplir:
 * que el rechazo no salga sin motivo, que sólo la Jefatura vea la decisión, y
 * que un pedido ya resuelto no vuelva a ofrecerse para resolver.
 *
 * Y que la línea de tiempo diga QUIÉN resolvió y CON QUÉ motivo: sin eso, un
 * rechazo es un estado sin explicación y el director no sabe qué corregir.
 */

vi.mock('@shared/api/solicitudes-plantilla.api', () => ({
  solicitudesPlantillaApi: {
    aprobar: vi.fn(),
    rechazar: vi.fn(),
    justificacion: vi.fn(),
  },
}));

const solicitud = (over: Partial<ISolicitudPlantilla> = {}): ISolicitudPlantilla => ({
  id: '11111111-1111-4111-8111-111111111111',
  institucionId: 'ie-1',
  institucionNombre: 'I.E. 70001 José Carlos Mariátegui',
  solicitante: 'Luis Quispe',
  anioEscolar: 2026,
  justificacionUrl: '/uploads/solicitud-plantilla-abc.pdf',
  estado: 'PENDIENTE',
  comentario: null,
  resueltaPor: null,
  resueltaAt: null,
  createdAt: '2026-08-25T10:00:00.000Z',
  items: [
    {
      id: 'item-1',
      instrumento: 'DOCENTE_EIB',
      cargoBeneficiario: CargoBeneficiario.JEFE_DE_TALLER,
      beneficiarioId: 'u-taller',
      beneficiarioNombre: 'Marta Ccama',
      descripcion: 'criterios de carpintería',
      plantillaId: null,
    },
  ],
  ...over,
});

const montar = (props: Partial<Parameters<typeof DetalleSolicitudDialog>[0]> = {}) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DetalleSolicitudDialog
        solicitud={solicitud()}
        puedeDecidir
        onClose={vi.fn()}
        {...props}
      />
    </QueryClientProvider>,
  );
};

const boton = (nombre: RegExp) => screen.getByRole('button', { name: nombre });

beforeEach(() => vi.clearAllMocks());

describe('DetalleSolicitudDialog', () => {
  it('no se monta sin solicitud, en vez de dibujar un modal vacío', () => {
    const { container } = montar({ solicitud: null });
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra de qué institución es el pedido y qué se pide', () => {
    montar();

    // Aparece en el banner de trazabilidad y en la columna de resumen.
    expect(screen.getAllByText(/I\.E\. 70001/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Ficha Docente EIB/)).toBeInTheDocument();
    expect(screen.getByText(/criterios de carpintería/)).toBeInTheDocument();
  });

  describe('decisión de la Jefatura', () => {
    it('no ofrece decidir a quien no puede', () => {
      // El director ve la misma trazabilidad, sin los botones. El backend lo
      // exige igual: ocultarlos no es el control.
      montar({ puedeDecidir: false });

      expect(screen.queryByRole('button', { name: /Aprobar/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Rechazar/i })).toBeNull();
    });

    it('no ofrece decidir sobre un pedido ya resuelto', () => {
      montar({ solicitud: solicitud({ estado: 'APROBADA', resueltaPor: 'Ana Torres' }) });

      expect(screen.queryByRole('button', { name: /^Aprobar$/i })).toBeNull();
    });

    it('no deja confirmar un rechazo sin motivo', async () => {
      // Un rechazo sin explicación obliga al director a adivinar qué corregir.
      montar();
      await userEvent.click(boton(/^Rechazar$/i));

      expect(boton(/Confirmar rechazo/i)).toBeDisabled();
    });

    it('habilita el rechazo al escribir el motivo y lo envía', async () => {
      vi.mocked(solicitudesPlantillaApi.rechazar).mockResolvedValue(solicitud());
      montar();

      await userEvent.click(boton(/^Rechazar$/i));
      await userEvent.type(
        screen.getByLabelText(/Motivo del rechazo/i),
        'La ficha oficial ya lo cubre.',
      );
      await userEvent.click(boton(/Confirmar rechazo/i));

      expect(solicitudesPlantillaApi.rechazar).toHaveBeenCalledWith(solicitud().id, {
        comentario: 'La ficha oficial ya lo cubre.',
      });
    });
  });

  describe('línea de tiempo', () => {
    it('un pedido pendiente muestra sólo el registro inicial', () => {
      montar();

      expect(screen.getByText(/Solicitud Presentada/i)).toBeInTheDocument();
      expect(screen.queryByText(/REVISIÓN JEFATURA/i)).toBeNull();
    });

    it('un rechazo dice quién lo resolvió y por qué', () => {
      montar({
        solicitud: solicitud({
          estado: 'RECHAZADA',
          resueltaPor: 'Ana Torres',
          resueltaAt: '2026-08-26T10:00:00.000Z',
          comentario: 'La ficha oficial ya lo cubre.',
        }),
      });

      expect(screen.getByText(/PEDIDO DENEGADO/i)).toBeInTheDocument();
      expect(screen.getByText(/Ana Torres/)).toBeInTheDocument();
      expect(screen.getByText(/La ficha oficial ya lo cubre/)).toBeInTheDocument();
    });

    it('dice que no hubo comentario en vez de imprimir comillas vacías', () => {
      montar({
        solicitud: solicitud({ estado: 'APROBADA', resueltaPor: 'Ana Torres', comentario: null }),
      });

      expect(screen.getByText(/no dejó comentario/i)).toBeInTheDocument();
    });
  });

  describe('cupos', () => {
    it('distingue un cupo libre de uno ya usado', () => {
      // Una aprobación con saldo y una agotada se leen igual sin esto, y
      // significan cosas distintas: sobre la primera todavía se puede crear.
      montar({ solicitud: solicitud({ estado: 'APROBADA', resueltaPor: 'Ana Torres' }) });
      expect(screen.getByText(/CUPO DISPONIBLE/i)).toBeInTheDocument();

      montar({
        solicitud: solicitud({
          estado: 'APROBADA',
          resueltaPor: 'Ana Torres',
          items: [{ ...solicitud().items[0], plantillaId: 'plantilla-1' }],
        }),
      });
      expect(screen.getAllByText(/CUPO USADO/i).length).toBeGreaterThan(0);
    });

    it('no muestra insignia de cupo mientras el pedido sigue pendiente', () => {
      // Se busca la INSIGNIA, no la palabra: el panel de la Jefatura menciona
      // los cupos al explicar qué implica aprobar, y eso es correcto.
      montar();
      expect(screen.queryByText(/CUPO (DISPONIBLE|USADO)/)).toBeNull();
    });
  });
});
