import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { VisitRequestsService } from './visit-requests.service.js';
import type { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { NotificationsService } from '../../notifications/services/notifications.service.js';

/**
 * Pruebas de caracterización del servicio de solicitudes de visita.
 *
 * Fase 3 de PLAN_REMEDIACION.md. Estaba en 0 % pese a concentrar las reglas del
 * flujo: qué impide crear una solicitud duplicada, quién puede ver el detalle de
 * cuál, y qué ocurre al resolver una ya resuelta.
 *
 * Registran además una decisión de seguridad que no estaba verificada: a quien
 * no gestiona se le responde «no encontrada» en lugar de «prohibido», para no
 * revelar que la solicitud existe.
 */

const solicitudFila = (over: Record<string, unknown> = {}) => ({
  id: 's-1',
  institucionId: 'ie-1',
  docenteId: null,
  motivo: null,
  prioridad: 'ALTA',
  estado: 'PENDIENTE',
  createdAt: new Date('2026-03-01T10:00:00.000Z'),
  resueltaAt: null,
  solicitanteId: 'u-solicitante',
  cronogramaId: null,
  comentario: null,
  atendidaPor: null,
  institucion: { id: 'ie-1', nombre: 'I.E. Ejemplo', distrito: 'Lampa' },
  docente: null,
  solicitante: { persona: { nombres: 'Carlos', apellidos: 'Mendoza' } },
  ...over,
});

/** Doble de Prisma con sólo los modelos que este servicio toca. */
const prismaFalso = () => ({
  institucionEducativa: { findUnique: jest.fn() },
  docente: { findFirst: jest.fn() },
  solicitudVisita: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  usuario: { findMany: jest.fn(), findUnique: jest.fn() },
  cronograma: { findUnique: jest.fn() },
});

type PrismaFalso = ReturnType<typeof prismaFalso>;

const montar = () => {
  const prisma = prismaFalso();
  const notifications = { crearNotificaciones: jest.fn() };
  const service = new VisitRequestsService(
    prisma as unknown as PrismaService,
    notifications as unknown as NotificationsService,
  );
  return { service, prisma, notifications };
};

/** Configura el camino feliz de `crear`. */
const prepararCreacion = (prisma: PrismaFalso, creada = solicitudFila()) => {
  prisma.institucionEducativa.findUnique.mockResolvedValue({
    id: 'ie-1',
    nombre: 'I.E. Ejemplo',
    distrito: 'Lampa',
  } as never);
  prisma.solicitudVisita.findFirst.mockResolvedValue(null as never);
  prisma.solicitudVisita.create.mockResolvedValue(creada as never);
  prisma.usuario.findMany.mockResolvedValue([] as never);
};

const solicitante = { id: 'u-solicitante', nombre: 'Director UGEL' };

describe('VisitRequestsService', () => {
  describe('crear', () => {
    it('rechaza una institución inexistente', async () => {
      const { service, prisma } = montar();
      prisma.institucionEducativa.findUnique.mockResolvedValue(null as never);

      await expect(service.crear({ institucionId: 'ie-x' }, solicitante)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rechaza un docente que no pertenece a la institución indicada', async () => {
      // El docente se busca acotado a la IE: impide solicitar una visita a un
      // docente de otro colegio.
      const { service, prisma } = montar();
      prisma.institucionEducativa.findUnique.mockResolvedValue({
        id: 'ie-1',
        nombre: 'I.E. Ejemplo',
        distrito: 'Lampa',
      } as never);
      prisma.docente.findFirst.mockResolvedValue(null as never);

      await expect(
        service.crear({ institucionId: 'ie-1', docenteId: 'd-otro' }, solicitante),
      ).rejects.toThrow(/Docente no encontrado/);
    });

    describe('solicitud pendiente duplicada', () => {
      it('impide una segunda solicitud para la misma institución', async () => {
        const { service, prisma } = montar();
        prepararCreacion(prisma);
        prisma.solicitudVisita.findFirst.mockResolvedValue(solicitudFila() as never);

        await expect(service.crear({ institucionId: 'ie-1' }, solicitante)).rejects.toThrow(
          ConflictException,
        );
      });

      it('nombra al docente en el mensaje cuando la solicitud es sobre uno', async () => {
        const { service, prisma } = montar();
        prepararCreacion(prisma);
        prisma.docente.findFirst.mockResolvedValue({
          persona: { nombres: 'Ana', apellidos: 'Quispe' },
        } as never);
        prisma.solicitudVisita.findFirst.mockResolvedValue(solicitudFila() as never);

        await expect(
          service.crear({ institucionId: 'ie-1', docenteId: 'd-1' }, solicitante),
        ).rejects.toThrow(/Ana Quispe/);
      });

      it('distingue por docente: la pendiente se busca por institución Y docente', async () => {
        const { service, prisma } = montar();
        prepararCreacion(prisma);

        await service.crear({ institucionId: 'ie-1' }, solicitante);

        expect(prisma.solicitudVisita.findFirst).toHaveBeenCalledWith({
          where: { estado: 'PENDIENTE', institucionId: 'ie-1', docenteId: null },
        });
      });
    });

    it('asigna prioridad ALTA cuando no se indica', async () => {
      const { service, prisma } = montar();
      prepararCreacion(prisma);

      await service.crear({ institucionId: 'ie-1' }, solicitante);

      expect(prisma.solicitudVisita.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ prioridad: 'ALTA', motivo: null, docenteId: null }),
        }),
      );
    });

    describe('aviso al jefe de gestión', () => {
      it('notifica a todos los jefes de gestión activos', async () => {
        const { service, prisma, notifications } = montar();
        prepararCreacion(prisma);
        prisma.usuario.findMany.mockResolvedValue([
          { id: 'u-jefe', persona: { correo: 'jefe@ugel.gob.pe' } },
        ] as never);

        await service.crear({ institucionId: 'ie-1' }, solicitante);

        expect(prisma.usuario.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ where: { rol: { codigo: 'jefe_gestion' }, isActive: true } }),
        );
        expect(notifications.crearNotificaciones).toHaveBeenCalledWith(
          [{ usuarioId: 'u-jefe', correo: 'jefe@ugel.gob.pe' }],
          expect.objectContaining({ tipo: 'SOLICITUD_VISITA' }),
        );
      });

      it('no emite notificación si no hay jefes de gestión', async () => {
        // La solicitud igual se crea: la ausencia de destinatario no invalida
        // el registro.
        const { service, prisma, notifications } = montar();
        prepararCreacion(prisma);

        const creada = await service.crear({ institucionId: 'ie-1' }, solicitante);

        expect(creada.id).toBe('s-1');
        expect(notifications.crearNotificaciones).not.toHaveBeenCalled();
      });

      it('marca la solicitud como PRIORITARIA cuando la prioridad es ALTA', async () => {
        const { service, prisma, notifications } = montar();
        prepararCreacion(prisma);
        prisma.usuario.findMany.mockResolvedValue([
          { id: 'u-jefe', persona: { correo: null } },
        ] as never);

        await service.crear({ institucionId: 'ie-1' }, solicitante);

        const [, payload] = notifications.crearNotificaciones.mock.calls[0] as [
          unknown,
          { mensaje: string },
        ];
        expect(payload.mensaje).toContain('PRIORITARIA');
      });

      it('incluye el motivo en el mensaje cuando se indicó', async () => {
        const { service, prisma, notifications } = montar();
        prepararCreacion(prisma);
        prisma.usuario.findMany.mockResolvedValue([
          { id: 'u-jefe', persona: { correo: null } },
        ] as never);

        await service.crear({ institucionId: 'ie-1', motivo: 'Baja cobertura' }, solicitante);

        const [, payload] = notifications.crearNotificaciones.mock.calls[0] as [
          unknown,
          { mensaje: string },
        ];
        expect(payload.mensaje).toContain('Motivo: Baja cobertura');
      });
    });
  });

  describe('detalle', () => {
    it('rechaza una solicitud inexistente', async () => {
      const { service, prisma } = montar();
      prisma.solicitudVisita.findUnique.mockResolvedValue(null as never);

      await expect(service.detalle('s-x')).rejects.toThrow(NotFoundException);
    });

    it('responde «no encontrada» a quien no gestiona y pide una ajena', async () => {
      // Decisión de seguridad: devolver 404 en lugar de 403 evita confirmar que
      // la solicitud existe a quien no debería saberlo.
      const { service, prisma } = montar();
      prisma.solicitudVisita.findUnique.mockResolvedValue(
        solicitudFila({ solicitanteId: 'u-otro' }) as never,
      );

      await expect(service.detalle('s-1', { userId: 'u-yo', esGestor: false })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('permite ver la propia solicitud a quien no gestiona', async () => {
      const { service, prisma } = montar();
      prisma.solicitudVisita.findUnique.mockResolvedValue(
        solicitudFila({ solicitanteId: 'u-yo' }) as never,
      );

      const d = await service.detalle('s-1', { userId: 'u-yo', esGestor: false });

      expect(d.id).toBe('s-1');
    });

    it('permite a quien gestiona ver cualquier solicitud', async () => {
      const { service, prisma } = montar();
      prisma.solicitudVisita.findUnique.mockResolvedValue(
        solicitudFila({ solicitanteId: 'u-otro' }) as never,
      );

      const d = await service.detalle('s-1', { userId: 'u-jefe', esGestor: true });

      expect(d.id).toBe('s-1');
    });

    it('resuelve el cronograma aparte cuando la solicitud fue atendida', async () => {
      // El modelo no tiene relación directa; se consulta en una segunda llamada.
      const { service, prisma } = montar();
      prisma.solicitudVisita.findUnique.mockResolvedValue(
        solicitudFila({ cronogramaId: 'c-1' }) as never,
      );
      prisma.cronograma.findUnique.mockResolvedValue({
        id: 'c-1',
        fechaProgramada: new Date('2026-04-10T00:00:00.000Z'),
        horaInicio: '09:00',
        monitor: { persona: { nombres: 'Luis', apellidos: 'Pérez' } },
      } as never);

      const d = await service.detalle('s-1');

      expect(d.cronograma).toEqual({
        id: 'c-1',
        // Fecha de CALENDARIO, sin hora ni zona: la columna es @db.Date y no
        // guarda un instante. Antes viajaba como ISO completo y el cliente,
        // en UTC-5, la mostraba un día antes.
        fechaProgramada: '2026-04-10',
        horaInicio: '09:00',
        especialistaNombre: 'Luis Pérez',
      });
    });

    it('deja el cronograma en nulo si la solicitud no lo tiene', async () => {
      const { service, prisma } = montar();
      prisma.solicitudVisita.findUnique.mockResolvedValue(solicitudFila() as never);

      const d = await service.detalle('s-1');

      expect(d.cronograma).toBeNull();
      expect(prisma.cronograma.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('resolución de solicitudes', () => {
    const prepararResolucion = (prisma: PrismaFalso, over: Record<string, unknown> = {}) => {
      prisma.solicitudVisita.findUnique.mockResolvedValue(solicitudFila(over) as never);
      prisma.solicitudVisita.update.mockResolvedValue({} as never);
      prisma.usuario.findUnique.mockResolvedValue({
        persona: { correo: 'ugel@ugel.gob.pe' },
      } as never);
    };

    it('rechaza resolver una solicitud inexistente', async () => {
      const { service, prisma } = montar();
      prisma.solicitudVisita.findUnique.mockResolvedValue(null as never);

      await expect(service.atender('s-x', 'u-jefe', {})).rejects.toThrow(NotFoundException);
    });

    it.each([['ATENDIDA'], ['RECHAZADA']])(
      'impide volver a resolver una solicitud ya %s',
      async (estado) => {
        const { service, prisma } = montar();
        prepararResolucion(prisma, { estado });

        await expect(service.atender('s-1', 'u-jefe', {})).rejects.toThrow(/ya fue resuelta/);
      },
    );

    it('atender deja la solicitud en ATENDIDA y registra quién la resolvió', async () => {
      const { service, prisma } = montar();
      prepararResolucion(prisma);

      await service.atender('s-1', 'u-jefe', { cronogramaId: 'c-1' });

      expect(prisma.solicitudVisita.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado: 'ATENDIDA',
            atendidaPorId: 'u-jefe',
            cronogramaId: 'c-1',
          }),
        }),
      );
    });

    it('rechazar deja la solicitud en RECHAZADA', async () => {
      const { service, prisma } = montar();
      prepararResolucion(prisma);

      await service.rechazar('s-1', 'u-jefe', { comentario: 'Sin disponibilidad' });

      expect(prisma.solicitudVisita.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ estado: 'RECHAZADA' }) }),
      );
    });

    it('avisa al solicitante del resultado', async () => {
      const { service, prisma, notifications } = montar();
      prepararResolucion(prisma);

      await service.atender('s-1', 'u-jefe', {});

      expect(notifications.crearNotificaciones).toHaveBeenCalledWith(
        [{ usuarioId: 'u-solicitante', correo: 'ugel@ugel.gob.pe' }],
        expect.objectContaining({ tipo: 'SOLICITUD_RESUELTA' }),
      );
    });

    it('incluye el comentario del resolutor en el aviso', async () => {
      const { service, prisma, notifications } = montar();
      prepararResolucion(prisma);

      await service.rechazar('s-1', 'u-jefe', { comentario: 'Sin disponibilidad' });

      const [, payload] = notifications.crearNotificaciones.mock.calls[0] as [
        unknown,
        { mensaje: string },
      ];
      expect(payload.mensaje).toContain('Comentario: Sin disponibilidad');
    });
  });

  describe('listado', () => {
    it('cuenta las pendientes aparte del filtro aplicado', async () => {
      // El contador de pendientes alimenta el badge del sidebar y no debe
      // verse afectado por el filtro de estado que mire el usuario.
      const { service, prisma } = montar();
      prisma.solicitudVisita.findMany.mockResolvedValue([] as never);
      prisma.solicitudVisita.count.mockResolvedValue(7 as never);

      const r = await service.listar('ATENDIDA');

      expect(r.pendientes).toBe(7);
      expect(prisma.solicitudVisita.count).toHaveBeenCalledWith({
        where: { estado: 'PENDIENTE' },
      });
    });

    it('misSolicitudes acota siempre al solicitante', async () => {
      const { service, prisma } = montar();
      prisma.solicitudVisita.findMany.mockResolvedValue([] as never);
      prisma.solicitudVisita.count.mockResolvedValue(0 as never);

      await service.misSolicitudes('u-yo', 'PENDIENTE');

      expect(prisma.solicitudVisita.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { solicitanteId: 'u-yo', estado: 'PENDIENTE' } }),
      );
      expect(prisma.solicitudVisita.count).toHaveBeenCalledWith({
        where: { solicitanteId: 'u-yo', estado: 'PENDIENTE' },
      });
    });
  });

  describe('conversión al contrato', () => {
    it('deja el nombre del docente en nulo cuando la solicitud es institucional', async () => {
      const { service, prisma } = montar();
      prisma.solicitudVisita.findUnique.mockResolvedValue(solicitudFila() as never);

      const d = await service.detalle('s-1');

      expect(d.docenteNombre).toBeNull();
      expect(d.solicitanteNombre).toBe('Carlos Mendoza');
      expect(d.createdAt).toBe('2026-03-01T10:00:00.000Z');
      expect(d.resueltaAt).toBeNull();
    });
  });
});
