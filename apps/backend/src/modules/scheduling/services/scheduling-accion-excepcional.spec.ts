import { jest } from '@jest/globals';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Capability } from '@sistema-monitoreo/shared-contracts';
import { RoleCode } from '../../../common/enums/role.enum.js';
import type { SessionUser } from '../../../shared/types/session-user.js';
import type { StorageService } from '../../../shared/storage/storage.constants.js';
import type { CronogramaRepository, IVisita } from '../repositories/cronograma.repository.js';
import {
  ejecutarAccionExcepcional,
  findOperacionExcepcionalByCronograma,
} from './scheduling-accion-excepcional.helper.js';

describe('scheduling-accion-excepcional.helper', () => {
  let cronogramaRepo: jest.Mocked<CronogramaRepository>;
  let storage: jest.Mocked<StorageService>;

  const sesionJefe: SessionUser = {
    id: 'user-jefe',
    role: RoleCode.JEFE_GESTION,
    capabilities: [Capability.MONITOREO_ACCION_EXCEPCIONAL],
  };

  const sesionSuper: SessionUser = {
    id: 'user-super',
    role: RoleCode.SUPERUSUARIO,
    capabilities: [Capability.MONITOREO_ACCION_EXCEPCIONAL],
  };

  const sesionDirector: SessionUser = {
    id: 'user-dir',
    role: RoleCode.DIRECTOR_INSTITUCION,
    institucionId: 'ie-1',
    capabilities: [],
  };

  const sesionEspecialista: SessionUser = {
    id: 'user-esp',
    role: RoleCode.ESPECIALISTA,
    capabilities: [],
  };

  const mockCronograma: IVisita = {
    id: 'cron-1',
    planId: 'plan-1',
    monitorId: 'esp-1',
    institucionId: 'ie-1',
    evaluadoId: 'doc-1',
    tipoMonitoreo: 'DOCENTE',
    numeroVisita: 1,
    fechaProgramada: '2026-04-10',
    horaInicio: '08:00:00',
    estado: 'COMPLETADO',
    modalidad: 'EBR',
    nivelEducativo: 'Secundaria',
    detalles: null,
    creadoPorId: 'user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    cronogramaRepo = {
      findById: jest.fn<any>().mockResolvedValue(mockCronograma),
      ejecutarAccionExcepcional: jest.fn<any>().mockResolvedValue({
        id: 'op-1',
        cronogramaId: 'cron-1',
        fichaId: 'ficha-1',
        tipoAccion: 'ANULACION_TOTAL',
        numeroExpediente: 'EXP-2026-001',
        motivo: 'Evaluación realizada a docente equivocado por error de digitación.',
        archivoSustentoUrl: '/storage/sustento.pdf',
        ejecutadoPorId: 'user-jefe',
        createdAt: new Date().toISOString(),
      }),
      findOperacionExcepcionalByCronograma: jest.fn<any>().mockResolvedValue(null),
    } as unknown as jest.Mocked<CronogramaRepository>;

    storage = {
      savePdf: jest.fn<any>().mockResolvedValue({
        url: '/storage/sustento.pdf',
        filename: 'sustento.pdf',
        size: 1024,
        mimeType: 'application/pdf',
      }),
      delete: jest.fn<any>().mockResolvedValue(undefined),
      getPublicUrl: jest.fn<any>().mockReturnValue('/storage/sustento.pdf'),
      resolveAbsolutePath: jest.fn<any>().mockReturnValue('/abs/sustento.pdf'),
    };
  });

  describe('Autorización', () => {
    it('rechaza con ForbiddenException si el usuario es Director de IE', async () => {
      await expect(
        ejecutarAccionExcepcional(
          cronogramaRepo,
          storage,
          'cron-1',
          {
            tipoAccion: 'ANULACION_TOTAL',
            numeroExpediente: 'OFICIO-123',
            motivo: 'Motivo de prueba con más de diez caracteres',
            archivoSustentoBase64: 'JVBERi0xLjQK...',
          },
          sesionDirector,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza con ForbiddenException si el usuario es Especialista ordinario', async () => {
      await expect(
        ejecutarAccionExcepcional(
          cronogramaRepo,
          storage,
          'cron-1',
          {
            tipoAccion: 'ANULACION_TOTAL',
            numeroExpediente: 'OFICIO-123',
            motivo: 'Motivo de prueba con más de diez caracteres',
            archivoSustentoBase64: 'JVBERi0xLjQK...',
          },
          sesionEspecialista,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permite ejecutar si el usuario es Jefe de Gestión', async () => {
      const res = await ejecutarAccionExcepcional(
        cronogramaRepo,
        storage,
        'cron-1',
        {
          tipoAccion: 'ANULACION_TOTAL',
          numeroExpediente: 'EXP-2026-001',
          motivo: 'Evaluación realizada a docente equivocado por error de digitación.',
          archivoSustentoBase64: 'JVBERi0xLjQK...',
        },
        sesionJefe,
      );

      expect(res.id).toBe('op-1');
      expect(cronogramaRepo.ejecutarAccionExcepcional).toHaveBeenCalledTimes(1);
    });

    it('permite ejecutar si el usuario es Superusuario', async () => {
      const res = await ejecutarAccionExcepcional(
        cronogramaRepo,
        storage,
        'cron-1',
        {
          tipoAccion: 'ANULACION_TOTAL',
          numeroExpediente: 'EXP-2026-001',
          motivo: 'Evaluación realizada a docente equivocado por error de digitación.',
          archivoSustentoBase64: 'JVBERi0xLjQK...',
        },
        sesionSuper,
      );

      expect(res.id).toBe('op-1');
    });
  });

  describe('Validaciones de negocio', () => {
    it('lanza NotFoundException si el cronograma no existe', async () => {
      cronogramaRepo.findById.mockResolvedValue(null);

      await expect(
        ejecutarAccionExcepcional(
          cronogramaRepo,
          storage,
          'cron-inexistente',
          {
            tipoAccion: 'ANULACION_TOTAL',
            numeroExpediente: 'EXP-2026-001',
            motivo: 'Motivo explicativo mayor a diez caracteres',
            archivoSustentoBase64: 'JVBERi0xLjQK...',
          },
          sesionJefe,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza si es ANULACION_TOTAL y la visita ya estaba ANULADA', async () => {
      cronogramaRepo.findById.mockResolvedValue({
        ...mockCronograma,
        estado: 'ANULADO',
      });

      await expect(
        ejecutarAccionExcepcional(
          cronogramaRepo,
          storage,
          'cron-1',
          {
            tipoAccion: 'ANULACION_TOTAL',
            numeroExpediente: 'EXP-2026-001',
            motivo: 'Motivo explicativo mayor a diez caracteres',
            archivoSustentoBase64: 'JVBERi0xLjQK...',
          },
          sesionJefe,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza si es REAPERTURA_FICHA y la visita ya estaba PROGRAMADA', async () => {
      cronogramaRepo.findById.mockResolvedValue({
        ...mockCronograma,
        estado: 'PROGRAMADO',
      });

      await expect(
        ejecutarAccionExcepcional(
          cronogramaRepo,
          storage,
          'cron-1',
          {
            tipoAccion: 'REAPERTURA_FICHA',
            numeroExpediente: 'EXP-2026-001',
            motivo: 'Motivo explicativo mayor a diez caracteres',
            archivoSustentoBase64: 'JVBERi0xLjQK...',
          },
          sesionJefe,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Guardado de archivo y persistencia', () => {
    it('guarda el archivo en el bucket sustentos-excepcionales', async () => {
      await ejecutarAccionExcepcional(
        cronogramaRepo,
        storage,
        'cron-1',
        {
          tipoAccion: 'ANULACION_TOTAL',
          numeroExpediente: 'OFICIO-999',
          motivo: 'Error comprobado con oficio formal de direccion',
          archivoSustentoBase64: 'QUJD',
          archivoSustentoNombre: 'oficio.pdf',
        },
        sesionJefe,
      );

      expect(storage.savePdf).toHaveBeenCalledWith(
        'sustentos-excepcionales',
        'oficio.pdf',
        expect.any(Buffer),
      );
      expect(cronogramaRepo.ejecutarAccionExcepcional).toHaveBeenCalledWith(
        expect.objectContaining({
          archivoSustentoUrl: '/storage/sustento.pdf',
          numeroExpediente: 'OFICIO-999',
          tipoAccion: 'ANULACION_TOTAL',
        }),
      );
    });

    it('ejecuta reapertura de ficha correctamente', async () => {
      await ejecutarAccionExcepcional(
        cronogramaRepo,
        storage,
        'cron-1',
        {
          tipoAccion: 'REAPERTURA_FICHA',
          numeroExpediente: 'OFICIO-888',
          motivo: 'Reapertura para corrección de rúbrica solicitada por IE',
          archivoSustentoBase64: 'QUJD',
        },
        sesionJefe,
      );

      expect(cronogramaRepo.ejecutarAccionExcepcional).toHaveBeenCalledWith(
        expect.objectContaining({
          tipoAccion: 'REAPERTURA_FICHA',
          numeroExpediente: 'OFICIO-888',
        }),
      );
    });
  });

  describe('findOperacionExcepcionalByCronograma', () => {
    it('devuelve el sustento de la operacion cuando existe', async () => {
      const mockOp = {
        id: 'op-1',
        cronogramaId: 'cron-1',
        fichaId: null,
        tipoAccion: 'ANULACION_TOTAL' as const,
        numeroExpediente: 'OFICIO-123',
        motivo: 'Anulacion formal',
        archivoSustentoUrl: '/storage/sustento.pdf',
        ejecutadoPorId: 'user-jefe',
        createdAt: '2026-05-01T10:00:00Z',
      };
      cronogramaRepo.findOperacionExcepcionalByCronograma.mockResolvedValue(mockOp);

      const res = await findOperacionExcepcionalByCronograma(cronogramaRepo, 'cron-1', sesionJefe);
      expect(res).toEqual(mockOp);
    });

    it('devuelve null si no hubo operacion excepcional', async () => {
      cronogramaRepo.findOperacionExcepcionalByCronograma.mockResolvedValue(null);

      const res = await findOperacionExcepcionalByCronograma(cronogramaRepo, 'cron-1', sesionJefe);
      expect(res).toBeNull();
    });
  });
});
