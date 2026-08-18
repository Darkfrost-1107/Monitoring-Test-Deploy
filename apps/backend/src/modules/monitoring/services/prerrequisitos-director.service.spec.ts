import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { RoleCode } from '../../../common/enums/role.enum.js';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { PrerrequisitosDirectorService } from './prerrequisitos-director.service.js';

/**
 * El servicio consulta los dos artefactos del director. Estas pruebas fijan la
 * decisión de bloquear/dejar pasar; la regla del «quién» y del «qué falta» está
 * en el helper puro.
 */
describe('PrerrequisitosDirectorService', () => {
  let service: PrerrequisitosDirectorService;
  let planFindFirst: jest.Mock<any>;
  let plantillaFindFirst: jest.Mock<any>;

  const coordinador = {
    id: 'u-coord',
    role: RoleCode.COORDINADOR_PEDAGOGICO,
    institucionId: 'ie-1',
  };

  const conArtefactos = (tienePlan: boolean, tienePlantilla: boolean) => {
    planFindFirst.mockResolvedValue(tienePlan ? { id: 'plan-1' } : null);
    plantillaFindFirst.mockResolvedValue(tienePlantilla ? { id: 'plantilla-1' } : null);
  };

  beforeEach(async () => {
    planFindFirst = jest.fn<any>();
    plantillaFindFirst = jest.fn<any>();
    const prisma = {
      planMonitoreo: { findFirst: planFindFirst },
      plantillaMonitoreo: { findFirst: plantillaFindFirst },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [PrerrequisitosDirectorService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(PrerrequisitosDirectorService);
  });

  it('deja pasar al coordinador cuando el director tiene plan y plantilla', async () => {
    conArtefactos(true, true);
    await expect(service.asegurar(coordinador)).resolves.toBeUndefined();
  });

  it('bloquea si falta el plan del director', async () => {
    conArtefactos(false, true);
    await expect(service.asegurar(coordinador)).rejects.toThrow(ForbiddenException);
  });

  it('bloquea si falta la plantilla del director', async () => {
    conArtefactos(true, false);
    await expect(service.asegurar(coordinador)).rejects.toThrow(ForbiddenException);
  });

  it('bloquea al Jefe de Taller con las mismas reglas', async () => {
    conArtefactos(true, false);
    await expect(
      service.asegurar({ id: 'u-jt', role: RoleCode.JEFE_TALLER, institucionId: 'ie-1' }),
    ).rejects.toThrow(ForbiddenException);
  });

  /** El director es quien cumple la regla: no se consulta nada para él. */
  it('no bloquea ni consulta para el Director de I.E.', async () => {
    await service.asegurar({
      id: 'u-dir',
      role: RoleCode.DIRECTOR_INSTITUCION,
      institucionId: 'ie-1',
    });
    expect(planFindFirst).not.toHaveBeenCalled();
    expect(plantillaFindFirst).not.toHaveBeenCalled();
  });

  it('no bloquea ni consulta para la UGEL', async () => {
    await service.asegurar({ id: 'u-jg', role: RoleCode.JEFE_GESTION });
    expect(planFindFirst).not.toHaveBeenCalled();
  });

  /** Sin institución en el token no hay contra qué comprobar: no se bloquea. */
  it('no bloquea al coordinador sin institucion en sesion', async () => {
    await expect(
      service.asegurar({ id: 'u', role: RoleCode.COORDINADOR_PEDAGOGICO }),
    ).resolves.toBeUndefined();
    expect(planFindFirst).not.toHaveBeenCalled();
  });

  /**
   * Sólo el artefacto DEL DIRECTOR abre la puerta: la consulta filtra por
   * `rolAutorAlCrear: 'director_ie'`, de modo que el plan del propio coordinador
   * no se cuenta.
   */
  it('consulta el plan y la plantilla del director para la institucion y el ano', async () => {
    conArtefactos(true, true);
    await service.asegurar(coordinador);

    const anio = new Date().getFullYear();
    expect(planFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          institucionId: 'ie-1',
          anioAcademico: anio,
          rolAutorAlCrear: 'director_ie',
          estado: 'Activo',
        }),
      }),
    );
    expect(plantillaFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          rolAutorAlCrear: 'director_ie',
          estado: 'Vigente',
        }),
      }),
    );
  });
});
