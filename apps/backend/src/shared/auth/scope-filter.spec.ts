import { Test, TestingModule } from '@nestjs/testing';
import { ScopeFilter, ScopeContext } from './scope-filter.js';
import { RoleCode } from '../../common/enums/role.enum.js';

describe('ScopeFilter', () => {
  let filter: ScopeFilter;

  const ctx = (overrides: Partial<ScopeContext>): ScopeContext => ({
    userId: 'u-1',
    role: RoleCode.DOCENTE,
    institucionId: 'ie-1',
    especialistaNivel: null,
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScopeFilter],
    }).compile();
    filter = module.get<ScopeFilter>(ScopeFilter);
  });

  // ── Predicados ──────────────────────────────────────────────────────

  describe('isAllScope', () => {
    it('true para jefe_gestion, director_ugel, invitado', () => {
      expect(filter.isAllScope(RoleCode.JEFE_GESTION)).toBe(true);
      expect(filter.isAllScope(RoleCode.DIRECTOR_UGEL)).toBe(true);
      expect(filter.isAllScope(RoleCode.INVITADO)).toBe(true);
    });

    it('false para el resto', () => {
      expect(filter.isAllScope(RoleCode.ESPECIALISTA)).toBe(false);
      expect(filter.isAllScope(RoleCode.DIRECTOR_INSTITUCION)).toBe(false);
      expect(filter.isAllScope(RoleCode.JEFE_AREA)).toBe(false);
      expect(filter.isAllScope(RoleCode.DOCENTE)).toBe(false);
    });
  });

  describe('isInstitucionScope', () => {
    it('true para director_institucion, coord_pedagogico, jefe_taller', () => {
      expect(filter.isInstitucionScope(RoleCode.DIRECTOR_INSTITUCION)).toBe(true);
      expect(filter.isInstitucionScope(RoleCode.COORDINADOR_PEDAGOGICO)).toBe(true);
      expect(filter.isInstitucionScope(RoleCode.JEFE_TALLER)).toBe(true);
    });

    it('false para el resto', () => {
      expect(filter.isInstitucionScope(RoleCode.JEFE_GESTION)).toBe(false);
      expect(filter.isInstitucionScope(RoleCode.ESPECIALISTA)).toBe(false);
      expect(filter.isInstitucionScope(RoleCode.DOCENTE)).toBe(false);
    });
  });

  // ── forCronograma ────────────────────────────────────────────────────

  describe('forCronograma', () => {
    it('ALL: empty filter', () => {
      expect(filter.forCronograma(ctx({ role: RoleCode.JEFE_GESTION }))).toEqual({});
    });

    it('INSTITUCION: filter por institucionId', () => {
      expect(
        filter.forCronograma(ctx({ role: RoleCode.DIRECTOR_INSTITUCION, institucionId: 'ie-42' })),
      ).toEqual({ institucionId: 'ie-42' });
    });

    it('INSTITUCION sin institucionId: filtro sentinela (no matchea nada)', () => {
      expect(
        filter.forCronograma(ctx({ role: RoleCode.DIRECTOR_INSTITUCION, institucionId: null })),
      ).toEqual({ id: { in: [] } });
    });

    it('MONITOR: filter por monitorId == userId', () => {
      expect(filter.forCronograma(ctx({ role: RoleCode.ESPECIALISTA, userId: 'esp-99' }))).toEqual({
        monitorId: 'esp-99',
      });
    });

    it('JEFE_AREA: filter por nivel educativo en la IE del cronograma', () => {
      expect(
        filter.forCronograma(ctx({ role: RoleCode.JEFE_AREA, especialistaNivel: 'Primaria' })),
      ).toEqual({
        institucion: {
          modalidad: 'EBR',
          nivelEducativo: { equals: 'Primaria', mode: 'insensitive' },
        },
      });
    });

    it('DOCENTE: filter por evaluado.persona.usuario.id', () => {
      expect(filter.forCronograma(ctx({ role: RoleCode.DOCENTE, userId: 'user-doc' }))).toEqual({
        evaluado: {
          persona: {
            usuario: {
              id: 'user-doc',
            },
          },
        },
      });
    });
  });

  // ── forFicha ─────────────────────────────────────────────────────────

  describe('limitaAlAnalisisPropio', () => {
    it.each([RoleCode.COORDINADOR_PEDAGOGICO, RoleCode.JEFE_TALLER])(
      '%s: en el análisis sólo ve lo que él mismo monitoreó',
      (role) => {
        expect(filter.limitaAlAnalisisPropio(role)).toBe(true);
      },
    );

    it.each([
      RoleCode.DIRECTOR_INSTITUCION,
      RoleCode.ESPECIALISTA,
      RoleCode.JEFE_AREA,
      RoleCode.JEFE_GESTION,
      RoleCode.DIRECTOR_UGEL,
      RoleCode.DOCENTE,
      RoleCode.INVITADO,
    ])('%s: no se limita a lo propio (su alcance es otro)', (role) => {
      expect(filter.limitaAlAnalisisPropio(role)).toBe(false);
    });
  });

  describe('forFichasQueMonitoreo', () => {
    it('filtra por el usuario del monitor, no por el id de la ficha ni de la institución', () => {
      expect(
        filter.forFichasQueMonitoreo(
          ctx({ role: RoleCode.COORDINADOR_PEDAGOGICO, userId: 'u-co' }),
        ),
      ).toEqual({ cronograma: { monitor: { persona: { usuario: { id: 'u-co' } } } } });
    });
  });

  describe('forFicha', () => {
    it('MONITOR (especialista): filter por creadoPorId', () => {
      expect(filter.forFicha(ctx({ role: RoleCode.ESPECIALISTA, userId: 'esp-7' }))).toEqual({
        creadoPorId: 'esp-7',
      });
    });

    it('INSTITUCION: filter via cronograma.institucionId', () => {
      expect(
        filter.forFicha(ctx({ role: RoleCode.COORDINADOR_PEDAGOGICO, institucionId: 'ie-x' })),
      ).toEqual({ cronograma: { institucionId: 'ie-x' } });
    });

    it('JEFE_AREA: filtra por el nivel monitoreado del cronograma (no el del monitor)', () => {
      expect(
        filter.forFicha(ctx({ role: RoleCode.JEFE_AREA, especialistaNivel: 'Secundaria' })),
      ).toEqual({ cronograma: { nivelEducativo: 'Secundaria' } });
    });

    it('JEFE_AREA sin nivel: sentinela (no matchea nada)', () => {
      expect(filter.forFicha(ctx({ role: RoleCode.JEFE_AREA, especialistaNivel: null }))).toEqual({
        cronograma: { nivelEducativo: '__none__' },
      });
    });

    it('DOCENTE: filter por cronograma.evaluado.persona.usuario.id', () => {
      expect(filter.forFicha(ctx({ role: RoleCode.DOCENTE, userId: 'user-doc' }))).toEqual({
        cronograma: {
          evaluado: {
            persona: {
              usuario: {
                id: 'user-doc',
              },
            },
          },
        },
      });
    });
  });

  // ── forInstitucion ──────────────────────────────────────────────────

  describe('forInstitucion', () => {
    it('ALL: empty', () => {
      expect(filter.forInstitucion(ctx({ role: RoleCode.JEFE_GESTION }))).toEqual({});
    });

    it('JEFE_AREA Inicial: OR (EBE o EBR+Inicial)', () => {
      const f = filter.forInstitucion(
        ctx({ role: RoleCode.JEFE_AREA, especialistaNivel: 'Inicial' }),
      );
      expect(f).toHaveProperty('OR');
    });

    it('JEFE_AREA Primaria: EBR + Primaria', () => {
      expect(
        filter.forInstitucion(ctx({ role: RoleCode.JEFE_AREA, especialistaNivel: 'Primaria' })),
      ).toEqual({
        modalidad: 'EBR',
        nivelEducativo: { equals: 'Primaria', mode: 'insensitive' },
      });
    });

    it('JEFE_AREA Secundaria: OR (EBR+Secundaria, EBA, CEPTRO)', () => {
      const f = filter.forInstitucion(
        ctx({ role: RoleCode.JEFE_AREA, especialistaNivel: 'Secundaria' }),
      );
      expect(f).toHaveProperty('OR');
    });

    it('JEFE_AREA sin nivel: sentinela', () => {
      expect(
        filter.forInstitucion(ctx({ role: RoleCode.JEFE_AREA, especialistaNivel: null })),
      ).toEqual({ id: { in: [] } });
    });

    it('ESPECIALISTA Primaria sin especialidad: solo por nivel (como Jefe de Área)', () => {
      expect(
        filter.forInstitucion(
          ctx({
            role: RoleCode.ESPECIALISTA,
            especialistaNivel: 'Primaria',
            especialistaEspecialidades: null,
          }),
        ),
      ).toEqual({
        modalidad: 'EBR',
        nivelEducativo: { equals: 'Primaria', mode: 'insensitive' },
      });
    });

    it('ESPECIALISTA Primaria con especialidad: nivel AND docente de esa especialidad', () => {
      const f = filter.forInstitucion(
        ctx({
          role: RoleCode.ESPECIALISTA,
          especialistaNivel: 'Primaria',
          especialistaEspecialidades: ['Educación Física', 'PIP'],
        }),
      );
      expect(f).toEqual({
        AND: [
          { modalidad: 'EBR', nivelEducativo: { equals: 'Primaria', mode: 'insensitive' } },
          {
            docentes: {
              some: {
                estado: 'Activo',
                docenteEspecialidades: {
                  some: { especialidad: { nombre: { in: ['Educación Física', 'PIP'] } } },
                },
              },
            },
          },
        ],
      });
    });

    it('ESPECIALISTA sin nivel: sentinela', () => {
      expect(
        filter.forInstitucion(ctx({ role: RoleCode.ESPECIALISTA, especialistaNivel: null })),
      ).toEqual({ id: { in: [] } });
    });

    it('DIRECTOR_INSTITUCION: filter por id de su institucion', () => {
      expect(
        filter.forInstitucion(ctx({ role: RoleCode.DIRECTOR_INSTITUCION, institucionId: 'ie-1' })),
      ).toEqual({ id: 'ie-1' });
    });

    it('DIRECTOR_INSTITUCION sin institucionId: sentinela', () => {
      expect(
        filter.forInstitucion(ctx({ role: RoleCode.DIRECTOR_INSTITUCION, institucionId: null })),
      ).toEqual({ id: { in: [] } });
    });
  });

  // ── forDocente ──────────────────────────────────────────────────────

  describe('forDocente', () => {
    it('JEFE_AREA Primaria: docente de su nivel (en cualquier modalidad)', () => {
      const f = filter.forDocente(ctx({ role: RoleCode.JEFE_AREA, especialistaNivel: 'Primaria' }));
      expect(f).toHaveProperty('institucion');
    });

    it('DOCENTE: filter por institucionId', () => {
      expect(filter.forDocente(ctx({ role: RoleCode.DOCENTE, institucionId: 'ie-1' }))).toEqual({
        institucionId: 'ie-1',
      });
    });
  });

  // ── forReporte ──────────────────────────────────────────────────────

  describe('forReporte', () => {
    it('delega a forFicha (mismas reglas de scope)', () => {
      const ctxF = ctx({ role: RoleCode.ESPECIALISTA, userId: 'esp-1' });
      expect(filter.forReporte(ctxF)).toEqual(filter.forFicha(ctxF));
    });
  });
});
