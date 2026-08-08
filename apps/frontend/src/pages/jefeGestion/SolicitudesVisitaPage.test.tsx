import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoleCode, type ISolicitudVisita } from '@sistema-monitoreo/shared-contracts';

/**
 * Pruebas de la bandeja de solicitudes de visita.
 *
 * Es la cola de trabajo del Jefe de Gestión: lo que aparece acá es lo que se
 * atiende. Por eso lo que se fija es qué se ve cuando la consulta falla, y qué
 * recibe el solicitante cuando su pedido se rechaza.
 *
 * El diálogo de trazabilidad se sustituye: consulta su propio detalle al
 * backend y es otro asunto con sus propias pruebas.
 */

const { estadoUsuario, consultaGestor, consultaMias, rechazo, navegar } = vi.hoisted(() => ({
  // `vi.hoisted` corre antes de los imports: el rol se asigna en `beforeEach`.
  estadoUsuario: { user: null as { role: string } | null },
  consultaGestor: {
    data: undefined as { items: ISolicitudVisita[]; pendientes: number } | undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
  consultaMias: {
    data: undefined as { items: ISolicitudVisita[]; pendientes: number } | undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
  rechazo: { mutate: vi.fn(), isPending: false },
  navegar: vi.fn(),
}));

vi.mock('@entities/model-user', () => ({ useUser: () => estadoUsuario }));

vi.mock('@features/visit-requests', () => ({
  useSolicitudesVisita: () => consultaGestor,
  useMisSolicitudesVisita: () => consultaMias,
  useRechazarSolicitud: () => rechazo,
  TrazabilidadSolicitudDialog: () => null,
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => navegar }));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const { SolicitudesVisitaPage } = await import('./SolicitudesVisitaPage');

const solicitud = (over: Partial<ISolicitudVisita> = {}): ISolicitudVisita => ({
  id: 's-1',
  institucionId: 'ie-1',
  institucionNombre: 'IE 70001 SAN MARTIN',
  distrito: 'Lampa',
  docenteId: 'doc-1',
  docenteNombre: 'Rosa Mamani Quispe',
  motivo: 'Reiteradas quejas de los padres de familia.',
  prioridad: 'ALTA',
  estado: 'PENDIENTE',
  solicitanteNombre: 'Luis Quispe',
  createdAt: '2026-08-20T12:00:00.000Z',
  resueltaAt: null,
  ...over,
});

const montar = (items: ISolicitudVisita[] = [solicitud()]) => {
  consultaGestor.data = { items, pendientes: items.length };
  render(<SolicitudesVisitaPage />);
};

beforeEach(() => {
  vi.clearAllMocks();
  estadoUsuario.user = { role: RoleCode.JEFE_GESTION };
  Object.assign(consultaGestor, { data: undefined, isLoading: false, isError: false });
  Object.assign(consultaMias, { data: undefined, isLoading: false, isError: false });
  rechazo.isPending = false;
});

describe('SolicitudesVisitaPage — la consulta que falla', () => {
  /**
   * Sin estado de error, `data` es `undefined`, la lista queda vacía y la
   * pantalla anunciaba «No hay solicitudes pendientes»: un fallo de red se veía
   * igual que una bandeja al día. Para el Jefe de Gestión eso significa dar por
   * atendido lo que nunca se llegó a pedir.
   */
  it('no anuncia una bandeja vacía cuando la consulta falló', () => {
    consultaGestor.isError = true;
    render(<SolicitudesVisitaPage />);

    expect(screen.queryByText(/No hay solicitudes/i)).not.toBeInTheDocument();
  });

  it('dice que no se pudieron cargar', () => {
    consultaGestor.isError = true;
    render(<SolicitudesVisitaPage />);

    expect(screen.getByRole('alert')).toHaveTextContent(/no se pudieron cargar/i);
  });

  it('ofrece reintentar', async () => {
    consultaGestor.isError = true;
    render(<SolicitudesVisitaPage />);

    await userEvent.click(screen.getByRole('button', { name: /Reintentar/i }));
    expect(consultaGestor.refetch).toHaveBeenCalled();
  });

  it('sin fallo y sin solicitudes sí dice que no hay', () => {
    montar([]);

    expect(screen.getByText(/No hay solicitudes/i)).toBeInTheDocument();
  });
});

describe('SolicitudesVisitaPage — rechazar exige motivo', () => {
  /**
   * El rechazo cierra la solicitud y lo único que llega al solicitante es la
   * notificación con ese texto: sin él recibe «Tu solicitud fue rechazada» y
   * nada más. Antes el campo decía «(opcional)».
   */
  const abrirRechazo = async () => {
    montar();
    await userEvent.click(screen.getByRole('button', { name: /Rechazar/i }));
  };

  const confirmar = () =>
    userEvent.click(screen.getByRole('button', { name: /Rechazar solicitud/i }));

  it('sin motivo no rechaza, y dice por qué hace falta', async () => {
    await abrirRechazo();
    await confirmar();

    expect(rechazo.mutate).not.toHaveBeenCalled();
    expect(screen.getByText(/es lo único que el solicitante va a recibir/i)).toBeInTheDocument();
  });

  it('un motivo de sólo espacios tampoco alcanza', async () => {
    await abrirRechazo();
    await userEvent.type(screen.getByLabelText(/Motivo del rechazo/i), '   ');
    await confirmar();

    expect(rechazo.mutate).not.toHaveBeenCalled();
  });

  it('con motivo rechaza y lo lleva', async () => {
    await abrirRechazo();
    await userEvent.type(
      screen.getByLabelText(/Motivo del rechazo/i),
      'La visita ya está en el cronograma vigente.',
    );
    await confirmar();

    expect(rechazo.mutate).toHaveBeenCalledWith(
      { id: 's-1', body: { comentario: 'La visita ya está en el cronograma vigente.' } },
      expect.anything(),
    );
  });

  it('al empezar a escribir el reclamo desaparece', async () => {
    await abrirRechazo();
    await confirmar();
    await userEvent.type(screen.getByLabelText(/Motivo del rechazo/i), 'X');

    expect(screen.queryByText(/es lo único que el solicitante/i)).not.toBeInTheDocument();
  });

  it('nombra a quién se le rechaza', async () => {
    await abrirRechazo();

    expect(screen.getByRole('alertdialog')).toHaveTextContent(/Rosa Mamani Quispe/);
  });

  /** Sin docente puntual, la solicitud es de la institución. */
  it('sin docente nombra la institución', async () => {
    montar([solicitud({ docenteNombre: null })]);
    await userEvent.click(screen.getByRole('button', { name: /Rechazar/i }));

    expect(screen.getByRole('alertdialog')).toHaveTextContent(/IE 70001 SAN MARTIN/);
  });
});

describe('SolicitudesVisitaPage — estado de la solicitud', () => {
  /**
   * El mapa de estilos caía en PENDIENTE ante cualquier estado desconocido: una
   * solicitud rechazada por un estado que el frontend no conoce se rotulaba
   * «Pendiente» y volvía a la cola.
   */
  it('un estado desconocido no se rotula «Pendiente»', () => {
    montar([solicitud({ estado: 'ANULADA' })]);

    expect(screen.queryByText('Pendiente')).not.toBeInTheDocument();
    expect(screen.getByText('ANULADA')).toBeInTheDocument();
  });

  it('un estado desconocido no ofrece atender ni rechazar', () => {
    montar([solicitud({ estado: 'ANULADA' })]);

    expect(screen.queryByRole('button', { name: /Atender/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Rechazar/i })).not.toBeInTheDocument();
  });

  it('una solicitud atendida se rotula como tal', () => {
    montar([solicitud({ estado: 'ATENDIDA' })]);

    expect(screen.getByText('Atendida')).toBeInTheDocument();
  });
});

describe('SolicitudesVisitaPage — quién gestiona y quién sólo mira', () => {
  it('el Jefe de Gestión puede atender', () => {
    montar();

    expect(screen.getByRole('button', { name: /Atender/i })).toBeInTheDocument();
  });

  it('atender abre el cronograma con la solicitud precargada', async () => {
    montar();

    await userEvent.click(screen.getByRole('button', { name: /Atender/i }));

    expect(navegar).toHaveBeenCalledWith('/monitoreo/cronograma', {
      state: { prefillSolicitud: { solicitudId: 's-1', institucionId: 'ie-1', docenteId: 'doc-1' } },
    });
  });

  it('quien sólo hace seguimiento no ve las acciones de gestión', () => {
    estadoUsuario.user = { role: RoleCode.ESPECIALISTA };
    consultaMias.data = { items: [solicitud()], pendientes: 1 };
    render(<SolicitudesVisitaPage />);

    expect(screen.queryByRole('button', { name: /Atender/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Rechazar$/i })).not.toBeInTheDocument();
  });

  /** Quien sólo hace seguimiento lee su propia bandeja, no la de todos. */
  it('quien sólo hace seguimiento ve las suyas', () => {
    estadoUsuario.user = { role: RoleCode.ESPECIALISTA };
    consultaGestor.data = { items: [solicitud({ institucionNombre: 'AJENA' })], pendientes: 1 };
    consultaMias.data = { items: [solicitud({ institucionNombre: 'PROPIA' })], pendientes: 1 };
    render(<SolicitudesVisitaPage />);

    expect(screen.getByText('PROPIA')).toBeInTheDocument();
    expect(screen.queryByText('AJENA')).not.toBeInTheDocument();
  });

  it('sin usuario no se asume gestión', () => {
    estadoUsuario.user = null;
    consultaMias.data = { items: [solicitud()], pendientes: 1 };
    render(<SolicitudesVisitaPage />);

    expect(screen.queryByRole('button', { name: /Atender/i })).not.toBeInTheDocument();
  });
});

describe('SolicitudesVisitaPage — lo que muestra cada solicitud', () => {
  it('la fecha se muestra formateada, no cruda', () => {
    montar();

    expect(screen.queryByText(/2026-08-20T12:00/)).not.toBeInTheDocument();
    expect(screen.getByText(/20\/08\/2026/)).toBeInTheDocument();
  });

  it('muestra el motivo de quien la pidió', () => {
    montar();

    expect(screen.getByText(/quejas de los padres/i)).toBeInTheDocument();
  });

  it('sin motivo no imprime comillas vacías', () => {
    montar([solicitud({ motivo: null })]);

    expect(screen.queryByText('““”')).not.toBeInTheDocument();
    expect(screen.queryByText(/^“”$/)).not.toBeInTheDocument();
  });

  it('muestra el distrito y quién la pidió', () => {
    montar();

    expect(screen.getByText(/Lampa/)).toBeInTheDocument();
    expect(screen.getByText(/Luis Quispe/)).toBeInTheDocument();
  });
});
