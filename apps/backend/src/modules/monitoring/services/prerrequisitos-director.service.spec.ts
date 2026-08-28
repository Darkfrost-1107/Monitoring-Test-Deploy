import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { RoleCode } from '../../../common/enums/role.enum.js';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { PrerrequisitosDirectorService } from './prerrequisitos-director.service.js';

/**
 * El servicio consulta el plan del director. Estas pruebas fijan la decisión de
 * bloquear/dejar pasar; la regla del «quién» y del «qué falta» está en el helper
 * puro.
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

  const conPlan = (tienePlan: boolean) => {
    planFindFirst.mockResolvedValue(tienePlan ? { id: 'plan-1' } : null);
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

  it('deja pasar al coordinador cuando el director tiene su plan', async () => {
    conPlan(true);
    await expect(service.asegurar(coordinador)).resolves.toBeUndefined();
  });

  it('bloquea si falta el plan del director', async () => {
    conPlan(false);
    await expect(service.asegurar(coordinador)).rejects.toThrow(ForbiddenException);
  });

  it('bloquea al Jefe de Taller con las mismas reglas', async () => {
    conPlan(false);
    await expect(
      service.asegurar({ id: 'u-jt', role: RoleCode.JEFE_TALLER, institucionId: 'ie-1' }),
    ).rejects.toThrow(ForbiddenException);
  });

  /**
   * El director puede no crear plantilla en todo el año: las fichas obligatorias
   * son las de la UGEL y una propia sólo nace de una solicitud aprobada. Exigir
   * la suya dejaba al coordinador esperando algo que nunca iba a llegar, con su
   * cupo ya autorizado por la Jefatura.
   */
  it('deja pasar aunque el director no tenga ninguna plantilla', async () => {
    conPlan(true);
    plantillaFindFirst.mockResolvedValue(null);

    await expect(service.asegurar(coordinador)).resolves.toBeUndefined();
    expect(plantillaFindFirst).not.toHaveBeenCalled();
  });

  /** El director es quien cumple la regla: no se consulta nada para él. */
  it('no bloquea ni consulta para el Director de I.E.', async () => {
    await service.asegurar({
      id: 'u-dir',
      role: RoleCode.DIRECTOR_INSTITUCION,
      institucionId: 'ie-1',
    });
    expect(planFindFirst).not.toHaveBeenCalled();
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
   * Sólo el plan DEL DIRECTOR abre la puerta: la consulta filtra por
   * `rolAutorAlCrear: 'director_ie'`, de modo que el plan del propio coordinador
   * no se cuenta.
   */
  it('consulta el plan del director para la institucion y el ano', async () => {
    conPlan(true);
    await service.asegurar(coordinador);

    expect(planFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          institucionId: 'ie-1',
          anioAcademico: new Date().getFullYear(),
          rolAutorAlCrear: 'director_ie',
          estado: 'Activo',
        }),
      }),
    );
  });
});
