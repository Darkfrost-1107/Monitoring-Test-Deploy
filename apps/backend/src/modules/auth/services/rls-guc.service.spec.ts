import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { RlsGucService } from './rls-guc.service.js';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';

/**
 * Pruebas del contexto de seguridad a nivel de fila.
 *
 * Las políticas viven en las migraciones y su aislamiento se comprueba contra
 * Postgres real en `test/rls.e2e-spec.ts`. Lo que se prueba acá es lo otro: que
 * el sistema **avise** cuando esas políticas no están en efecto.
 *
 * Postgres ignora toda política para un rol con `BYPASSRLS` —lo que incluye a
 * cualquier superusuario—. Con `DATABASE_URL` apuntando a `admin`, las tres
 * tablas con RLS quedan sin protección y nada lo dice: los GUC se establecen
 * correctamente y ninguna política los consulta.
 */

describe('RlsGucService', () => {
  let service: RlsGucService;
  let prisma: { $executeRawUnsafe: jest.Mock; $queryRawUnsafe: jest.Mock };
  let advertencias: string[];
  let errores: string[];

  beforeEach(async () => {
    advertencias = [];
    errores = [];

    prisma = {
      $executeRawUnsafe: jest.fn(() => Promise.resolve(1)),
      $queryRawUnsafe: jest.fn(() =>
        Promise.resolve([{ usuario: 'monitoreo_app', evita_rls: false }]),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [RlsGucService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(RlsGucService);

    jest.spyOn(service['logger'], 'warn').mockImplementation(((m: string) => {
      advertencias.push(m);
    }) as never);
    jest.spyOn(service['logger'], 'error').mockImplementation(((m: string) => {
      errores.push(m);
    }) as never);
  });

  describe('setSessionGucs', () => {
    it('establece el usuario, el rol y la institución', async () => {
      await service.setSessionGucs('u-1', 'especialista', 'ie-1');

      const [[, ...valores]] = prisma.$executeRawUnsafe.mock.calls as [[string, ...string[]]];
      expect(valores).toEqual(['u-1', 'especialista', 'ie-1']);
    });

    /**
     * El personal de UGEL no pertenece a una institución. `set_config` no acepta
     * `undefined`, y la política lo trata como «sin institución».
     */
    it('sin institución envía cadena vacía', async () => {
      await service.setSessionGucs('u-1', 'jefe_gestion', '');

      const [[, , , institucion]] = prisma.$executeRawUnsafe.mock.calls as [
        [string, string, string, string],
      ];
      expect(institucion).toBe('');
    });

    /**
     * Si el establecimiento falla, la petición sigue y las políticas ven los GUC
     * vacíos. Eso devuelve **cero filas**, no todas: la degradación es hacia no
     * ver nada, que es el lado correcto. Se registra para poder diagnosticarlo.
     */
    it('un fallo no interrumpe la petición, pero queda registrado', async () => {
      prisma.$executeRawUnsafe.mockRejectedValue(new Error('conexión caída') as never);

      await expect(service.setSessionGucs('u-1', 'especialista', 'ie-1')).resolves.toBeUndefined();
      expect(advertencias.join(' ')).toContain('RLS');
    });
  });

  describe('comprobarQueRlsEsteEnEfecto', () => {
    it('no dice nada cuando el rol de conexión no evita RLS', async () => {
      await service.comprobarQueRlsEsteEnEfecto();

      expect(advertencias).toEqual([]);
      expect(errores).toEqual([]);
    });

    /**
     * Éste es el caso que motivó la comprobación: `DATABASE_URL` apuntando a un
     * superusuario deja las tres tablas con RLS sin protección, y hasta ahora
     * nada lo decía. `prisma/setup.sql` crea el rol sin privilegios para esto.
     */
    it('avisa cuando el rol de conexión evita RLS', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([{ usuario: 'admin', evita_rls: true }] as never);

      await service.comprobarQueRlsEsteEnEfecto();

      const dicho = errores.join(' ');
      expect(dicho).toContain('admin');
      expect(dicho).toContain('setup.sql');
    });

    it('nombra el rol con el que se está conectando', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([{ usuario: 'postgres', evita_rls: true }] as never);

      await service.comprobarQueRlsEsteEnEfecto();
      expect(errores.join(' ')).toContain('postgres');
    });

    /**
     * La comprobación es un diagnóstico: que no se pueda hacer no debe impedir
     * que la aplicación arranque.
     */
    it('no interrumpe el arranque si no se puede comprobar', async () => {
      prisma.$queryRawUnsafe.mockRejectedValue(new Error('sin conexión') as never);

      await expect(service.comprobarQueRlsEsteEnEfecto()).resolves.toBeUndefined();
      expect(advertencias.join(' ')).toContain('comprobar');
    });
  });
});
