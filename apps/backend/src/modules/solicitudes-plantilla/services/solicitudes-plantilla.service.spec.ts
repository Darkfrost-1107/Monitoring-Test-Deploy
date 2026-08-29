import { jest } from '@jest/globals';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CargoBeneficiario } from '@sistema-monitoreo/shared-contracts';
import { SolicitudesPlantillaService } from './solicitudes-plantilla.service.js';
import { RoleCode } from '../../../common/enums/role.enum.js';
import type { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { SessionUser } from '../../../shared/types/session-user.js';

/**
 * Pruebas del pedido de una I.E. para crear plantillas propias.
 *
 * ── Las dos reglas que sostienen la función ──
 * El director de la I.E. es la única boca: tramita lo suyo y lo del Jefe de
 * Taller o el Coordinador Pedagógico, que no piden por su cuenta. Y la decisión
 * es del Jefe de Gestión sobre el paquete completo.
 *
 * Lo demás que se fija acá son las condiciones de borde que convierten un
 * trámite en un control: que no se pueda resolver dos veces la misma solicitud,
 * que un rechazo diga por qué, y que nadie pida una ficha directiva —que es del
 * especialista, no de la institución—.
 */

const IE = 'ie-1';
const ANIO = 2026;
const PDF = '/uploads/solicitud-plantilla-abc.pdf';

const director: SessionUser = {
  id: 'u-director',
  role: RoleCode.DIRECTOR_INSTITUCION,
  institucionId: IE,
};
const jefeTaller: SessionUser = { id: 'u-taller', role: RoleCode.JEFE_TALLER, institucionId: IE };
const jefeGestion: SessionUser = { id: 'u-jg', role: RoleCode.JEFE_GESTION, institucionId: null };

const itemValido = {
  instrumento: 'DOCENTE' as const,
  cargoBeneficiario: CargoBeneficiario.JEFE_DE_TALLER,
  // El cupo se aprueba a nombre de una persona, no de un cargo: la I.E. puede
  // tener dos jefes de taller y el vale es de uno solo.
  beneficiarioId: 'u-taller',
  descripcion: 'Ficha para el taller de carpintería',
};

const fila = (over: Record<string, unknown> = {}) => ({
  id: 's-1',
  institucionId: IE,
  solicitanteId: director.id,
  anioEscolar: ANIO,
  justificacionUrl: PDF,
  estado: 'PENDIENTE',
  comentario: null,
  resueltaPorId: null,
  resueltaAt: null,
  createdAt: new Date('2026-03-01T10:00:00.000Z'),
  institucion: { nombre: 'I.E. 70001' },
  solicitante: { persona: { nombres: 'Luis', apellidos: 'Quispe' } },
  resueltaPor: null,
  items: [
    {
      id: 'item-1',
      ...itemValido,
      plantillaId: null,
      beneficiario: { persona: { nombres: 'Marta', apellidos: 'Ccama' } },
    },
  ],
  ...over,
});

/** Padrón por defecto: el jefe de taller al que apunta `itemValido`. */
const PERSONAL_DE_LA_IE = [
  {
    id: 'u-taller',
    rol: { codigo: RoleCode.JEFE_TALLER },
    persona: { nombres: 'Marta', apellidos: 'Ccama' },
  },
];

const prismaFalso = () => ({
  solicitudPlantilla: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  usuario: {
    findMany: jest.fn<any>().mockResolvedValue(PERSONAL_DE_LA_IE),
  },
});

const montar = () => {
  const prisma = prismaFalso();
  // El emisor de eventos se espía: los avisos de la solicitud viajan por ahí y
  // son parte del contrato del servicio, no un detalle de otro módulo.
  const emit = jest.fn();
  const service = new SolicitudesPlantillaService(
    prisma as unknown as PrismaService,
    { emit } as unknown as EventEmitter2,
  );
  return { service, prisma, emit };
};

const pedido = (over: Record<string, unknown> = {}) => ({
  anioEscolar: ANIO,
  items: [itemValido],
  ...over,
});

describe('SolicitudesPlantillaService', () => {
  describe('crear', () => {
    it('solo el director de la I.E. emite el pedido', async () => {
      // El jefe de taller le pide al director, no al sistema. Es una regla de
      // la institución, y el backend la sostiene.
      const { service, prisma } = montar();

      await expect(service.crear(jefeTaller, pedido(), PDF)).rejects.toThrow(ForbiddenException);
      expect(prisma.solicitudPlantilla.create).not.toHaveBeenCalled();
    });

    it('rechaza una sesion de institucion sin institucion asignada', async () => {
      const { service } = montar();
      const huerfano = { ...director, institucionId: null };

      await expect(service.crear(huerfano, pedido(), PDF)).rejects.toThrow(ForbiddenException);
    });

    it('exige al menos un item: un pedido vacio no pide nada', async () => {
      const { service } = montar();

      await expect(service.crear(director, pedido({ items: [] }), PDF)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('no admite pedir la ficha directiva', async () => {
      // El instrumento directivo lo aplica el especialista de la UGEL, no la
      // institución: permitirlo abriría una puerta que el negocio no tiene.
      const { service } = montar();
      const conDirectiva = pedido({
        items: [{ ...itemValido, instrumento: 'DIRECTIVO' }],
      });

      await expect(service.crear(director, conDirectiva, PDF)).rejects.toThrow(/DIRECTIVO/i);
    });

    it('no admite un cargo que no existe en la institucion', async () => {
      const { service } = montar();
      const conCargoRaro = pedido({
        items: [{ ...itemValido, cargoBeneficiario: 'Especialista' }],
      });

      await expect(service.crear(director, conCargoRaro, PDF)).rejects.toThrow(BadRequestException);
    });

    it('guarda el pedido con la institucion de la SESION, no la que venga en el cuerpo', async () => {
      // El cuerpo no decide de qué institución es el pedido: la sesión sí.
      const { service, prisma } = montar();
      prisma.solicitudPlantilla.findFirst.mockResolvedValue(null as never);
      prisma.solicitudPlantilla.create.mockResolvedValue(fila() as never);

      await service.crear(director, { ...pedido(), institucionId: 'ie-ajena' } as never, PDF);

      const args = prisma.solicitudPlantilla.create.mock.calls[0]?.[0] as {
        data: { institucionId: string; solicitanteId: string; justificacionUrl: string };
      };
      expect(args.data.institucionId).toBe(IE);
      expect(args.data.solicitanteId).toBe(director.id);
      expect(args.data.justificacionUrl).toBe(PDF);
    });

    /**
     * El caso que trae el campo: una I.E. con dos jefes de taller. El vale se
     * pedía por cargo y lo consumía el primero que entrara, de modo que el
     * destinatario legítimo se encontraba con «no hay cupo» semanas después.
     */
    it('exige a que persona se destina cada plantilla', async () => {
      const { service } = montar();
      const sinDestinatario = pedido({
        items: [{ ...itemValido, beneficiarioId: undefined }],
      });

      await expect(service.crear(director, sinDestinatario, PDF)).rejects.toThrow(/persona/i);
    });

    it('no admite destinar la plantilla a alguien de otra institucion', async () => {
      // El cuerpo lo controla quien envía: sin esta comprobación, un id ajeno
      // convertiría el pedido en una autorización para alguien de afuera.
      const { service, prisma } = montar();
      const ajeno = pedido({ items: [{ ...itemValido, beneficiarioId: 'u-de-otra-ie' }] });

      await expect(service.crear(director, ajeno, PDF)).rejects.toThrow(BadRequestException);
      expect(prisma.solicitudPlantilla.create).not.toHaveBeenCalled();
    });

    it('no admite que el cargo declarado contradiga al del destinatario', async () => {
      const { service } = montar();
      const contradictorio = pedido({
        items: [{ ...itemValido, cargoBeneficiario: CargoBeneficiario.COORDINADOR_PEDAGOGICO }],
      });

      await expect(service.crear(director, contradictorio, PDF)).rejects.toThrow(
        /Coordinador Pedag/i,
      );
    });

    it('guarda el destinatario junto al cupo', async () => {
      const { service, prisma } = montar();
      prisma.solicitudPlantilla.findFirst.mockResolvedValue(null as never);
      prisma.solicitudPlantilla.create.mockResolvedValue(fila() as never);

      await service.crear(director, pedido(), PDF);

      const args = prisma.solicitudPlantilla.create.mock.calls[0]?.[0] as {
        data: { items: { create: { beneficiarioId: string }[] } };
      };
      expect(args.data.items.create[0]?.beneficiarioId).toBe('u-taller');
    });

    it('impide una segunda solicitud pendiente del mismo ano', async () => {
      // Dos pedidos abiertos a la vez dejan al Jefe de Gestión decidiendo sobre
      // información que se contradice, y duplican los cupos si aprueba ambos.
      const { service, prisma } = montar();
      prisma.solicitudPlantilla.findFirst.mockResolvedValue(fila() as never);

      await expect(service.crear(director, pedido(), PDF)).rejects.toThrow(ConflictException);
    });
  });

  /**
   * El trámite tenía las dos puntas mudas: el director presentaba y nadie en la
   * Jefatura se enteraba hasta que alguien abría la bandeja; resuelto el pedido,
   * el director tampoco sabía si podía crear su ficha. Un trámite que sólo
   * avanza si alguien se acuerda de mirar no es un trámite.
   */
  describe('avisos del trámite', () => {
    it('avisa cuando se presenta la solicitud', async () => {
      const { service, prisma, emit } = montar();
      prisma.solicitudPlantilla.findFirst.mockResolvedValue(null as never);
      prisma.solicitudPlantilla.create.mockResolvedValue(fila() as never);

      await service.crear(director, pedido(), PDF);

      expect(emit).toHaveBeenCalledWith('solicitud-plantilla.creada', { solicitudId: 's-1' });
    });

    it('no avisa si el pedido no llegó a guardarse', async () => {
      // Ya hay una solicitud pendiente: la creación falla y nadie debe recibir
      // el aviso de algo que no existe.
      const { service, prisma, emit } = montar();
      prisma.solicitudPlantilla.findFirst.mockResolvedValue(fila() as never);

      await expect(service.crear(director, pedido(), PDF)).rejects.toThrow(ConflictException);
      expect(emit).not.toHaveBeenCalled();
    });

    it('avisa la aprobación, diciendo quién resolvió', async () => {
      const { service, prisma, emit } = montar();
      prisma.solicitudPlantilla.updateMany.mockResolvedValue({ count: 1 } as never);
      prisma.solicitudPlantilla.findUnique.mockResolvedValue(fila({ estado: 'APROBADA' }) as never);

      await service.aprobar('s-1', jefeGestion);

      expect(emit).toHaveBeenCalledWith('solicitud-plantilla.resuelta', {
        solicitudId: 's-1',
        resolutorId: jefeGestion.id,
        estado: 'APROBADA',
      });
    });

    it('avisa el rechazo', async () => {
      const { service, prisma, emit } = montar();
      prisma.solicitudPlantilla.updateMany.mockResolvedValue({ count: 1 } as never);
      prisma.solicitudPlantilla.findUnique.mockResolvedValue(
        fila({ estado: 'RECHAZADA' }) as never,
      );

      await service.rechazar('s-1', jefeGestion, 'La ficha oficial ya cubre eso.');

      expect(emit).toHaveBeenCalledWith('solicitud-plantilla.resuelta', {
        solicitudId: 's-1',
        resolutorId: jefeGestion.id,
        estado: 'RECHAZADA',
      });
    });

    /**
     * El aviso sale DESPUÉS del UPDATE condicional. Dos jefes resolviendo a la
     * vez: sólo uno actualiza filas, y la misma decisión no se comunica dos
     * veces.
     */
    it('no avisa una decisión que otro ya había tomado', async () => {
      const { service, prisma, emit } = montar();
      prisma.solicitudPlantilla.updateMany.mockResolvedValue({ count: 0 } as never);

      await expect(service.aprobar('s-1', jefeGestion)).rejects.toThrow(ConflictException);
      expect(emit).not.toHaveBeenCalled();
    });
  });

  describe('resolver', () => {
    it('aprueba dejando constancia de quien y cuando', async () => {
      const { service, prisma } = montar();
      prisma.solicitudPlantilla.updateMany.mockResolvedValue({ count: 1 } as never);
      prisma.solicitudPlantilla.findUnique.mockResolvedValue(fila({ estado: 'APROBADA' }) as never);

      await service.aprobar('s-1', jefeGestion, 'Justificación suficiente.');

      const args = prisma.solicitudPlantilla.updateMany.mock.calls[0]?.[0] as {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      };
      expect(args.data).toMatchObject({ estado: 'APROBADA', resueltaPorId: jefeGestion.id });
      expect(args.data.resueltaAt).toBeInstanceOf(Date);
    });

    it('solo resuelve lo que sigue PENDIENTE', async () => {
      // La condición viaja en el UPDATE y no sólo en una lectura previa: dos
      // decisiones simultáneas sobre la misma solicitud no pueden pisarse.
      const { service, prisma } = montar();
      prisma.solicitudPlantilla.updateMany.mockResolvedValue({ count: 1 } as never);
      prisma.solicitudPlantilla.findUnique.mockResolvedValue(fila() as never);

      await service.aprobar('s-1', jefeGestion);

      const args = prisma.solicitudPlantilla.updateMany.mock.calls[0]?.[0] as {
        where: Record<string, unknown>;
      };
      expect(args.where).toMatchObject({ id: 's-1', estado: 'PENDIENTE' });
    });

    it('falla al resolver una solicitud ya resuelta', async () => {
      const { service, prisma } = montar();
      prisma.solicitudPlantilla.updateMany.mockResolvedValue({ count: 0 } as never);

      await expect(service.aprobar('s-1', jefeGestion)).rejects.toThrow(ConflictException);
    });

    it('exige motivo para rechazar', async () => {
      // Un rechazo sin motivo obliga al director a adivinar qué corregir, y el
      // trámite vuelve igual.
      const { service, prisma } = montar();

      await expect(service.rechazar('s-1', jefeGestion, '   ')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.solicitudPlantilla.updateMany).not.toHaveBeenCalled();
    });

    it('rechaza guardando el motivo', async () => {
      const { service, prisma } = montar();
      prisma.solicitudPlantilla.updateMany.mockResolvedValue({ count: 1 } as never);
      prisma.solicitudPlantilla.findUnique.mockResolvedValue(
        fila({ estado: 'RECHAZADA' }) as never,
      );

      await service.rechazar('s-1', jefeGestion, 'La ficha oficial ya cubre ese caso.');

      const args = prisma.solicitudPlantilla.updateMany.mock.calls[0]?.[0] as {
        data: Record<string, unknown>;
      };
      expect(args.data).toMatchObject({
        estado: 'RECHAZADA',
        comentario: 'La ficha oficial ya cubre ese caso.',
      });
    });
  });

  describe('lectura', () => {
    it('el director solo ve las solicitudes de SU institucion', async () => {
      const { service, prisma } = montar();
      prisma.solicitudPlantilla.findMany.mockResolvedValue([] as never);
      prisma.solicitudPlantilla.count.mockResolvedValue(0 as never);

      await service.mias(director);

      const args = prisma.solicitudPlantilla.findMany.mock.calls[0]?.[0] as {
        where: Record<string, unknown>;
      };
      expect(args.where).toMatchObject({ institucionId: IE });
    });

    it('expone el nombre del solicitante y no su identificador', async () => {
      const { service, prisma } = montar();
      prisma.solicitudPlantilla.findMany.mockResolvedValue([fila()] as never);
      prisma.solicitudPlantilla.count.mockResolvedValue(1 as never);

      const { solicitudes } = await service.listar();

      expect(solicitudes[0]?.solicitante).toBe('Luis Quispe');
      expect(JSON.stringify(solicitudes[0])).not.toContain(director.id);
    });

    it('cuenta las pendientes para el aviso de la bandeja', async () => {
      const { service, prisma } = montar();
      prisma.solicitudPlantilla.findMany.mockResolvedValue([fila()] as never);
      prisma.solicitudPlantilla.count.mockResolvedValue(3 as never);

      await expect(service.listar()).resolves.toMatchObject({ pendientes: 3 });
    });
  });

  describe('justificacion', () => {
    /**
     * El PDF no puede servirse como archivo estatico: `uploads/` no pide sesion
     * y cualquiera con la URL se lo lleva. Es el mismo agujero que ya se cerro
     * para las firmas manuscritas.
     *
     * Y a quien no corresponde se le responde «no encontrada» y no «prohibido»,
     * para no confirmarle que la solicitud existe. Mismo criterio que las
     * solicitudes de visita.
     */
    it('el jefe de gestion accede a la justificacion de cualquier institucion', async () => {
      const { service, prisma } = montar();
      prisma.solicitudPlantilla.findFirst.mockResolvedValue(fila() as never);

      await expect(
        service.rutaDeJustificacion('s-1', { userId: jefeGestion.id, esGestor: true }),
      ).resolves.toBe(PDF);

      const where = (
        prisma.solicitudPlantilla.findFirst.mock.calls[0]?.[0] as {
          where: Record<string, unknown>;
        }
      ).where;
      // Sin acotar por institucion: la bandeja es de todas.
      expect(where).toEqual({ id: 's-1' });
    });

    it('el director solo accede a la de SU institucion', async () => {
      const { service, prisma } = montar();
      prisma.solicitudPlantilla.findFirst.mockResolvedValue(fila() as never);

      await service.rutaDeJustificacion('s-1', {
        userId: director.id,
        esGestor: false,
        institucionId: IE,
      });

      const where = (
        prisma.solicitudPlantilla.findFirst.mock.calls[0]?.[0] as {
          where: Record<string, unknown>;
        }
      ).where;
      expect(where).toMatchObject({ id: 's-1', institucionId: IE });
    });

    it('responde «no encontrada» y no «prohibido» ante una solicitud ajena', async () => {
      // Un 403 confirmaria que esa solicitud existe.
      const { service, prisma } = montar();
      prisma.solicitudPlantilla.findFirst.mockResolvedValue(null as never);

      await expect(
        service.rutaDeJustificacion('s-ajena', {
          userId: director.id,
          esGestor: false,
          institucionId: IE,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza a una sesion de institucion sin institucion', async () => {
      const { service, prisma } = montar();

      await expect(
        service.rutaDeJustificacion('s-1', { userId: director.id, esGestor: false }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.solicitudPlantilla.findFirst).not.toHaveBeenCalled();
    });
  });
});
