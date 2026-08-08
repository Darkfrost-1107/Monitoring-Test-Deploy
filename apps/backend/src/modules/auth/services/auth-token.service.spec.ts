import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthTokenService, type AuthUserWithRelations } from './auth-token.service.js';
import { RoleCode } from '../../../common/enums/role.enum.js';

/**
 * Pruebas de caracterización de la carga útil del token de acceso.
 *
 * `modules/auth` no tenía ninguna prueba, y es donde se arman los tres
 * identificadores —`especialista_id`, `docente_id`, `institucion_id`— sobre los
 * que descansa toda la autorización del cliente desde que se retiró la
 * comparación por nombre. Esto fija lo que hace hoy, que es la condición para
 * poder cambiarlo después sin adivinar.
 */

/** Persona mínima; cada prueba agrega el registro que le interesa. */
const usuario = (over: Record<string, unknown> = {}): AuthUserWithRelations =>
  ({
    id: 'u-1',
    isFirstLogin: false,
    rol: { codigo: RoleCode.ESPECIALISTA },
    persona: {
      dni: '12345678',
      nombres: 'Ana',
      apellidos: 'Torres',
      docente: null,
      especialista: null,
    },
    ...over,
  }) as unknown as AuthUserWithRelations;

const conDocente = (docente: Record<string, unknown>) =>
  usuario({
    persona: {
      dni: '12345678',
      nombres: 'Ana',
      apellidos: 'Torres',
      especialista: null,
      docente: { docenteCargos: [], ...docente },
    },
  });

const conEspecialista = (especialista: Record<string, unknown>) =>
  usuario({
    persona: {
      dni: '12345678',
      nombres: 'Ana',
      apellidos: 'Torres',
      docente: null,
      especialista: { cargos: [], ...especialista },
    },
  });

describe('AuthTokenService.buildJwtPayload', () => {
  let service: AuthTokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthTokenService,
        {
          provide: JwtService,
          useValue: { sign: jest.fn(), decode: jest.fn(), verify: jest.fn() },
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get(AuthTokenService);
  });

  describe('identidad básica', () => {
    it('lleva el usuario, su DNI y su nombre', () => {
      const payload = service.buildJwtPayload(usuario());

      expect(payload).toMatchObject({
        sub: 'u-1',
        dni: '12345678',
        nombres: 'Ana',
        apellidos: 'Torres',
        role: RoleCode.ESPECIALISTA,
      });
    });

    it('declara si es el primer ingreso', () => {
      expect(service.buildJwtPayload(usuario({ isFirstLogin: true })).firstLogin).toBe(true);
    });

    /**
     * `Role.codigo` es una columna de texto libre. Un código fuera del contrato
     * producía antes un usuario sin capacidades y una carga útil que el
     * frontend rechazaba al parsear: dos fallos tardíos en lugar de uno
     * inmediato.
     */
    it('rechaza un rol que no pertenece al contrato', () => {
      const conRolInventado = usuario({ rol: { codigo: 'rol_inventado' } });

      expect(() => service.buildJwtPayload(conRolInventado)).toThrow(UnauthorizedException);
    });
  });

  describe('identificador de docente', () => {
    it('lo lleva cuando la persona tiene registro docente', () => {
      const payload = service.buildJwtPayload(
        conDocente({ id: 'doc-1', institucionId: 'ie-1', institucion: null }),
      );

      expect(payload.docente_id).toBe('doc-1');
    });

    /**
     * Sin registro docente el claim no viaja. El cliente lo usa para reconocer
     * las visitas que lo evalúan a él: que falte tiene que ser distinguible de
     * que valga otra cosa.
     */
    it('no lo inventa cuando la persona no es docente', () => {
      expect(service.buildJwtPayload(usuario()).docente_id).toBeUndefined();
    });
  });

  describe('institución', () => {
    it('sale del registro docente, no del especialista', () => {
      const payload = service.buildJwtPayload(
        conDocente({
          id: 'doc-1',
          institucionId: 'ie-7',
          institucion: { nombre: 'IE 70001', nivelEducativo: 'Primaria' },
        }),
      );

      expect(payload.institucion_id).toBe('ie-7');
      expect(payload.colegio_id).toBe('ie-7');
      expect(payload.colegio_nombre).toBe('IE 70001');
      expect(payload.colegio_nivel).toBe('Primaria');
    });

    /**
     * El personal de UGEL no pertenece a una institución educativa: el claim
     * queda ausente y por eso `cronogramasVisibles` no lo acota por colegio.
     */
    it('el especialista de UGEL no tiene institución', () => {
      const payload = service.buildJwtPayload(
        conEspecialista({ id: 'esp-1', nivelEducativo: 'Primaria', modalidad: 'EBR' }),
      );

      expect(payload.institucion_id).toBeUndefined();
      expect(payload.colegio_id).toBeUndefined();
    });

    it('un docente sin institución asignada no la lleva', () => {
      const payload = service.buildJwtPayload(
        conDocente({ id: 'doc-1', institucionId: null, institucion: null }),
      );

      expect(payload.institucion_id).toBeUndefined();
    });
  });

  describe('identificador de especialista', () => {
    it('lo lleva con su nivel y modalidad', () => {
      const payload = service.buildJwtPayload(
        conEspecialista({ id: 'esp-9', nivelEducativo: 'Secundaria', modalidad: 'EBR' }),
      );

      expect(payload.especialista_id).toBe('esp-9');
      expect(payload.especialista_nivel).toBe('Secundaria');
      expect(payload.especialista_modalidad).toBe('EBR');
    });

    /**
     * Sin este claim el cliente no puede reconocer las visitas que tiene
     * asignadas, y desde que se retiró el respaldo por nombre no ve ninguna.
     */
    it('no lo inventa cuando la persona no es especialista', () => {
      expect(service.buildJwtPayload(usuario()).especialista_id).toBeUndefined();
    });

    it('lleva los nombres de sus especialidades', () => {
      const payload = service.buildJwtPayload(
        conEspecialista({
          id: 'esp-1',
          nivelEducativo: 'Secundaria',
          modalidad: 'EBR',
          especialidades: [
            { especialidad: { nombre: 'Matemática' } },
            { especialidad: { nombre: 'Física' } },
          ],
        }),
      );

      expect(payload.especialista_especialidades).toEqual(['Matemática', 'Física']);
    });

    it('sin especialidades cargadas el claim queda ausente', () => {
      const payload = service.buildJwtPayload(
        conEspecialista({ id: 'esp-1', nivelEducativo: 'Primaria', modalidad: null }),
      );

      expect(payload.especialista_especialidades).toBeUndefined();
      expect(payload.especialista_modalidad).toBeUndefined();
    });
  });

  /**
   * Quien dirige o coordina en una I.E. figura en las dos tablas. La
   * programación de visitas depende de que los dos identificadores viajen: el
   * de docente lo identifica como evaluado y el de especialista como evaluador.
   */
  describe('persona con los dos registros', () => {
    const director = usuario({
      rol: { codigo: RoleCode.DIRECTOR_INSTITUCION },
      persona: {
        dni: '22222222',
        nombres: 'Rosa',
        apellidos: 'Mamani',
        docente: {
          id: 'doc-dir',
          institucionId: 'ie-1',
          institucion: { nombre: 'IE 70001', nivelEducativo: 'Secundaria' },
          docenteCargos: [],
        },
        especialista: { id: 'esp-dir', nivelEducativo: 'Secundaria', modalidad: 'EBR', cargos: [] },
      },
    });

    it('lleva los dos identificadores y la institución', () => {
      const payload = service.buildJwtPayload(director);

      expect(payload.docente_id).toBe('doc-dir');
      expect(payload.especialista_id).toBe('esp-dir');
      expect(payload.institucion_id).toBe('ie-1');
    });
  });

  describe('capacidades', () => {
    it('siempre viajan, aunque sea una lista', () => {
      expect(Array.isArray(service.buildJwtPayload(usuario()).permissions)).toBe(true);
    });

    it('el rol de mayor alcance no tiene menos capacidades que el especialista', () => {
      const especialista = service.buildJwtPayload(usuario()).permissions ?? [];
      const jefe =
        service.buildJwtPayload(usuario({ rol: { codigo: RoleCode.JEFE_GESTION } })).permissions ??
        [];

      expect(jefe.length).toBeGreaterThanOrEqual(especialista.length);
    });
  });
});
