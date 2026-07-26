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
}));

vi.mock('react-router-dom', async (orig) => {
  const actual = await orig<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => h.navigate };
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
  });
});
