import { jest } from '@jest/globals';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ANIO_ESCOLAR_INICIAL, anioEscolarVigente } from '@sistema-monitoreo/shared-contracts';
import { CarpetaPedagogicaService } from './carpeta-pedagogica.service.js';
import type { PrismaService } from '../../../shared/prisma/prisma.service.js';

/**
 * Pruebas del servicio de carpeta pedagógica.
 *
 * Lo que se fija acá son las dos reglas que no se ven en el contrato:
 *
 * 1. **Identidad, no capacidad.** Tener `carpeta_pedagogica:write` habilita la
 *    pantalla; no autoriza a escribir sobre la carpeta de otra persona. El
 *    docente se resuelve desde la sesión contra la base, nunca desde el cuerpo
 *    de la petición ni desde un identificador del token que puede estar viejo.
 *
 * 2. **El enlace se valida en el servidor.** La validación del formulario es
 *    comodidad; la del servicio es el control. Un enlace fuera de la lista
 *    blanca de hosts no llega a la base aunque el cliente lo acepte.
 */

const URL_VALIDA = 'https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz';

const carpetaFila = (over: Record<string, unknown> = {}) => ({
  id: 'cp-1',
  docenteId: 'doc-1',
  anioEscolar: 2026,
  url: URL_VALIDA,
  descripcion: null,
  actualizadoPorId: 'u-1',
  createdAt: new Date('2026-03-01T10:00:00.000Z'),
  updatedAt: new Date('2026-03-01T10:00:00.000Z'),
  actualizadoPor: { persona: { nombres: 'Ana', apellidos: 'Quispe' } },
  ...over,
});

/** Doble de Prisma con sólo los modelos que este servicio toca. */
const prismaFalso = () => ({
  docente: { findFirst: jest.fn(), findUnique: jest.fn() },
  carpetaPedagogica: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
});

type PrismaFalso = ReturnType<typeof prismaFalso>;

const montar = () => {
  const prisma = prismaFalso();
  const service = new CarpetaPedagogicaService(prisma as unknown as PrismaService);
  return { service, prisma };
};

/** El usuario de la sesión es docente. */
const conDocente = (prisma: PrismaFalso, docenteId = 'doc-1') => {
  prisma.docente.findFirst.mockResolvedValue({ id: docenteId } as never);
};

describe('CarpetaPedagogicaService', () => {
  describe('guardarPropia', () => {
    it('rechaza a un usuario que no tiene registro de docente', async () => {
      // Un especialista puede llegar al endpoint sólo si alguien le concede la
      // capacidad por error. La identidad es la que corta.
      const { service, prisma } = montar();
      prisma.docente.findFirst.mockResolvedValue(null as never);

      await expect(
        service.guardarPropia('u-1', { anioEscolar: 2026, url: URL_VALIDA }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.carpetaPedagogica.upsert).not.toHaveBeenCalled();
    });

    it('escribe siempre sobre el docente de la sesión', async () => {
      const { service, prisma } = montar();
      conDocente(prisma, 'doc-de-la-sesion');
      prisma.carpetaPedagogica.upsert.mockResolvedValue(
        carpetaFila({ docenteId: 'doc-de-la-sesion' }) as never,
      );

      await service.guardarPropia('u-1', { anioEscolar: 2026, url: URL_VALIDA });

      const args = prisma.carpetaPedagogica.upsert.mock.calls[0]?.[0] as {
        where: { docenteId_anioEscolar: { docenteId: string; anioEscolar: number } };
      };
      expect(args.where.docenteId_anioEscolar).toEqual({
        docenteId: 'doc-de-la-sesion',
        anioEscolar: 2026,
      });
    });

    it.each([
      ['un host ajeno', 'https://dropbox.com/s/1AbCdEf'],
      ['http sin cifrar', 'http://drive.google.com/drive/folders/1AbCdEf'],
      ['el esquema javascript', 'javascript:alert(1)'],
      ['un host que sólo parece Drive', 'https://drive.google.com.atacante.io/f/1'],
    ])('rechaza %s aunque el cliente lo haya aceptado', async (_caso, url) => {
      const { service, prisma } = montar();
      conDocente(prisma);

      await expect(service.guardarPropia('u-1', { anioEscolar: 2026, url })).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.carpetaPedagogica.upsert).not.toHaveBeenCalled();
    });

    it.each([
      ['muy anterior al sistema', 1999],
      ['anterior a la puesta en marcha de la funcion', ANIO_ESCOLAR_INICIAL - 1],
      ['el ano que viene', new Date().getFullYear() + 1],
      ['dos anos adelante', new Date().getFullYear() + 2],
      ['no entero', 2026.5],
    ])('rechaza un ano escolar %s', async (_caso, anioEscolar) => {
      // El rango sale del contrato compartido y termina en el ano EN CURSO.
      // Que el selector no ofrezca anios futuros no alcanza: una peticion
      // armada a mano llega igual, y un enlace archivado contra un ano que no
      // empezo queda fuera del alcance de cualquier monitoreo.
      const { service, prisma } = montar();
      conDocente(prisma);

      await expect(service.guardarPropia('u-1', { anioEscolar, url: URL_VALIDA })).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.carpetaPedagogica.upsert).not.toHaveBeenCalled();
    });

    it('acepta el ano en curso', async () => {
      const { service, prisma } = montar();
      conDocente(prisma);
      prisma.carpetaPedagogica.upsert.mockResolvedValue(carpetaFila() as never);

      await expect(
        service.guardarPropia('u-1', {
          anioEscolar: anioEscolarVigente(new Date().getFullYear()),
          url: URL_VALIDA,
        }),
      ).resolves.toBeDefined();
    });

    it('acepta el ano de puesta en marcha', async () => {
      const { service, prisma } = montar();
      conDocente(prisma);
      prisma.carpetaPedagogica.upsert.mockResolvedValue(carpetaFila() as never);

      await expect(
        service.guardarPropia('u-1', { anioEscolar: ANIO_ESCOLAR_INICIAL, url: URL_VALIDA }),
      ).resolves.toBeDefined();
    });

    it('recorta los espacios que deja un copiar y pegar', async () => {
      const { service, prisma } = montar();
      conDocente(prisma);
      prisma.carpetaPedagogica.upsert.mockResolvedValue(carpetaFila() as never);

      await service.guardarPropia('u-1', { anioEscolar: 2026, url: `  ${URL_VALIDA}  ` });

      const args = prisma.carpetaPedagogica.upsert.mock.calls[0]?.[0] as {
        create: { url: string };
      };
      expect(args.create.url).toBe(URL_VALIDA);
    });

    it('registra quién dejó el enlace, para trazabilidad', async () => {
      const { service, prisma } = montar();
      conDocente(prisma);
      prisma.carpetaPedagogica.upsert.mockResolvedValue(carpetaFila() as never);

      await service.guardarPropia('u-autor', { anioEscolar: 2026, url: URL_VALIDA });

      const args = prisma.carpetaPedagogica.upsert.mock.calls[0]?.[0] as {
        create: { actualizadoPorId: string };
        update: { actualizadoPorId: string };
      };
      expect(args.create.actualizadoPorId).toBe('u-autor');
      expect(args.update.actualizadoPorId).toBe('u-autor');
    });
  });

  describe('obtenerPropia', () => {
    it('devuelve null cuando el docente todavía no registró enlace', async () => {
      // Ausencia esperada, no error: el año recién empieza.
      const { service, prisma } = montar();
      conDocente(prisma);
      prisma.carpetaPedagogica.findUnique.mockResolvedValue(null as never);

      await expect(service.obtenerPropia('u-1', 2026)).resolves.toEqual({ carpeta: null });
    });

    it('expone el nombre de quien actualizó y no su identificador', async () => {
      const { service, prisma } = montar();
      conDocente(prisma);
      prisma.carpetaPedagogica.findUnique.mockResolvedValue(carpetaFila() as never);

      const { carpeta } = await service.obtenerPropia('u-1', 2026);

      expect(carpeta?.actualizadoPor).toBe('Ana Quispe');
    });
  });

  describe('obtenerDeDocente', () => {
    it('rechaza un docente inexistente', async () => {
      const { service, prisma } = montar();
      prisma.docente.findUnique.mockResolvedValue(null as never);

      await expect(service.obtenerDeDocente('doc-x', 2026)).rejects.toThrow(NotFoundException);
    });

    it('devuelve el enlace del año pedido', async () => {
      const { service, prisma } = montar();
      prisma.docente.findUnique.mockResolvedValue({ id: 'doc-1' } as never);
      prisma.carpetaPedagogica.findUnique.mockResolvedValue(carpetaFila() as never);

      const { carpeta } = await service.obtenerDeDocente('doc-1', 2026);

      expect(carpeta?.url).toBe(URL_VALIDA);
    });
  });

  describe('eliminarPropia', () => {
    it('borra sólo la carpeta del docente de la sesión', async () => {
      const { service, prisma } = montar();
      conDocente(prisma, 'doc-de-la-sesion');
      prisma.carpetaPedagogica.deleteMany.mockResolvedValue({ count: 1 } as never);

      await service.eliminarPropia('u-1', 2026);

      expect(prisma.carpetaPedagogica.deleteMany).toHaveBeenCalledWith({
        where: { docenteId: 'doc-de-la-sesion', anioEscolar: 2026 },
      });
    });
  });
});
