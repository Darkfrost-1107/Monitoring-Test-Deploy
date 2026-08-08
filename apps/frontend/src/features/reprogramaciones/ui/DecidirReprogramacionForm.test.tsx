import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';
import type { Cronograma } from '@entities/model-cronogramas';
import type { SolicitudReprogramacion } from '@entities/model-reprogramaciones';
import { DecidirReprogramacionForm } from './DecidirReprogramacionForm';

/**
 * Pruebas del detalle y la resolución de una solicitud de reprogramación.
 *
 * Es el panel de trazabilidad: lo que se consulta para saber qué se adjuntó y
 * quién decidió. Y es donde el PR #64 cambió el comportamiento —rechazar exige
 * motivo— sin dejar una prueba que lo fijara.
 */

const VISITA: Cronograma = {
  id: 'v-1',
  fechaHora: '2026-09-01T08:00:00.000Z',
  especialista: 'Ana Torres',
  especialistaInitials: 'AT',
  institucion: 'IE 70001',
  docenteDirectivo: 'Rosa Mamani',
  tipo: 'DOCENTE',
  nroVisita: '01',
  estado: 'PROGRAMADO',
  modalidad: 'EBR',
  nivel: 'Primaria',
  monitorId: 'esp-1',
  evaluadoId: 'doc-1',
  institucionId: 'ie-1',
};

const solicitud = (over: Partial<SolicitudReprogramacion> = {}): SolicitudReprogramacion => ({
  id: 's-1',
  fechaOriginal: '2026-09-01T08:00',
  fechaNueva: '2026-09-15T10:00',
  motivo: 'La institución tiene actividad cívica ese día.',
  adjunto: null,
  estado: 'PENDIENTE',
  fechaRegistro: '2026-08-20T12:00:00.000Z',
  solicitanteRolAlCrear: RoleCode.ESPECIALISTA,
  ...over,
});

const montar = (opciones: { request?: Partial<SolicitudReprogramacion>; canDecide?: boolean } = {}) => {
  const onApprove = vi.fn();
  const onReject = vi.fn();
  const onClose = vi.fn();

  render(
    <DecidirReprogramacionForm
      isOpen
      onClose={onClose}
      visit={VISITA}
      request={solicitud(opciones.request)}
      canDecide={opciones.canDecide ?? true}
      onApprove={onApprove}
      onReject={onReject}
    />,
  );

  return { onApprove, onReject, onClose };
};

const escribirSustento = (texto: string) =>
  userEvent.type(screen.getByLabelText(/Sustento de la Decisión/i), texto);

const rechazar = () => userEvent.click(screen.getByRole('button', { name: /Rechazar Solicitud/i }));
const aprobar = () => userEvent.click(screen.getByRole('button', { name: /Aprobar Cambio/i }));

describe('DecidirReprogramacionForm — rechazar exige motivo', () => {
  /**
   * El rechazo deja el monitoreo en su fecha original, y ese texto es lo único
   * que el solicitante recibe: sin él no sabe qué corregir para volver a
   * pedirlo. Cambio de comportamiento introducido en el PR #64.
   */
  it('sin motivo no rechaza, y dice por qué hace falta', async () => {
    const { onReject } = montar();

    await rechazar();

    expect(onReject).not.toHaveBeenCalled();
    expect(screen.getByText(/es lo único que el solicitante va a recibir/i)).toBeInTheDocument();
  });

  it('un motivo de sólo espacios tampoco alcanza', async () => {
    const { onReject } = montar();

    await escribirSustento('   ');
    await rechazar();

    expect(onReject).not.toHaveBeenCalled();
  });

  it('con motivo rechaza y lo lleva', async () => {
    const { onReject } = montar();

    await escribirSustento('La fecha propuesta cae en periodo de exámenes.');
    await rechazar();

    expect(onReject).toHaveBeenCalledWith('v-1', 'La fecha propuesta cae en periodo de exámenes.');
  });

  it('al empezar a escribir el reclamo desaparece', async () => {
    montar();

    await rechazar();
    await escribirSustento('X');

    expect(screen.queryByText(/es lo único que el solicitante/i)).not.toBeInTheDocument();
  });
});

describe('DecidirReprogramacionForm — aprobar', () => {
  /** Aprobar no exige sustento: la decisión favorable no deja nada que corregir. */
  it('aprueba sin comentario', async () => {
    const { onApprove } = montar();

    await aprobar();

    expect(onApprove).toHaveBeenCalledWith('v-1', '');
  });

  it('si hay comentario, lo lleva sin espacios sobrantes', async () => {
    const { onApprove } = montar();

    await escribirSustento('  Se reprograma por actividad institucional.  ');
    await aprobar();

    expect(onApprove).toHaveBeenCalledWith('v-1', 'Se reprograma por actividad institucional.');
  });
});

describe('DecidirReprogramacionForm — quien no decide', () => {
  it('no ve los botones de decisión', () => {
    montar({ canDecide: false });

    expect(screen.queryByRole('button', { name: /Rechazar Solicitud/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aprobar Cambio/i })).not.toBeInTheDocument();
  });

  it('ve quién tiene que resolverla, según de dónde nació', () => {
    montar({ canDecide: false, request: { solicitanteRolAlCrear: RoleCode.COORDINADOR_PEDAGOGICO } });

    expect(screen.getByText(/Director de la Institución Educativa/i)).toBeInTheDocument();
  });

  it('una solicitud de UGEL la resuelve la jefatura', () => {
    montar({ canDecide: false, request: { solicitanteRolAlCrear: RoleCode.ESPECIALISTA } });

    expect(screen.getByText(/Jefatura de Gestión Pedagógica/i)).toBeInTheDocument();
  });

  /** Una solicitud ya resuelta no vuelve a decidirse. */
  it('una solicitud aprobada no ofrece decidir', () => {
    montar({ request: { estado: 'APROBADO', aprobador: 'Jefe de Gestión Luis Quispe' } });

    expect(screen.queryByRole('button', { name: /Aprobar Cambio/i })).not.toBeInTheDocument();
  });
});

describe('DecidirReprogramacionForm — trazabilidad', () => {
  it('muestra el motivo de quien la pidió', () => {
    montar();

    expect(screen.getByText(/actividad cívica ese día/i)).toBeInTheDocument();
  });

  it('nombra a quien resolvió', () => {
    montar({ request: { estado: 'APROBADO', aprobador: 'Jefe de Gestión Luis Quispe' } });

    expect(screen.getByText('Jefe de Gestión Luis Quispe')).toBeInTheDocument();
  });

  /**
   * El respaldo era `resueltoPorId`: el panel mostraba un UUID donde va un
   * nombre. Sin nombre se dice que no está registrado.
   */
  it('sin nombre de quien resolvió lo declara no registrado', () => {
    montar({ request: { estado: 'APROBADO', aprobador: undefined } });

    expect(screen.getByText('No registrado')).toBeInTheDocument();
  });

  /** Antes se imprimían las comillas solas: «Comentario: ""». */
  it('sin comentario de jefatura lo dice, en vez de comillas vacías', () => {
    montar({ request: { estado: 'RECHAZADO', aprobadorComentario: undefined } });

    expect(screen.getByText(/no dejó comentario/i)).toBeInTheDocument();
  });

  it('las fechas se muestran formateadas, no crudas', () => {
    montar();

    expect(screen.queryByText(/2026-08-20T12:00/)).not.toBeInTheDocument();
    expect(screen.getByText('20/08/2026')).toBeInTheDocument();
  });
});

describe('DecidirReprogramacionForm — sustento adjunto', () => {
  /**
   * Era un `div` con `cursor-pointer` y un ícono de descarga, sin manejador: se
   * veía descargable y al pulsarlo no pasaba nada. La URL existía y el mapeo la
   * descartaba.
   */
  it('el adjunto es un enlace que abre el documento', () => {
    montar({
      request: {
        adjunto: { nombre: 'oficio-123.pdf', url: 'https://archivos.ugel.pe/oficio-123.pdf' },
      },
    });

    const enlace = screen.getByRole('link', { name: /oficio-123\.pdf/i });
    expect(enlace).toHaveAttribute('href', 'https://archivos.ugel.pe/oficio-123.pdf');
  });

  it('se abre fuera sin dar acceso a la pestaña de origen', () => {
    montar({
      request: { adjunto: { nombre: 'oficio.pdf', url: 'https://archivos.ugel.pe/oficio.pdf' } },
    });

    const enlace = screen.getByRole('link', { name: /oficio\.pdf/i });
    expect(enlace).toHaveAttribute('target', '_blank');
    expect(enlace).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  /** «(1.2 MB)» estaba escrito a mano: el mismo tamaño para todos los archivos. */
  it('no anuncia un tamaño que no conoce', () => {
    montar({
      request: { adjunto: { nombre: 'oficio.pdf', url: 'https://archivos.ugel.pe/oficio.pdf' } },
    });

    expect(screen.queryByText(/MB\)/)).not.toBeInTheDocument();
  });

  it('sin adjunto no muestra nada', () => {
    montar({ request: { adjunto: null } });

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
