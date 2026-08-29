import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { INotificacionesResponse } from '@sistema-monitoreo/shared-contracts';

// Estado mutable compartido con las factories de vi.mock (hoisted).
const h = vi.hoisted(() => ({
  data: undefined as INotificacionesResponse | undefined,
  mutateLeida: vi.fn(),
  mutateTodas: vi.fn(),
  navigate: vi.fn(),
  // Rol del usuario en sesión; decide si las alertas enlazan a Focos o al panel.
  role: 'jefe_gestion' as string,
}));

vi.mock('react-router-dom', async (orig) => {
  const actual = await orig<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => h.navigate };
});

vi.mock('@entities/model-user', async (orig) => {
  const actual = await orig<typeof import('@entities/model-user')>();
  return { ...actual, useUser: () => ({ user: { role: h.role } }) };
});

vi.mock('../api/use-notifications-api', () => ({
  useNotificaciones: () => ({ data: h.data }),
  useMarcarLeida: () => ({ mutate: h.mutateLeida }),
  useMarcarTodasLeidas: () => ({ mutate: h.mutateTodas }),
}));

import { NotificationsBell } from './NotificationsBell';

const notif = (over: Partial<INotificacionesResponse['items'][number]> = {}) => ({
  id: 'n1',
  tipo: 'ALERTA_INSTITUCION',
  titulo: 'Título de prueba',
  mensaje: 'Mensaje de prueba',
  institucionId: null,
  leida: false,
  createdAt: new Date().toISOString(),
  emisorNombre: null,
  ...over,
});

const setData = (items: INotificacionesResponse['items']) => {
  h.data = { items, noLeidas: items.filter((n) => !n.leida).length };
};

/** Abre el panel de la campana. */
const abrirPanel = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Notificaciones' }));
};

beforeEach(() => {
  h.data = { items: [], noLeidas: 0 };
  h.mutateLeida.mockClear();
  h.mutateTodas.mockClear();
  h.navigate.mockClear();
  h.role = 'jefe_gestion';
});

describe('NotificationsBell', () => {
  describe('badge de no leídas', () => {
    it('no muestra badge cuando no hay pendientes', () => {
      setData([notif({ leida: true })]);
      render(<NotificationsBell />);
      expect(screen.queryByText('9+')).not.toBeInTheDocument();
    });

    it('muestra el número exacto de pendientes', () => {
      setData([notif({ id: 'a' }), notif({ id: 'b' }), notif({ id: 'c' })]);
      render(<NotificationsBell />);
      const trigger = screen.getByRole('button', { name: 'Notificaciones' });
      expect(within(trigger).getByText('3')).toBeInTheDocument();
    });

    it('tope el contador en 9+ cuando hay más de 9', () => {
      setData(Array.from({ length: 12 }, (_, i) => notif({ id: `n${i}` })));
      render(<NotificationsBell />);
      const trigger = screen.getByRole('button', { name: 'Notificaciones' });
      expect(within(trigger).getByText('9+')).toBeInTheDocument();
    });
  });

  describe('lista y filtros', () => {
    it('lista las notificaciones al abrir el panel', async () => {
      const user = userEvent.setup();
      setData([notif({ id: 'a', titulo: 'Alerta A' }), notif({ id: 'b', titulo: 'Alerta B' })]);
      render(<NotificationsBell />);
      await abrirPanel(user);
      expect(screen.getByText('Alerta A')).toBeInTheDocument();
      expect(screen.getByText('Alerta B')).toBeInTheDocument();
    });

    it('el filtro "Sin leer" oculta las notificaciones leídas', async () => {
      const user = userEvent.setup();
      setData([
        notif({ id: 'a', titulo: 'No leída', leida: false }),
        notif({ id: 'b', titulo: 'Ya leída', leida: true }),
      ]);
      render(<NotificationsBell />);
      await abrirPanel(user);
      expect(screen.getByText('Ya leída')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /Sin leer/ }));
      expect(screen.queryByText('Ya leída')).not.toBeInTheDocument();
      expect(screen.getByText('No leída')).toBeInTheDocument();
    });

    it('muestra el mensaje de vacío propio del filtro "Sin leer"', async () => {
      const user = userEvent.setup();
      setData([notif({ id: 'a', leida: true })]);
      render(<NotificationsBell />);
      await abrirPanel(user);
      await user.click(screen.getByRole('button', { name: /Sin leer/ }));
      expect(screen.getByText('No tienes notificaciones sin leer.')).toBeInTheDocument();
    });
  });

  describe('acciones', () => {
    it('"Marcar todas" dispara la mutación', async () => {
      const user = userEvent.setup();
      setData([notif({ id: 'a' })]);
      render(<NotificationsBell />);
      await abrirPanel(user);
      await user.click(screen.getByRole('button', { name: /Marcar todas/ }));
      expect(h.mutateTodas).toHaveBeenCalledTimes(1);
    });

    it('al abrir una notificación no leída la marca como leída', async () => {
      const user = userEvent.setup();
      setData([notif({ id: 'abc', titulo: 'Pendiente', leida: false })]);
      render(<NotificationsBell />);
      await abrirPanel(user);
      await user.click(screen.getByText('Pendiente'));
      expect(h.mutateLeida).toHaveBeenCalledWith('abc');
    });

    it('muestra el botón de acción rápida y navega a la ruta de acción según su tipo', async () => {
      const user = userEvent.setup();
      setData([
        notif({
          id: 'r1',
          tipo: 'SOLICITUD_REPROGRAMACION_CREADA',
          titulo: 'Reprogramación solicitada',
        }),
      ]);
      render(<NotificationsBell />);
      await abrirPanel(user);

      const accion = await screen.findByRole('button', { name: /Ver Reprogramaciones/ });
      await user.click(accion);
      expect(h.navigate).toHaveBeenCalledWith('/monitoreo/calendario?tab=solicitudes');
    });

    /**
     * El trámite de plantillas propias tiene dos destinos porque tiene dos
     * audiencias con tareas distintas: la Jefatura decide en su bandeja, el
     * director sigue el estado en «Mis Solicitudes» y el beneficiario del cupo
     * va al catálogo, que es donde crea su ficha.
     */
    it('lleva a la bandeja de la Jefatura cuando llega una solicitud de plantilla', async () => {
      const user = userEvent.setup();
      setData([
        notif({ id: 'sp1', tipo: 'SOLICITUD_PLANTILLA_CREADA', titulo: 'Solicitud de plantilla' }),
      ]);
      render(<NotificationsBell />);
      await abrirPanel(user);

      await user.click(await screen.findByRole('button', { name: /Ver solicitudes de plantilla/ }));
      expect(h.navigate).toHaveBeenCalledWith('/plantillas/solicitudes');
    });

    it('lleva al director al seguimiento de su trámite cuando se resuelve', async () => {
      const user = userEvent.setup();
      setData([
        notif({
          id: 'sp2',
          tipo: 'SOLICITUD_PLANTILLA_RESUELTA',
          titulo: 'Solicitud de plantilla APROBADA',
        }),
      ]);
      render(<NotificationsBell />);
      await abrirPanel(user);

      await user.click(await screen.findByRole('button', { name: /Ver mis solicitudes/ }));
      expect(h.navigate).toHaveBeenCalledWith('/plantillas/mis-solicitudes');
    });

    /**
     * Al catálogo y NO a «Mis Solicitudes»: esa pantalla exige
     * `solicitudes_plantilla:solicitar`, que sólo tiene el director. Mandar ahí
     * al coordinador sería contra una pantalla bloqueada.
     */
    it('lleva al beneficiario al catálogo, que es donde crea su ficha', async () => {
      const user = userEvent.setup();
      setData([
        notif({
          id: 'sp3',
          tipo: 'SOLICITUD_PLANTILLA_AUTORIZADA',
          titulo: 'Ya puedes crear tu ficha propia',
        }),
      ]);
      render(<NotificationsBell />);
      await abrirPanel(user);

      await user.click(await screen.findByRole('button', { name: /Crear mi ficha/ }));
      expect(h.navigate).toHaveBeenCalledWith('/plantillas?filtro=ie');
      expect(h.navigate).not.toHaveBeenCalledWith('/plantillas/mis-solicitudes');
    });

    it('navega a /monitoreo/solicitudes-visita para notificaciones de SOLICITUD_RESUELTA', async () => {
      const user = userEvent.setup();
      setData([
        notif({
          id: 's1',
          tipo: 'SOLICITUD_RESUELTA',
          titulo: 'Solicitud rechazada: INAI CABANILLA',
          leida: false,
        }),
      ]);
      render(<NotificationsBell />);
      await abrirPanel(user);

      const accion = await screen.findByRole('button', { name: /Ver Solicitudes de visita/ });
      await user.click(accion);
      expect(h.mutateLeida).toHaveBeenCalledWith('s1');
      expect(h.navigate).toHaveBeenCalledWith('/monitoreo/solicitudes-visita');
    });

    it('navega a /focos-atencion?distrito=... para alertas de distrito crítico', async () => {
      const user = userEvent.setup();
      setData([
        notif({
          id: 'd1',
          tipo: 'ALERTA_DISTRITO',
          titulo: 'Distrito en nivel crítico: CALAPUJA',
          leida: false,
        }),
      ]);
      render(<NotificationsBell />);
      await abrirPanel(user);

      const accion = await screen.findByRole('button', { name: /Ver Focos de Atención/ });
      await user.click(accion);
      expect(h.mutateLeida).toHaveBeenCalledWith('d1');
      expect(h.navigate).toHaveBeenCalledWith('/focos-atencion?distrito=CALAPUJA');
    });

    it('navega a /focos-atencion?institucionId=... para alertas de institución', async () => {
      const user = userEvent.setup();
      setData([
        notif({
          id: 'i1',
          tipo: 'ALERTA_INSTITUCION',
          titulo: 'Docente en nivel crítico',
          institucionId: 'ie-123',
          leida: false,
        }),
      ]);
      render(<NotificationsBell />);
      await abrirPanel(user);

      const accion = await screen.findByRole('button', { name: /Ver Focos de Atención/ });
      await user.click(accion);
      expect(h.mutateLeida).toHaveBeenCalledWith('i1');
      expect(h.navigate).toHaveBeenCalledWith('/focos-atencion?institucionId=ie-123');
    });

    it('un rol sin Focos (director de I.E.) enlaza al panel, no a Focos', async () => {
      const user = userEvent.setup();
      h.role = 'director_institucion';
      setData([
        notif({
          id: 'i2',
          tipo: 'ALERTA_INSTITUCION',
          titulo: 'Docente en nivel crítico',
          institucionId: 'ie-123',
          leida: false,
        }),
      ]);
      render(<NotificationsBell />);
      await abrirPanel(user);

      expect(screen.queryByRole('button', { name: /Ver Focos de Atención/ })).toBeNull();
      await user.click(await screen.findByRole('button', { name: /Ver Dashboard/ }));
      expect(h.navigate).toHaveBeenCalledWith('/dashboard');
    });
  });
});
