import { jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { CargoBeneficiario } from '@sistema-monitoreo/shared-contracts';
import { ValePlantillaService } from './vale-plantilla.service.js';
import { RoleCode } from '../../../common/enums/role.enum.js';
import type { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { SessionUser } from '../../../shared/types/session-user.js';

/**
 * Pruebas del vale que autoriza a una institución a crear una plantilla.
 *
 * El catálogo oficial son las tres fichas de la UGEL. Una institución sólo crea
 * un instrumento propio si el Jefe de Gestión aprobó un pedido que lo declara,
 * y cada ítem aprobado habilita UNA plantilla.
 *
 * ── Qué se fija acá, y por qué importa ──
 * Sin esta comprobación la aprobación sería un papel: el Jefe de Gestión firma
 * un PDF que describe una intención, y la institución construye después lo que
 * quiera. El vale ata la autorización a un instrumento, a un cargo y a un año,
 * y el servidor la hace cumplir.
 *
 * También se fija que el consumo sea único. Un vale que se pudiera usar dos
 * veces convertiría una aprobación de tres plantillas en un permiso ilimitado,
 * y nadie lo notaría hasta auditar el catálogo.
 */

const IE = 'ie-1';
const ANIO = 2026;

const director: SessionUser = {
  id: 'u-director',
  role: RoleCode.DIRECTOR_INSTITUCION,
  institucionId: IE,
};

const jefeTaller: SessionUser = {
  id: 'u-taller',
  role: RoleCode.JEFE_TALLER,
  institucionId: IE,
};
const coordinador: SessionUser = {
  id: 'u-coord',
  role: RoleCode.COORDINADOR_PEDAGOGICO,
  institucionId: IE,
};

const especialista: SessionUser = { id: 'u-esp', role: RoleCode.ESPECIALISTA, institucionId: null };
const jefeGestion: SessionUser = {
  id: 'u-jg',
  role: RoleCode.JEFE_GESTION,
  institucionId: null,
};

const vale = (over: Record<string, unknown> = {}) => ({
  id: 'item-1',
  solicitudId: 's-1',
  instrumento: 'DOCENTE',
  cargoBeneficiario: CargoBeneficiario.DIRECTOR,
  descripcion: 'Ficha para el taller de carpintería',
  plantillaId: null,
  solicitud: { anioEscolar: ANIO, institucionId: IE, estado: 'APROBADA' },
  ...over,
});

const prismaFalso = () => ({
  solicitudPlantillaItem: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
});

const montar = () => {
  const prisma = prismaFalso();
  const service = new ValePlantillaService(prisma as unknown as PrismaService);
  return { service, prisma };
};

/** Deja el filtro `where` que el servicio le pasó a Prisma. */
const filtroDe = (mock: { mock: { calls: unknown[][] } }) =>
  (mock.mock.calls[0]?.[0] as { where: Record<string, unknown> }).where;

describe('ValePlantillaService', () => {
  describe('personal de la UGEL', () => {
    it.each([
      ['un especialista', especialista],
      ['el jefe de gestion', jefeGestion],
    ])('no le exige vale a %s: las fichas oficiales son suyas', async (_caso, sesion) => {
      const { service, prisma } = montar();

      await expect(service.consumirParaCrear(sesion, 'DOCENTE')).resolves.toBeNull();
      expect(prisma.solicitudPlantillaItem.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('personal de institucion', () => {
    it('rechaza la creacion cuando no hay ningun vale libre', async () => {
      // Es la regla de fondo de la función: sin autorización previa, la
      // institución no crea instrumentos propios.
      const { service, prisma } = montar();
      prisma.solicitudPlantillaItem.findFirst.mockResolvedValue(null as never);

      await expect(service.consumirParaCrear(director, 'DOCENTE')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('explica que falta la aprobacion, en vez de un permiso generico', async () => {
      const { service, prisma } = montar();
      prisma.solicitudPlantillaItem.findFirst.mockResolvedValue(null as never);

      await expect(service.consumirParaCrear(director, 'DOCENTE')).rejects.toThrow(
        /solicitud a su nombre/i,
      );
    });

    it('exige que el vale sea de SU institucion, de ESE ano y ESE instrumento', async () => {
      const { service, prisma } = montar();
      prisma.solicitudPlantillaItem.findFirst.mockResolvedValue(vale() as never);
      prisma.solicitudPlantillaItem.updateMany.mockResolvedValue({ count: 1 } as never);

      await service.consumirParaCrear(director, 'DOCENTE', ANIO);

      const where = filtroDe(prisma.solicitudPlantillaItem.findFirst);
      expect(where).toMatchObject({
        instrumento: 'DOCENTE',
        plantillaId: null,
        solicitud: { estado: 'APROBADA', institucionId: IE, anioEscolar: ANIO },
      });
    });

    it('no toma un vale ya consumido', async () => {
      // El filtro exige `plantillaId: null`, que es lo que distingue un vale
      // libre de uno gastado.
      const { service, prisma } = montar();
      prisma.solicitudPlantillaItem.findFirst.mockResolvedValue(vale() as never);
      prisma.solicitudPlantillaItem.updateMany.mockResolvedValue({ count: 1 } as never);

      await service.consumirParaCrear(director, 'DOCENTE');

      expect(filtroDe(prisma.solicitudPlantillaItem.findFirst)).toMatchObject({
        plantillaId: null,
      });
    });

    it('devuelve el vale elegido para poder atarlo a la plantilla creada', async () => {
      const { service, prisma } = montar();
      prisma.solicitudPlantillaItem.findFirst.mockResolvedValue(vale() as never);
      prisma.solicitudPlantillaItem.updateMany.mockResolvedValue({ count: 1 } as never);

      await expect(service.consumirParaCrear(director, 'DOCENTE')).resolves.toMatchObject({
        id: 'item-1',
      });
    });
  });

  describe('marcarConsumido', () => {
    it('ata el vale a la plantilla creada', async () => {
      const { service, prisma } = montar();
      prisma.solicitudPlantillaItem.updateMany.mockResolvedValue({ count: 1 } as never);

      await service.marcarConsumido('item-1', 'plantilla-nueva');

      expect(prisma.solicitudPlantillaItem.updateMany).toHaveBeenCalledWith({
        where: { id: 'item-1', plantillaId: null },
        data: { plantillaId: 'plantilla-nueva' },
      });
    });

    it('falla si otro ya lo consumio primero', async () => {
      // La condición `plantillaId: null` en el UPDATE es lo que cierra la
      // carrera: dos creaciones simultáneas no pueden gastar el mismo vale,
      // porque la segunda actualiza cero filas.
      const { service, prisma } = montar();
      prisma.solicitudPlantillaItem.updateMany.mockResolvedValue({ count: 0 } as never);

      await expect(service.marcarConsumido('item-1', 'plantilla-nueva')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('disponibles', () => {
    it('lista solo los vales libres de la institucion', async () => {
      const { service, prisma } = montar();
      prisma.solicitudPlantillaItem.findMany.mockResolvedValue([vale()] as never);

      const libres = await service.disponibles(director, ANIO);

      expect(libres).toEqual([
        {
          itemId: 'item-1',
          instrumento: 'DOCENTE',
          cargoBeneficiario: CargoBeneficiario.DIRECTOR,
          descripcion: 'Ficha para el taller de carpintería',
          anioEscolar: ANIO,
        },
      ]);
    });

    it('no devuelve nada para una sesion sin institucion', async () => {
      const { service, prisma } = montar();

      await expect(service.disponibles(especialista, ANIO)).resolves.toEqual([]);
      expect(prisma.solicitudPlantillaItem.findMany).not.toHaveBeenCalled();
    });
  });

  describe('el vale es de una persona, no de un cargo', () => {
    /**
     * El agujero que cierra este bloque.
     *
     * Mientras el vale se buscaba por CARGO, una I.E. con dos coordinadores
     * pedagógicos recibía un cupo aprobado para uno y se lo llevaba el otro: el
     * sistema le decía que sí, porque su rol coincidía, y el destinatario
     * legítimo se encontraba con «no hay cupo» semanas más tarde, al ir a
     * monitorear. La intención del director vivía en una conversación.
     */
    it('busca el vale a nombre de quien lo consume', async () => {
      const { service, prisma } = montar();
      prisma.solicitudPlantillaItem.findFirst.mockResolvedValue(vale() as never);

      await service.consumirParaCrear(coordinador, 'DOCENTE', ANIO);

      const where = filtroDe(prisma.solicitudPlantillaItem.findFirst);
      expect(where.OR).toContainEqual({ beneficiarioId: coordinador.id });
    });

    /**
     * Los vales anteriores al destinatario siguen valiendo para cualquiera de su
     * cargo: invalidar aprobaciones ya concedidas sería peor que la imprecisión
     * que arrastran.
     */
    it('acepta tambien los vales antiguos sin destinatario, por cargo', async () => {
      const { service, prisma } = montar();
      prisma.solicitudPlantillaItem.findFirst.mockResolvedValue(vale() as never);

      await service.consumirParaCrear(jefeTaller, 'DOCENTE', ANIO);

      const where = filtroDe(prisma.solicitudPlantillaItem.findFirst);
      expect(where.OR).toContainEqual({
        beneficiarioId: null,
        cargoBeneficiario: CargoBeneficiario.JEFE_DE_TALLER,
      });
    });

    /**
     * Si tiene uno a su nombre, ése se gasta primero: consumir en su lugar un
     * vale genérico se lo quitaría a un compañero que todavía no llegó.
     */
    it('gasta primero el vale nominativo y no el generico', async () => {
      const { service, prisma } = montar();
      prisma.solicitudPlantillaItem.findFirst.mockResolvedValue(vale() as never);

      await service.consumirParaCrear(coordinador, 'DOCENTE', ANIO);

      const args = prisma.solicitudPlantillaItem.findFirst.mock.calls[0]?.[0] as {
        orderBy: Record<string, unknown>;
      };
      expect(args.orderBy).toEqual({ beneficiarioId: 'desc' });
    });

    it('el mensaje dice que el cupo es de una persona, para no volver a pedir el mismo', async () => {
      // Sin eso, quien lee «no hay cupo» vuelve a pedir uno que ya le
      // concedieron a un compañero.
      const { service, prisma } = montar();
      prisma.solicitudPlantillaItem.findFirst.mockResolvedValue(null as never);

      await expect(service.consumirParaCrear(jefeTaller, 'DOCENTE')).rejects.toThrow(
        /nombre de una persona/i,
      );
    });

    it('los vales disponibles siguen la misma regla', async () => {
      // Ofrecer el de un compañero prometería lo que el consumo va a rechazar.
      const { service, prisma } = montar();
      prisma.solicitudPlantillaItem.findMany.mockResolvedValue([] as never);

      await service.disponibles(coordinador, ANIO);

      const where = (
        prisma.solicitudPlantillaItem.findMany.mock.calls[0]?.[0] as {
          where: Record<string, unknown>;
        }
      ).where;
      expect(where.OR).toContainEqual({ beneficiarioId: coordinador.id });
    });
  });
});
